import { useState } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import type { Car } from "@/data/cars";

interface MessageOwnerModalProps {
  car: Car;
  isOpen: boolean;
  onClose: () => void;
}

const MessageOwnerModal = ({ car, isOpen, onClose }: MessageOwnerModalProps) => {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !message) {
      toast.error("Please fill in all fields");
      return;
    }

    // Simulate sending message
    toast.success(`Message sent to ${car.owner.name}!`);
    setMessage("");
    setName("");
    setEmail("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-card-hover animate-scale-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">Contact Owner</h2>
          <p className="text-sm text-muted-foreground">
            Send a message about {car.title}
          </p>
        </div>

        <div className="mb-6 flex items-center gap-4 rounded-xl bg-secondary/50 p-4">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarImage src={car.owner.avatar} alt={car.owner.name} />
            <AvatarFallback>{car.owner.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{car.owner.name}</p>
            <p className="text-sm text-muted-foreground">
              Member since {car.owner.memberSince}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Your Name
              </label>
              <Input
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Your Email
              </label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Message
            </label>
            <Textarea
              placeholder={`Hi ${car.owner.name}, I'm interested in your ${car.title}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none border-border bg-secondary"
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            <Send className="mr-2 h-4 w-4" />
            Send Message
          </Button>
        </form>
      </div>
    </div>
  );
};

export default MessageOwnerModal;
