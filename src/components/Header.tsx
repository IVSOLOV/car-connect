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

  const logHeaderClick = (target: string) => {
    console.log(`[Header] ${target} clicked`, {
      route: `${window.location.pathname}${window.location.search}`,
      bodyPointerEvents: document.body.style.pointerEvents || "cleared",
      rootPointerEvents: document.getElementById("root")?.style.pointerEvents || "cleared",
    });
  };

  const handleSignOut = async () => {
    logHeaderClick("Sign Out");
    await signOut();
    navigate("/");
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl safe-top"
      onClickCapture={() => logHeaderClick("Header capture")}
      onPointerDownCapture={() => logHeaderClick("Header pointerdown capture")}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center" onClick={() => logHeaderClick("Logo")}> 
            <img src={logo} alt="DiRent" className="h-16 mix-blend-screen" />
          </Link>

          <nav className="hidden items-center gap-2 md:flex rounded-full border border-border bg-card/80 p-1">
            <Link
              to="/dashboard"
              onClick={() => logHeaderClick("Browse Cars")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                location.pathname === "/dashboard" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              Browse Cars
            </Link>
            <Link
              to="/become-host"
              onClick={() => logHeaderClick("List Your Car")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                location.pathname === "/become-host" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              List Your Car
            </Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-3">
            {/* Admin Support Tickets */}
            {user && role === "admin" && (
              <Button variant="ghost" size="icon" onClick={() => { logHeaderClick("Admin Support Tickets"); navigate("/support-tickets"); }} className="relative h-9 w-9 sm:h-10 sm:w-10">
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
              <Button variant="ghost" size="icon" onClick={() => { logHeaderClick("Admin Approval Requests"); navigate("/approval-requests"); }} className="relative h-9 w-9 sm:h-10 sm:w-10">
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
              <Button variant="ghost" size="icon" onClick={() => { logHeaderClick("User Support Tickets"); navigate("/support-tickets"); }} className="relative h-9 w-9 sm:h-10 sm:w-10">
                <Headphones className="h-4 w-4 sm:h-5 sm:w-5" />
                {responseCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-medium flex items-center justify-center">
                    {responseCount > 9 ? "9+" : responseCount}
                  </span>
                )}
              </Button>
            )}

            {user && (
              <Button variant="ghost" size="icon" onClick={() => { logHeaderClick("Messages"); navigate("/messages"); }} className="relative h-9 w-9 sm:h-10 sm:w-10">
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
                  <Button variant="outline" size="sm" onClick={() => logHeaderClick("Account Menu")}> 
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
                  <DropdownMenuItem onClick={() => { logHeaderClick("My Account"); navigate("/my-account"); }}>
                    My Account
                  </DropdownMenuItem>
                  {(role === "host" || role === "admin") && (
                    <DropdownMenuItem onClick={() => { logHeaderClick("My Listings"); navigate("/my-listings"); }}>
                      My Listings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => { logHeaderClick("Messages menu item"); navigate("/messages"); }}>
                    Messages
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { logHeaderClick("Saved Listings"); navigate("/saved"); }}>
                    Saved Listings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { logHeaderClick("Write to Support"); navigate("/write-to-support"); }}>
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
                      <DropdownMenuItem onClick={() => { logHeaderClick("Admin Panel"); navigate("/admin"); }}>
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { logHeaderClick("Approval Requests menu item"); navigate("/approval-requests"); }}>
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
              <Button variant="outline" size="sm" onClick={() => { logHeaderClick("Sign In"); navigate("/auth"); }}>
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
