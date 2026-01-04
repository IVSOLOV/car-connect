import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, User, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
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
  guest_name: string | null;
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
  const [guestName, setGuestName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

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

  const handleStartEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setStartDate(new Date(booking.start_date));
    setEndDate(new Date(booking.end_date));
    setGuestName(booking.guest_name || "");
  };

  const handleCancelEdit = () => {
    setEditingBooking(null);
    setStartDate(undefined);
    setEndDate(undefined);
    setGuestName("");
  };

  const handleSaveBooking = async () => {
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
      if (editingBooking) {
        // Update existing booking
        const { error } = await supabase
          .from("listing_bookings" as any)
          .update({
            start_date: format(startDate, "yyyy-MM-dd"),
            end_date: format(endDate, "yyyy-MM-dd"),
            guest_name: guestName.trim() || null,
          })
          .eq("id", editingBooking.id);

        if (error) throw error;
        toast.success("Booking updated successfully");
      } else {
        // Add new booking
        const { error } = await supabase.from("listing_bookings" as any).insert({
          listing_id: listingId,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          guest_name: guestName.trim() || null,
        });

        if (error) throw error;
        toast.success("Booking added successfully");
      }

      setStartDate(undefined);
      setEndDate(undefined);
      setGuestName("");
      setEditingBooking(null);
      fetchBookings();
    } catch (error) {
      console.error("Error saving booking:", error);
      toast.error(editingBooking ? "Failed to update booking" : "Failed to add booking");
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

  // Get all booked dates for calendar highlighting (exclude editing booking)
  const bookedDates = bookings
    .filter((booking) => booking.id !== editingBooking?.id)
    .flatMap((booking) => {
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
          {/* Add/Edit Booking */}
          <div className="p-4 rounded-lg border border-border bg-secondary/30">
            <h3 className="font-semibold text-foreground mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                {editingBooking ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingBooking ? "Edit Booking" : "Add New Booking"}
              </span>
              {editingBooking && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
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

              <div className="space-y-2 sm:col-span-2">
                <Label>Guest Name (Optional)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter guest name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveBooking}
              disabled={isAdding || !startDate || !endDate}
              className="mt-4 w-full sm:w-auto"
            >
              {isAdding ? "Saving..." : editingBooking ? "Update Booking" : "Add Booking"}
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
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border bg-card",
                      editingBooking?.id === booking.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {format(new Date(booking.start_date), "MMM d, yyyy")} -{" "}
                        {format(new Date(booking.end_date), "MMM d, yyyy")}
                      </p>
                      {booking.guest_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <User className="h-3 w-3" />
                          {booking.guest_name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEdit(booking)}
                        className="text-muted-foreground hover:text-foreground"
                        disabled={editingBooking?.id === booking.id}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBooking(booking.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
