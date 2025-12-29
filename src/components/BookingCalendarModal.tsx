import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
interface Booking {
  id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  notes: string | null;
}

interface BookingCalendarModalProps {
  listingId: string;
  listingTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const BookingCalendarModal = ({
  listingId,
  listingTitle,
  isOpen,
  onClose,
}: BookingCalendarModalProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchBookings();
    }
  }, [isOpen, listingId]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("listing_bookings" as any)
        .select("*")
        .eq("listing_id", listingId)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setBookings((data as unknown as Booking[]) || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBooking = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }

    setIsAdding(true);

    try {
      const { error } = await supabase.from("listing_bookings" as any).insert({
        listing_id: listingId,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
      });

      if (error) throw error;

      toast.success("Booking added successfully");
      setStartDate(undefined);
      setEndDate(undefined);
      fetchBookings();
    } catch (error) {
      console.error("Error adding booking:", error);
      toast.error("Failed to add booking");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("listing_bookings" as any)
        .delete()
        .eq("id", bookingId);

      if (error) throw error;

      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      toast.success("Booking removed");
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("Failed to delete booking");
    }
  };

  // Get all booked dates for calendar highlighting
  const bookedDates = bookings.flatMap((booking) => {
    const dates: Date[] = [];
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    return dates;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Manage Bookings - {listingTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Add New Booking */}
          <div className="p-4 rounded-lg border border-border bg-secondary/30">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Booking
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                      modifiers={{ booked: bookedDates }}
                      modifiersStyles={{
                        booked: { backgroundColor: "hsl(var(--destructive) / 0.2)" },
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                      disabled={(date) => (startDate ? date < startDate : false)}
                      modifiers={{ booked: bookedDates }}
                      modifiersStyles={{
                        booked: { backgroundColor: "hsl(var(--destructive) / 0.2)" },
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

            </div>

            <Button
              onClick={handleAddBooking}
              disabled={isAdding || !startDate || !endDate}
              className="mt-4 w-full sm:w-auto"
            >
              {isAdding ? "Adding..." : "Add Booking"}
            </Button>
          </div>

          {/* Existing Bookings */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">
              Existing Bookings ({bookings.length})
            </h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                No bookings yet. Add a booking above when your car is rented.
              </p>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {format(new Date(booking.start_date), "MMM d, yyyy")} -{" "}
                        {format(new Date(booking.end_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteBooking(booking.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingCalendarModal;
