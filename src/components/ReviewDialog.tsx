import { useState } from "react";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewedUserId: string;
  reviewedUserName: string;
  listingId: string;
  reviewerId: string;
  onReviewSubmitted?: () => void;
}

const ReviewDialog = ({
  open,
  onOpenChange,
  reviewedUserId,
  reviewedUserName,
  listingId,
  reviewerId,
  onReviewSubmitted,
}: ReviewDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("user_reviews").insert({
        reviewer_id: reviewerId,
        reviewed_id: reviewedUserId,
        listing_id: listingId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("You have already reviewed this user");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Review submitted successfully!");
      setRating(0);
      setComment("");
      onOpenChange(false);
      onReviewSubmitted?.();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHoveredRating(0);
    setComment("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {reviewedUserName}</DialogTitle>
          <DialogDescription>
            Share your experience with this user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="review-comment">Comment (optional)</Label>
            <Textarea
              id="review-comment"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
