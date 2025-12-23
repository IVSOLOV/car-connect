import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Car, User, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { format } from "date-fns";

interface Message {
  id: string;
  listing_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

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

      // Group messages by listing + other user
      const conversationMap = new Map<string, Message[]>();
      
      messagesData.forEach((msg) => {
        const otherUserId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        const key = `${msg.listing_id}-${otherUserId}`;
        
        if (!conversationMap.has(key)) {
          conversationMap.set(key, []);
        }
        conversationMap.get(key)!.push(msg);
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
      
      conversationMap.forEach((messages, key) => {
        const [listingId, otherUserId] = key.split("-");
        const lastMsg = messages[0];
        
        const listing = listingsData?.find(l => l.id === listingId);
        const profile = profilesData?.find(p => p.user_id === otherUserId);

        const getUserName = () => {
          if (profile?.company_name) return profile.company_name;
          if (profile?.first_name || profile?.last_name) {
            return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
          }
          return "Unknown User";
        };

        convList.push({
          listing_id: listingId,
          listing_title: listing ? `${listing.year} ${listing.make} ${listing.model}` : "Unknown Listing",
          listing_image: listing?.images?.[0] || null,
          other_user_id: otherUserId,
          other_user_name: getUserName(),
          other_user_avatar: profile?.avatar_url || null,
          last_message: lastMsg.message,
          last_message_time: lastMsg.created_at,
          unread_count: 0,
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

      setSelectedConversation({
        listing_id: conv.listing_id,
        other_user_id: conv.other_user_id,
        messages: data || [],
      });
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

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;
    setSendingMessage(true);

    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          listing_id: selectedConversation.listing_id,
          sender_id: user.id,
          recipient_id: selectedConversation.other_user_id,
          message: newMessage.trim(),
        });

      if (error) throw error;

      // Add message to local state
      const newMsg: Message = {
        id: crypto.randomUUID(),
        listing_id: selectedConversation.listing_id,
        sender_id: user.id,
        recipient_id: selectedConversation.other_user_id,
        message: newMessage.trim(),
        created_at: new Date().toISOString(),
      };

      setSelectedConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, newMsg],
      } : null);

      setNewMessage("");
      
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
    }
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
                    <div className="flex items-center gap-3">
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
                        <p className="font-semibold">{convInfo?.other_user_name}</p>
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
                              <p className="text-sm">{msg.message}</p>
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
                  
                  <div className="border-t p-4">
                    <div className="flex gap-2">
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
                        disabled={sendingMessage || !newMessage.trim()}
                      >
                        {sendingMessage ? "..." : "Send"}
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
                              <p className="font-semibold text-foreground truncate">
                                {conv.other_user_name}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(conv.last_message_time), "MMM d")}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Car className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{conv.listing_title}</span>
                            </p>
                            <p className="text-sm text-muted-foreground truncate mt-1">
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
    </div>
  );
};

export default Messages;
