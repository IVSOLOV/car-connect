import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, AlertCircle, CheckCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SEO from "@/components/SEO";

const WriteToSupport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please login to contact support");
      navigate("/auth");
      return;
    }

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: title.trim(),
        description: description.trim(),
        priority: "medium",
      });

      if (error) throw error;

      setSubmitted(true);
      setTitle("");
      setDescription("");
    } catch (error) {
      console.error("Error submitting support request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">Please login to contact support</p>
              <Button onClick={() => navigate("/auth")}>Sign In</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <SEO title="Request Submitted - DiRent Support" description="Your support request has been submitted" />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Thank You for Reporting!</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Please allow us 12-24 hours to work on your request. We'll notify you as soon as we have an update.
                </p>
                <div className="flex flex-wrap gap-3 justify-center pt-4">
                  <Button variant="outline" onClick={() => setSubmitted(false)}>
                    Submit Another Request
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/support-tickets")}>
                    <History className="h-4 w-4 mr-2" />
                    View My Issues
                  </Button>
                  <Button onClick={() => navigate("/")}>
                    Back to Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <SEO title="Write to Support - DiRent" description="Contact our support team for help" />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">Write to Support</h1>
              <p className="text-muted-foreground mt-2">
                We're here to help! Describe your issue and we'll get back to you as soon as possible.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/support-tickets")}>
              <History className="h-4 w-4 mr-2" />
              View My Issues
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>How to describe your issue effectively</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Be specific about what you were trying to do</li>
                <li>Describe what happened vs. what you expected</li>
                <li>Include any error messages you saw</li>
                <li>Mention which page or feature was involved</li>
                <li>If possible, describe steps to reproduce the issue</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Submit Your Request</CardTitle>
              <CardDescription>
                Fill out the form below and our team will respond within 12-24 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title of Issue</Label>
                  <Input
                    id="title"
                    placeholder="Brief summary of your issue (e.g., 'Cannot upload images')"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {title.length}/100
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Describe Your Issue</Label>
                  <Textarea
                    id="description"
                    placeholder="Please provide as much detail as possible about the issue you're experiencing..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {description.length}/2000
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Sending..." : "Send to Support"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WriteToSupport;
