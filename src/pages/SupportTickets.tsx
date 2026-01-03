import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
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
  admin_notes: string | null;
  user_name?: string;
  user_email?: string;
  response_read_at: string | null;
}

const SupportTickets = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [updatingTicket, setUpdatingTicket] = useState<string | null>(null);

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
        
        // Initialize admin notes
        const notes: Record<string, string> = {};
        ticketsWithUsers.forEach(t => {
          notes[t.id] = t.admin_notes || "";
        });
        setAdminNotes(notes);
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

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    setUpdatingTicket(ticketId);
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      const currentNotes = adminNotes[ticketId] || null;
      
      const updateData: any = { 
        status: newStatus,
        admin_notes: currentNotes,
        response_read_at: null, // Reset so user gets notified of new response
      };
      
      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) throw error;

      // Send email notification to ticket owner if there's admin notes
      if (ticket && currentNotes) {
        sendNotificationEmail("ticket_response", ticket.user_id, {
          ticketSubject: ticket.subject,
          adminNotes: currentNotes,
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
                  if (open && !isAdmin && ticket.admin_notes && !ticket.response_read_at) {
                    await supabase
                      .from("support_tickets")
                      .update({ response_read_at: new Date().toISOString() })
                      .eq("id", ticket.id);
                    // Update local state
                    setTickets(prev => prev.map(t => 
                      t.id === ticket.id ? { ...t, response_read_at: new Date().toISOString() } : t
                    ));
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
                        <p className="mt-1 text-foreground whitespace-pre-wrap">{ticket.description}</p>
                      </div>

                      {ticket.admin_notes && !isAdmin && (
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                          <Label className="text-primary">Admin Response</Label>
                          <p className="mt-1 text-foreground whitespace-pre-wrap">{ticket.admin_notes}</p>
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
                              {updatingTicket === ticket.id ? "Saving..." : "Save Notes"}
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
