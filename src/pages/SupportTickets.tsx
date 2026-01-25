import { useState, useEffect, useRef, forwardRef } from "react";
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
import Header from "@/components/Header";
import SEO from "@/components/SEO";
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

// Helper component to parse and display ticket description with images
const TicketDescription = forwardRef<HTMLDivElement, { description: string }>(
  ({ description }, ref) => {
    // Check if description has attached images section
    const attachedImagesMatch = description.match(/---\s*\nAttached Images:\s*([\s\S]*?)$/);
    
    if (!attachedImagesMatch) {
      return <p ref={ref as React.Ref<HTMLParagraphElement>} className="mt-1 text-foreground whitespace-pre-wrap">{description}</p>;
    }
    
    // Extract the main description (before the images section)
    const mainDescription = description.replace(/---\s*\nAttached Images:[\s\S]*$/, "").trim();
    
    // Extract image URLs
    const imagesSection = attachedImagesMatch[1];
    const imageUrls = imagesSection
      .split("\n")
      .map(line => line.replace(/^\d+\.\s*/, "").trim())
      .filter(url => url.startsWith("http"));
    
    return (
      <div ref={ref} className="mt-1 space-y-4">
        <p className="text-foreground whitespace-pre-wrap">{mainDescription}</p>
        
        {imageUrls.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>Attached Images ({imageUrls.length})</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {imageUrls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/50 hover:border-primary/50 transition-colors"
                >
                  <img
                    src={url}
                    alt={`Attachment ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">
                      Click to view
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

TicketDescription.displayName = "TicketDescription";

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
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const handleImageUpload = async (ticketId: string, files: FileList) => {
    if (!files.length) return;
    
    setUploadingImages(prev => ({ ...prev, [ticketId]: true }));
    const uploadedUrls: string[] = [];
    
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large. Max 5MB.`);
          continue;
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `admin-${ticketId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `admin-responses/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('support-attachments')
          .upload(filePath, file);
        
        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }
        
        const { data: urlData } = supabase.storage
          .from('support-attachments')
          .getPublicUrl(filePath);
        
        uploadedUrls.push(urlData.publicUrl);
      }
      
      if (uploadedUrls.length > 0) {
        setAdminImages(prev => ({
          ...prev,
          [ticketId]: [...(prev[ticketId] || []), ...uploadedUrls]
        }));
        toast.success(`${uploadedUrls.length} image(s) uploaded`);
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
    } finally {
      setUploadingImages(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const removeAdminImage = (ticketId: string, imageUrl: string) => {
    setAdminImages(prev => ({
      ...prev,
      [ticketId]: (prev[ticketId] || []).filter(url => url !== imageUrl)
    }));
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    setUpdatingTicket(ticketId);
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      const currentNotes = adminNotes[ticketId] || null;
      const previousNotes = adminNotesFromDb[ticketId] || null;
      const currentImages = adminImages[ticketId] || [];
      const previousImages = adminImagesFromDb[ticketId] || [];
      const notesChanged = currentNotes !== previousNotes;
      const imagesChanged = JSON.stringify(currentImages) !== JSON.stringify(previousImages);
      const hasChanges = notesChanged || imagesChanged;
      
      // Update ticket status
      const updateData: any = { 
        status: newStatus,
        response_read_at: hasChanges ? null : undefined, // Reset so user gets notified of new response
      };
      
      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) throw error;

      // Update or insert admin notes and images in separate table
      if (currentNotes || currentImages.length > 0) {
        const { error: notesError } = await supabase
          .from("support_ticket_admin_notes")
          .upsert({
            ticket_id: ticketId,
            notes: currentNotes,
            images: currentImages,
          }, { onConflict: "ticket_id" });
        
        if (notesError) throw notesError;
      }

      // Send email notification to ticket owner if there's new admin notes or images
      if (ticket && hasChanges) {
        sendNotificationEmail("ticket_response", ticket.user_id, {
          ticketSubject: ticket.subject,
          adminNotes: currentNotes || "Admin attached images to your ticket.",
        }).catch(err => console.error("Failed to send email notification:", err));
      }

      toast.success("Ticket updated successfully");
      fetchTickets();
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Failed to update ticket");
    } finally {
      setUpdatingTicket(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><AlertCircle className="h-3 w-3 mr-1" />In Progress</Badge>;
      case "resolved":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
    <div className="min-h-screen bg-background">
      <SEO 
        title={isAdmin ? "Support Tickets | Admin" : "My Support Tickets"} 
        description="View and manage support tickets" 
      />
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
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
              <p className="text-muted-foreground">
                {isAdmin ? "No support tickets yet" : "You haven't submitted any tickets yet"}
              </p>
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
                  // Mark as read when user expands a ticket with admin notes
                  const hasAdminNotes = adminNotes[ticket.id];
                  if (open && !isAdmin && hasAdminNotes && !ticket.response_read_at) {
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
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {ticket.subject}
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedTicket === ticket.id ? "rotate-180" : ""}`} />
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {isAdmin && <span className="font-medium">{ticket.user_name}</span>}
                            <span>•</span>
                            <span>{format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(ticket.priority)}
                          {getStatusBadge(ticket.status)}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div>
                        <Label className="text-muted-foreground">Description</Label>
                        <TicketDescription description={ticket.description} />
                      </div>

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
                                {adminImages[ticket.id].map((url, index) => (
                                  <a
                                    key={index}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/50 hover:border-primary/50 transition-colors"
                                  >
                                    <img
                                      src={url}
                                      alt={`Admin attachment ${index + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                      <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">
                                        Click to view
                                      </span>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {isAdmin && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="space-y-2">
                            <Label>Admin Notes</Label>
                            <Textarea
                              placeholder="Add notes or response..."
                              value={adminNotes[ticket.id] || ""}
                              onChange={(e) => setAdminNotes(prev => ({
                                ...prev,
                                [ticket.id]: e.target.value
                              }))}
                              rows={3}
                            />
                          </div>

                          {/* Admin Image Upload */}
                          <div className="space-y-2">
                            <Label>Attach Images</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                ref={(el) => { fileInputRefs.current[ticket.id] = el; }}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                  if (e.target.files) {
                                    handleImageUpload(ticket.id, e.target.files);
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRefs.current[ticket.id]?.click()}
                                disabled={uploadingImages[ticket.id]}
                              >
                                {uploadingImages[ticket.id] ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Images
                                  </>
                                )}
                              </Button>
                              <span className="text-xs text-muted-foreground">Max 5MB per image</span>
                            </div>

                            {/* Show uploaded images */}
                            {adminImages[ticket.id] && adminImages[ticket.id].length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                {adminImages[ticket.id].map((url, index) => (
                                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                                    <img
                                      src={url}
                                      alt={`Attachment ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeAdminImage(ticket.id, url)}
                                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <Label>Update Status</Label>
                              <Select
                                value={ticket.status}
                                onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                                disabled={updatingTicket === ticket.id}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={() => updateTicketStatus(ticket.id, ticket.status)}
                              disabled={updatingTicket === ticket.id}
                              className="mt-6"
                            >
                              {updatingTicket === ticket.id ? "Saving..." : "Save Response"}
                            </Button>
                          </div>
                        </div>
                      )}

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
    </div>
  );
};

export default SupportTickets;
