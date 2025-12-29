import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, User, LogOut, Bell, Shield, HelpCircle, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { usePendingApprovals } from "@/hooks/usePendingApprovals";
import { useOpenTickets } from "@/hooks/useOpenTickets";
import { useUserTicketResponses } from "@/hooks/useUserTicketResponses";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut, loading } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { pendingCount } = usePendingApprovals();
  const { openCount } = useOpenTickets();
  const { responseCount } = useUserTicketResponses();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="DiRent" className="h-16" />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/dashboard"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              Browse Cars
            </Link>
            <Link
              to="/become-host"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === "/become-host" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              List Your Car
            </Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-3">
            {/* Admin Support Tickets */}
            {user && role === "admin" && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/support-tickets")} className="relative h-9 w-9 sm:h-10 sm:w-10">
                <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                {openCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-medium flex items-center justify-center">
                    {openCount > 9 ? "9+" : openCount}
                  </span>
                )}
              </Button>
            )}

            {/* Admin Approval Requests */}
            {user && role === "admin" && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/approval-requests")} className="relative h-9 w-9 sm:h-10 sm:w-10">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-medium flex items-center justify-center">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </Button>
            )}
            
            {/* User Support Response Notification */}
            {user && role !== "admin" && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/support-tickets")} className="relative h-9 w-9 sm:h-10 sm:w-10">
                <Headphones className="h-4 w-4 sm:h-5 sm:w-5" />
                {responseCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-medium flex items-center justify-center">
                    {responseCount > 9 ? "9+" : responseCount}
                  </span>
                )}
              </Button>
            )}

            {user && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/messages")} className="relative h-9 w-9 sm:h-10 sm:w-10">
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-medium flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            )}

            {loading ? (
              <div className="h-9 w-20 animate-pulse bg-secondary rounded-md" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm">
                    <p className="font-medium text-foreground truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{role || "Guest"}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/my-account")}>
                    My Account
                  </DropdownMenuItem>
                  {(role === "host" || role === "admin") && (
                    <DropdownMenuItem onClick={() => navigate("/my-account")}>
                      My Listings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/messages")}>
                    Messages
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/saved")}>
                    Saved Listings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/write-to-support")}>
                    <Headphones className="h-4 w-4 mr-2" />
                    Write to Support
                    {responseCount > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                        {responseCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                  {role === "admin" && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/approval-requests")}>
                        <Bell className="h-4 w-4 mr-2" />
                        Approval Requests
                        {pendingCount > 0 && (
                          <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                            {pendingCount}
                          </span>
                        )}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
