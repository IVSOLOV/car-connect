import { useState, useEffect, useRef, forwardRef, ClipboardEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ImageIcon,
  Upload,
  X,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import SupportAttachmentImage from "@/components/SupportAttachmentImage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserTicketResponses } from "@/hooks/useUserTicketResponses";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/notifications";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  user_name?: string;
  user_email?: string;
  response_read_at: string | null;
}

interface AdminNote {
  id: string;
  ticket_id: string;
  notes: string | null;
  images: string[] | null;
}

interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  is_admin: boolean;
  message: string;
  images: string[];
  created_at: string;
}

// Helper component to parse and display ticket description with images
const TicketDescription = forwardRef<HTMLDivElement, { description: string; onImageClick?: (signedUrl: string) => void }>(
  ({ description, onImageClick }, ref) => {
    // Check if description has attached images section
    const attachedImagesMatch = description.match(/---\s*\nAttached Images:\s*([\s\S]*?)$/);
    
    if (!attachedImagesMatch) {
      return <p ref={ref as React.Ref<HTMLParagraphElement>} className="mt-1 text-foreground whitespace-pre-wrap">{description}</p>;
    }
    
    // Extract the main description (before the images section)
    const mainDescription = description.replace(/---\s*\nAttached Images:[\s\S]*$/, "").trim();
    
    // Extract image paths/URLs
    const imagesSection = attachedImagesMatch[1];
    const imagePaths = imagesSection
      .split("\n")
      .map(line => line.replace(/^\d+\.\s*/, "").trim())
      .filter(path => path.length > 0);
    
    return (
      <div ref={ref} className="mt-1 space-y-4">
        <p className="text-foreground whitespace-pre-wrap">{mainDescription}</p>
        
        {imagePaths.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>Attached Images ({imagePaths.length})</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {imagePaths.map((path, index) => (
                <TicketImageThumbnail
                  key={index}
                  path={path}
                  alt={`Attachment ${index + 1}`}
                  onImageClick={onImageClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

TicketDescription.displayName = "TicketDescription";

// Helper component for ticket image thumbnails with signed URL support
const TicketImageThumbnail = ({ 
  path, 
  alt, 
  onImageClick 
}: { 
  path: string; 
  alt: string; 
  onImageClick?: (signedUrl: string) => void;
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  
  const handleSignedUrlReady = useCallback((url: string) => {
    setSignedUrl(url);
  }, []);
  
  return (
    <button
      type="button"
      onClick={() => signedUrl && onImageClick?.(signedUrl)}
      className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/50 hover:border-primary/50 transition-colors cursor-pointer"
    >
      <SupportAttachmentImage
        path={path}
        alt={alt}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        onSignedUrlReady={handleSignedUrlReady}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">
          Click to view
        </span>
      </div>
    </button>
  );
};

const MAX_COMMENT_IMAGES = 3;

const SupportTickets = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { refetch: refetchResponseCount } = useUserTicketResponses();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [adminNotesFromDb, setAdminNotesFromDb] = useState<Record<string, string>>({});
  const [adminImages, setAdminImages] = useState<Record<string, string[]>>({});
  const [adminImagesFromDb, setAdminImagesFromDb] = useState<Record<string, string[]>>({});
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({});
  const [updatingTicket, setUpdatingTicket] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, TicketComment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [commentImages, setCommentImages] = useState<Record<string, string[]>>({});
  const [uploadingCommentImages, setUploadingCommentImages] = useState<Record<string, boolean>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const commentFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const isAdmin = role === "admin";

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchTickets();
  }, [user, navigate]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch admin notes (users can see notes for their own tickets)
      const { data: notesData } = await supabase
        .from("support_ticket_admin_notes")
        .select("*");

      // Initialize admin notes and images from separate table
      const notes: Record<string, string> = {};
      const images: Record<string, string[]> = {};
      notesData?.forEach((n: AdminNote) => {
        notes[n.ticket_id] = n.notes || "";
        images[n.ticket_id] = n.images || [];
      });
      setAdminNotes(notes);
      setAdminNotesFromDb(notes);
      setAdminImages(images);
      setAdminImagesFromDb(images);

      // Fetch comments
      const { data: commentsData } = await supabase
        .from("support_ticket_comments")
        .select("*")
        .order("created_at", { ascending: true });

      const commentsByTicket: Record<string, TicketComment[]> = {};
      commentsData?.forEach((c: TicketComment) => {
        if (!commentsByTicket[c.ticket_id]) {
          commentsByTicket[c.ticket_id] = [];
        }
        commentsByTicket[c.ticket_id].push(c);
      });
      setComments(commentsByTicket);

      if (data && isAdmin) {
        // Fetch user info for each ticket
        const userIds = [...new Set(data.map(t => t.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, first_name, last_name")
          .in("user_id", userIds);

        const ticketsWithUsers = data.map(ticket => {
          const profile = profiles?.find(p => p.user_id === ticket.user_id);
          return {
            ...ticket,
            user_name: profile?.full_name || `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || "Unknown",
          };
        });
        setTickets(ticketsWithUsers);
      } else if (data) {
        setTickets(data);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (ticketId: string, files: FileList, isComment: boolean = false) => {
    if (!files.length) return;
    
    const currentImages = isComment ? (commentImages[ticketId] || []) : (adminImages[ticketId] || []);
    const maxImages = isComment ? MAX_COMMENT_IMAGES : 5;
    
    if (currentImages.length >= maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }
    
    const setUploading = isComment ? setUploadingCommentImages : setUploadingImages;
    setUploading(prev => ({ ...prev, [ticketId]: true }));
    const uploadedUrls: string[] = [];
    
    try {
      const filesToProcess = Array.from(files).slice(0, maxImages - currentImages.length);
      
      for (const file of filesToProcess) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large. Max 5MB.`);
          continue;
        }
        
        const fileExt = file.name.split('.').pop() || 'png';
        const prefix = isComment ? 'comment' : 'admin';
        const fileName = `${prefix}-${ticketId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        // Storage policy requires user ID as first folder
        const filePath = `${user!.id}/${prefix}-responses/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('support-attachments')
          .upload(filePath, file);
        
        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }
        
        // Store the path, not the public URL (bucket is now private)
        uploadedUrls.push(filePath);
      }
      
      if (uploadedUrls.length > 0) {
        if (isComment) {
          setCommentImages(prev => ({
            ...prev,
            [ticketId]: [...(prev[ticketId] || []), ...uploadedUrls]
          }));
        } else {
          setAdminImages(prev => ({
            ...prev,
            [ticketId]: [...(prev[ticketId] || []), ...uploadedUrls]
          }));
        }
        toast.success(`${uploadedUrls.length} image(s) uploaded`);
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
    } finally {
      setUploading(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>, ticketId: string) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const currentImages = commentImages[ticketId] || [];
    if (currentImages.length >= MAX_COMMENT_IMAGES) {
      return;
    }

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          // For pasted images, create a new file with a proper name based on MIME type
          const ext = item.type.split('/')[1] || 'png';
          const newFile = new File([file], `pasted-image.${ext}`, { type: item.type });
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(newFile);
          await handleImageUpload(ticketId, dataTransfer.files, true);
        }
        break;
      }
    }
  };

  const removeImage = (ticketId: string, imageUrl: string, isComment: boolean = false) => {
    if (isComment) {
      setCommentImages(prev => ({
        ...prev,
        [ticketId]: (prev[ticketId] || []).filter(url => url !== imageUrl)
      }));
    } else {
      setAdminImages(prev => ({
        ...prev,
        [ticketId]: (prev[ticketId] || []).filter(url => url !== imageUrl)
      }));
    }
  };

  const submitComment = async (ticketId: string) => {
    const message = newComment[ticketId]?.trim();
    const images = commentImages[ticketId] || [];
    
    if (!message && images.length === 0) {
      toast.error("Please add a message or image");
      return;
    }

    setSubmittingComment(prev => ({ ...prev, [ticketId]: true }));
    
    try {
      const { error } = await supabase
        .from("support_ticket_comments")
        .insert({
          ticket_id: ticketId,
          user_id: user!.id,
          is_admin: isAdmin,
          message: message || "",
          images: images,
        });

      if (error) throw error;

      // Reset response_read_at if admin is commenting (so user gets notified)
      if (isAdmin) {
        await supabase
          .from("support_tickets")
          .update({ response_read_at: null })
          .eq("id", ticketId);

        // Send notification email to ticket owner
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
          sendNotificationEmail("ticket_response", ticket.user_id, {
            ticketSubject: ticket.subject,
            adminNotes: message || "Admin added images to your ticket.",
          }).catch(err => console.error("Failed to send email notification:", err));
        }
      }

      // Clear form
      setNewComment(prev => ({ ...prev, [ticketId]: "" }));
      setCommentImages(prev => ({ ...prev, [ticketId]: [] }));
      
      toast.success("Comment added");
      fetchTickets();
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    setUpdatingTicket(ticketId);
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      } else {
        updateData.resolved_at = null;
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) throw error;

      toast.success("Status updated");
      fetchTickets();
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdatingTicket(null);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center pt-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO 
        title={isAdmin ? "Support Tickets | Admin" : "My Support Tickets"}
        description="View and manage support tickets" 
      />
      <Header />

      <main className="container mx-auto px-4 pt-36 sm:pt-24 pb-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isAdmin ? "Support Tickets" : "My Support Tickets"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin 
                ? `${tickets.filter(t => t.status === "open").length} open tickets`
                : "View the status of your reported issues"
              }
            </p>
          </div>
        </div>

        {tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-3">
                {isAdmin ? "No support tickets yet" : "You haven't submitted any tickets yet"}
              </p>
              {!isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate("/write-to-support")}>
                  Write to Support
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Collapsible
                key={ticket.id}
                open={expandedTicket === ticket.id}
                onOpenChange={async (open) => {
                  setExpandedTicket(open ? ticket.id : null);
                  // Mark as read when user expands a ticket with new responses
                  const ticketComments = comments[ticket.id] || [];
                  const hasAdminComments = ticketComments.some(c => c.is_admin);
                  if (open && !isAdmin && hasAdminComments && !ticket.response_read_at) {
                    const { error } = await supabase
                      .from("support_tickets")
                      .update({ response_read_at: new Date().toISOString() })
                      .eq("id", ticket.id);
                    
                    if (!error) {
                      // Update local state
                      setTickets(prev => prev.map(t => 
                        t.id === ticket.id ? { ...t, response_read_at: new Date().toISOString() } : t
                      ));
                      // Refresh the notification count in header
                      refetchResponseCount();
                    }
                  }
                }}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1 min-w-0">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span className="truncate">{ticket.subject}</span>
                            <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${expandedTicket === ticket.id ? "rotate-180" : ""}`} />
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {isAdmin && <span className="font-medium">{ticket.user_name}</span>}
                            <span>•</span>
                            <span>{format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getPriorityBadge(ticket.priority)}
                          {isAdmin ? (
                            <Select
                              value={ticket.status}
                              onValueChange={(value) => {
                                // Prevent collapsible from toggling
                                updateTicketStatus(ticket.id, value);
                              }}
                              disabled={updatingTicket === ticket.id}
                            >
                              <SelectTrigger 
                                className="w-[130px] h-8 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent onClick={(e) => e.stopPropagation()}>
                                <SelectItem value="open">
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="h-3 w-3 text-blue-500" />
                                    Open
                                  </span>
                                </SelectItem>
                                <SelectItem value="in_progress">
                                  <span className="flex items-center gap-1.5">
                                    <AlertCircle className="h-3 w-3 text-yellow-500" />
                                    In Progress
                                  </span>
                                </SelectItem>
                                <SelectItem value="resolved">
                                  <span className="flex items-center gap-1.5">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    Resolved
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            // Non-admin users see the badge
                            ticket.status === "open" ? (
                              <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                                <Clock className="h-3 w-3 mr-1" />Open
                              </Badge>
                            ) : ticket.status === "in_progress" ? (
                              <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                                <AlertCircle className="h-3 w-3 mr-1" />In Progress
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                                <CheckCircle className="h-3 w-3 mr-1" />Resolved
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div>
                        <Label className="text-muted-foreground">Description</Label>
                        <TicketDescription description={ticket.description} onImageClick={setSelectedImage} />
                      </div>

                      {/* Legacy admin notes display (for backward compatibility) */}
                      {(adminNotes[ticket.id] || (adminImages[ticket.id] && adminImages[ticket.id].length > 0)) && !isAdmin && (
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                          <Label className="text-primary">Admin Response</Label>
                          {adminNotes[ticket.id] && (
                            <p className="text-foreground whitespace-pre-wrap">{adminNotes[ticket.id]}</p>
                          )}
                          {adminImages[ticket.id] && adminImages[ticket.id].length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ImageIcon className="h-4 w-4" />
                                <span>Attached Images ({adminImages[ticket.id].length})</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {adminImages[ticket.id].map((path, index) => (
                                  <TicketImageThumbnail
                                    key={index}
                                    path={path}
                                    alt={`Admin attachment ${index + 1}`}
                                    onImageClick={setSelectedImage}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Comments section */}
                      {comments[ticket.id] && comments[ticket.id].length > 0 && (
                        <div className="space-y-3 pt-4 border-t">
                          <Label className="text-muted-foreground">Comments</Label>
                          {comments[ticket.id].map((comment) => (
                            <div 
                              key={comment.id} 
                              className={`p-3 rounded-lg space-y-2 ${
                                comment.is_admin 
                                  ? "bg-primary/5 border border-primary/20" 
                                  : "bg-muted/50 border border-border"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-medium ${comment.is_admin ? "text-primary" : "text-muted-foreground"}`}>
                                  {comment.is_admin ? "Admin" : "You"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                              </div>
                              {comment.message && (
                                <p className="text-sm text-foreground whitespace-pre-wrap">{comment.message}</p>
                              )}
                              {comment.images && comment.images.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                  {comment.images.map((path, index) => (
                                    <TicketImageThumbnail
                                      key={index}
                                      path={path}
                                      alt={`Attachment ${index + 1}`}
                                      onImageClick={setSelectedImage}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add comment section - for both users and admins */}
                      <div className="space-y-3 pt-4 border-t">
                        <Label>Add Comment</Label>
                        <Textarea
                          ref={(el) => { textareaRefs.current[ticket.id] = el; }}
                          placeholder="Type your message... (paste images with Ctrl+V)"
                          value={newComment[ticket.id] || ""}
                          onChange={(e) => setNewComment(prev => ({
                            ...prev,
                            [ticket.id]: e.target.value
                          }))}
                          onPaste={(e) => handlePaste(e, ticket.id)}
                          rows={2}
                          className="resize-none"
                        />
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            ref={(el) => { commentFileInputRefs.current[ticket.id] = el; }}
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              if (e.target.files) {
                                handleImageUpload(ticket.id, e.target.files, true);
                                e.target.value = '';
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => commentFileInputRefs.current[ticket.id]?.click()}
                            disabled={uploadingCommentImages[ticket.id] || (commentImages[ticket.id]?.length || 0) >= MAX_COMMENT_IMAGES}
                          >
                            {uploadingCommentImages[ticket.id] ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                              </>
                            )}
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {commentImages[ticket.id]?.length || 0}/{MAX_COMMENT_IMAGES} images (max 5MB each)
                          </span>
                          <div className="flex-1" />
                          <Button
                            size="sm"
                            onClick={() => submitComment(ticket.id)}
                            disabled={submittingComment[ticket.id] || (!newComment[ticket.id]?.trim() && !commentImages[ticket.id]?.length)}
                          >
                            {submittingComment[ticket.id] ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Send
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Show pending images */}
                        {commentImages[ticket.id] && commentImages[ticket.id].length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {commentImages[ticket.id].map((path, index) => (
                              <div key={index} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                                <SupportAttachmentImage
                                  path={path}
                                  alt={`Pending ${index + 1}`}
                                  className="w-full h-full object-cover cursor-pointer"
                                  onSignedUrlReady={(signedUrl) => {
                                    // Store for lightbox click
                                  }}
                                  onClick={() => {}}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(ticket.id, path, true)}
                                  className="absolute top-0.5 right-0.5 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {ticket.resolved_at && (
                        <p className="text-sm text-muted-foreground">
                          Resolved on {format(new Date(ticket.resolved_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </main>

      {/* Image Lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-background/95 backdrop-blur">
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Full size"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default SupportTickets;
