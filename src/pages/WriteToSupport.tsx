import { useState, useRef } from "react";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, AlertCircle, CheckCircle, History, ImagePlus, X, Copy, Mail } from "lucide-react";
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
import { sendNotificationEmail } from "@/lib/notifications";

const MAX_IMAGES = 5;

const WriteToSupport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = MAX_IMAGES - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    const filesToAdd = Array.from(files).slice(0, remainingSlots);
    const validFiles = filesToAdd.filter(file => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });

    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages(prev => [...prev, ...newImages]);
    
    if (e.target) e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];
    
    setUploadingImages(true);
    const uploadedPaths: string[] = [];

    try {
      for (const { file } of images) {
        const fileExt = file.name.split(".").pop();
        // Store the file path (not public URL) for signed URL access
        const filePath = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("support-attachments")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Store the path, not the public URL (bucket is now private)
        uploadedPaths.push(filePath);
      }
      return uploadedPaths;
    } catch (error) {
      console.error("Error uploading images:", error);
      throw error;
    } finally {
      setUploadingImages(false);
    }
  };

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
      // Upload images first
      const imageUrls = await uploadImages();
      
      // Include image URLs in description if any
      const descriptionWithImages = imageUrls.length > 0
        ? `${description.trim()}\n\n---\nAttached Images:\n${imageUrls.map((url, i) => `${i + 1}. ${url}`).join("\n")}`
        : description.trim();

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: title.trim(),
        description: descriptionWithImages,
        priority: "medium",
      });

      if (error) throw error;

      // Clean up previews
      images.forEach(img => URL.revokeObjectURL(img.preview));

      // Get user's name for admin notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, full_name")
        .eq("user_id", user.id)
        .single();
      
      const submitterName = profile?.first_name || profile?.full_name || "A user";
      
      // Notify admins about new support ticket
      sendNotificationEmail("admin_new_ticket", null, {
        ticketSubject: title.trim(),
        ticketDescription: description.trim(),
        submitterName,
      }).catch(err => console.error("Failed to send admin notification:", err));

      setSubmitted(true);
      setTitle("");
      setDescription("");
      setImages([]);
    } catch (error) {
      console.error("Error submitting support request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-24 sm:pt-32">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">Please login to contact support</p>
              <Button onClick={() => navigate("/auth")} className="mb-6">Sign In</Button>
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-2">Or email us directly:</p>
                <div className="flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">dirrenthelp@yahoo.com</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      navigator.clipboard.writeText("dirrenthelp@yahoo.com");
                      toast.success("Email copied to clipboard");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pt-24 sm:pt-32">
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
    <div className="min-h-screen bg-background pt-24 sm:pt-32">
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

                {/* Image Upload Section */}
                <div className="space-y-2">
                  <Label>Attach Screenshots (Optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Upload up to {MAX_IMAGES} images to help us understand your issue better
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  
                  <div className="flex flex-wrap gap-3">
                    {images.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    
                    {images.length < MAX_IMAGES && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-accent transition-colors"
                      >
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{images.length}/{MAX_IMAGES}</span>
                      </button>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting || uploadingImages}>
                  <Send className="h-4 w-4 mr-2" />
                  {uploadingImages ? "Uploading images..." : submitting ? "Sending..." : "Send to Support"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default WriteToSupport;
