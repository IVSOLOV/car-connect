import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, User, LogOut, Menu, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut, loading } = useAuth();
  const { unreadCount } = useUnreadMessages();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center group">
            <span className="text-2xl font-bold tracking-tight relative">
              <span className="text-foreground">D</span>
              <span className="text-foreground" style={{ fontVariant: 'small-caps', textTransform: 'lowercase' }}>ı</span>
              <span className="text-primary">Rent</span>
              <ArrowRight className="absolute top-0 left-2 h-4 w-6 text-primary" strokeWidth={2.5} />
            </span>
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

          <div className="flex items-center gap-3">
            
            {user && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/messages")} className="relative">
                <MessageCircle className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium flex items-center justify-center">
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

            {/* Mobile menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  Browse Cars
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/become-host")}>
                  List Your Car
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
