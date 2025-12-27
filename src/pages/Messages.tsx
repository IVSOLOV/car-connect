import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Car, User, ChevronRight, ArrowLeft, Paperclip, Image, FileText, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import AttachmentRenderer from "@/components/AttachmentRenderer";
import ReviewDialog from "@/components/ReviewDialog";
import { format } from "date-fns";

interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface Message {
  id: string;
  listing_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  read_at?: string | null;
  attachments?: Attachment[];
}

interface Conversation {
  listing_id: string;
  listing_title: string;
  listing_image: string | null;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface ConversationDetail {
  listing_id: string;
  other_user_id: string;
  messages: Message[];
}

const Messages = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { refetch: refetchUnreadCount } = useUnreadMessages();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      // Fetch all messages where user is sender or recipient
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) {
        setConversations([]);
        setLoadingConversations(false);
        return;
      }

      // Group messages by listing + other user (use ::: as separator since UUIDs contain dashes)
      const conversationMap = new Map<string, { messages: Message[]; otherUserId: string; listingId: string }>();
      
      messagesData.forEach((msg) => {
        const otherUserId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        const key = `${msg.listing_id}:::${otherUserId}`;
        
        if (!conversationMap.has(key)) {
          conversationMap.set(key, { messages: [], otherUserId, listingId: msg.listing_id });
        }
        conversationMap.get(key)!.messages.push({
          ...msg,
          attachments: (msg.attachments as unknown as Attachment[]) || [],
          read_at: msg.read_at,
          recipient_id: msg.recipient_id,
        });
      });

      // Get unique listing IDs and user IDs
      const listingIds = [...new Set(messagesData.map(m => m.listing_id))];
      const userIds = [...new Set(messagesData.flatMap(m => [m.sender_id, m.recipient_id]).filter(id => id !== user.id))];

      // Fetch listing details
      const { data: listingsData } = await supabase
        .from("listings")
        .select("id, year, make, model, images")
        .in("id", listingIds);

      // Fetch user profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, company_name, avatar_url")
        .in("user_id", userIds);

      // Build conversation list
      const convList: Conversation[] = [];
      
      conversationMap.forEach((convData) => {
        const { messages, otherUserId, listingId } = convData;
        const lastMsg = messages[0];
        
        const listing = listingsData?.find(l => l.id === listingId);
        const profile = profilesData?.find(p => p.user_id === otherUserId);

        const getUserName = () => {
          if (profile?.first_name || profile?.last_name) {
            return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
          }
          if (profile?.company_name) return profile.company_name;
          return "Unknown User";
        };

        // Calculate unread count for this conversation (messages where current user is recipient and read_at is null)
        const unreadCount = messages.filter(
          (msg) => msg.recipient_id === user.id && !msg.read_at
        ).length;

        convList.push({
          listing_id: listingId,
          listing_title: listing ? `${listing.year} ${listing.make} ${listing.model}` : "Unknown Listing",
          listing_image: listing?.images?.[0] || null,
          other_user_id: otherUserId,
          other_user_name: getUserName(),
          other_user_avatar: profile?.avatar_url || null,
          last_message: lastMsg.message,
          last_message_time: lastMsg.created_at,
          unread_count: unreadCount,
        });
      });

      // Sort by last message time
      convList.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

      setConversations(convList);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations.",
        variant: "destructive",
      });
    } finally {
      setLoadingConversations(false);
    }
  };

  const openConversation = async (conv: Conversation) => {
    if (!user) return;
    setLoadingMessages(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("listing_id", conv.listing_id)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${conv.other_user_id}),and(sender_id.eq.${conv.other_user_id},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Mark unread messages as read
      const unreadMessageIds = (data || [])
        .filter(msg => msg.recipient_id === user.id && !msg.read_at)
        .map(msg => msg.id);

      if (unreadMessageIds.length > 0) {
        const { error: updateError } = await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadMessageIds);
        
        if (!updateError) {
          // Refresh unread count in header after successful update
          await refetchUnreadCount();
        }
      }

      setSelectedConversation({
        listing_id: conv.listing_id,
        other_user_id: conv.other_user_id,
        messages: (data || []).map(msg => ({
          ...msg,
          attachments: (msg.attachments as unknown as Attachment[]) || [],
        })),
      });

      // Check if user already reviewed this person for this listing
      const { data: existingReview } = await supabase
        .from("user_reviews")
        .select("id")
        .eq("reviewer_id", user.id)
        .eq("reviewed_id", conv.other_user_id)
        .eq("listing_id", conv.listing_id)
        .maybeSingle();
      
      setHasExistingReview(!!existingReview);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages.",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + pendingFiles.length > 5) {
      toast({
        title: "Too many files",
        description: "You can only attach up to 5 files per message.",
        variant: "destructive",
      });
      return;
    }
    setPendingFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<Attachment[]> => {
    if (!user || pendingFiles.length === 0) return [];
    
    const attachments: Attachment[] = [];
    
    for (const file of pendingFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        continue;
      }

      // Store the file path (not URL) for later signed URL generation
      attachments.push({
        url: filePath, // Store path, we'll generate signed URLs when displaying
        name: file.name,
        type: file.type,
        size: file.size,
      });
    }

    return attachments;
  };

  // Helper to get signed URL for an attachment
  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    // Check if it's already a full URL (legacy data)
    if (filePath.startsWith('http')) {
      // Extract path from old public URL format
      const match = filePath.match(/message-attachments\/(.+)$/);
      if (match) {
        const { data, error } = await supabase.storage
          .from('message-attachments')
          .createSignedUrl(match[1], 3600); // 1 hour expiry
        return error ? null : data.signedUrl;
      }
      return filePath;
    }
    
    const { data, error } = await supabase.storage
      .from('message-attachments')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    return error ? null : data.signedUrl;
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || (!newMessage.trim() && pendingFiles.length === 0)) return;
    setSendingMessage(true);
    setUploadingFiles(pendingFiles.length > 0);

    try {
      // Upload files first
      const attachments = await uploadFiles();

      const { error } = await supabase
        .from("messages")
        .insert([{
          listing_id: selectedConversation.listing_id,
          sender_id: user.id,
          recipient_id: selectedConversation.other_user_id,
          message: newMessage.trim() || (attachments.length > 0 ? "Sent attachment(s)" : ""),
          attachments: JSON.parse(JSON.stringify(attachments)),
        }]);

      if (error) throw error;

      // Add message to local state
      const newMsg: Message = {
        id: crypto.randomUUID(),
        listing_id: selectedConversation.listing_id,
        sender_id: user.id,
        recipient_id: selectedConversation.other_user_id,
        message: newMessage.trim() || (attachments.length > 0 ? "Sent attachment(s)" : ""),
        created_at: new Date().toISOString(),
        attachments: attachments,
      };

      setSelectedConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, newMsg],
      } : null);

      setNewMessage("");
      setPendingFiles([]);
      
      // Refresh conversations list
      fetchConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
      setUploadingFiles(false);
    }
  };

  const isImageFile = (type: string) => type.startsWith('image/');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getSelectedConversationInfo = () => {
    if (!selectedConversation) return null;
    return conversations.find(
      c => c.listing_id === selectedConversation.listing_id && 
           c.other_user_id === selectedConversation.other_user_id
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const convInfo = getSelectedConversationInfo();

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Messages | Car Rental"
        description="View and respond to messages about your car listings"
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto">
          <Card className="h-[calc(100vh-8rem)]">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                {selectedConversation ? (
                  <>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedConversation(null)}
                      className="mr-2"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => convInfo && navigate(`/owner/${convInfo.other_user_id}`)}
                    >
                      {convInfo?.other_user_avatar ? (
                        <img 
                          src={convInfo.other_user_avatar} 
                          alt={convInfo.other_user_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold hover:text-primary transition-colors">{convInfo?.other_user_name}</p>
                        <p className="text-sm text-muted-foreground">{convInfo?.listing_title}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-5 w-5" />
                    Messages
                  </>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-0 h-[calc(100%-5rem)]">
              {selectedConversation ? (
                <div className="flex flex-col h-full">
                  <ScrollArea className="flex-1 p-4">
                    {loadingMessages ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedConversation.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                msg.sender_id === user?.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {msg.message && msg.message !== "Sent attachment(s)" && (
                                <p className="text-sm">{msg.message}</p>
                              )}
                              
                              {/* Attachments */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {msg.attachments.map((attachment, idx) => (
                                    <AttachmentRenderer 
                                      key={idx}
                                      attachment={attachment}
                                      isSender={msg.sender_id === user?.id}
                                    />
                                  ))}
                                </div>
                              )}
                              
                              <p className={`text-xs mt-1 ${
                                msg.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}>
                                {format(new Date(msg.created_at), "MMM d, h:mm a")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Review Prompt - Show after 5+ messages */}
                  {selectedConversation.messages.length >= 5 && !hasExistingReview && convInfo && (
                    <div className="border-t border-b bg-accent/30 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <span className="text-sm">How was your experience with {convInfo.other_user_name}?</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowReviewDialog(true)}
                      >
                        Rate User
                      </Button>
                    </div>
                  )}
                  
                  <div className="border-t p-4">
                    {/* Pending files preview */}
                    {pendingFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {pendingFiles.map((file, idx) => (
                          <div 
                            key={idx}
                            className="relative flex items-center gap-2 bg-muted rounded-md px-3 py-2"
                          >
                            {file.type.startsWith('image/') ? (
                              <Image className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            <span className="text-sm truncate max-w-[100px]">{file.name}</span>
                            <button 
                              onClick={() => removePendingFile(idx)}
                              className="hover:bg-background rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sendingMessage}
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={sendingMessage || (!newMessage.trim() && pendingFiles.length === 0)}
                      >
                        {uploadingFiles ? "Uploading..." : sendingMessage ? "..." : "Send"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  {loadingConversations ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No messages yet</p>
                      <p className="text-sm mt-2">
                        When guests contact you about your listings, their messages will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {conversations.map((conv) => (
                        <button
                          key={`${conv.listing_id}-${conv.other_user_id}`}
                          onClick={() => openConversation(conv)}
                          className="w-full p-4 flex items-center gap-4 hover:bg-accent/50 transition-colors text-left"
                        >
                          <div className="relative">
                            {conv.other_user_avatar ? (
                              <img 
                                src={conv.other_user_avatar} 
                                alt={conv.other_user_name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-6 w-6 text-primary" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-foreground truncate ${conv.unread_count > 0 ? "font-bold" : "font-semibold"}`}>
                                {conv.other_user_name}
                              </p>
                              <span className={`text-xs ${conv.unread_count > 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                                {format(new Date(conv.last_message_time), "MMM d")}
                              </span>
                            </div>
                            <p className={`text-sm flex items-center gap-1 ${conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                              <Car className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{conv.listing_title}</span>
                            </p>
                            <p className={`text-sm truncate mt-1 ${conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                              {conv.last_message}
                            </p>
                          </div>
                          
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Review Dialog */}
      {selectedConversation && convInfo && user && (
        <ReviewDialog
          open={showReviewDialog}
          onOpenChange={setShowReviewDialog}
          reviewedUserId={selectedConversation.other_user_id}
          reviewedUserName={convInfo.other_user_name}
          listingId={selectedConversation.listing_id}
          reviewerId={user.id}
          onReviewSubmitted={() => setHasExistingReview(true)}
        />
      )}
    </div>
  );
};

export default Messages;
