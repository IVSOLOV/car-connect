import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Car,
  Users,
  Eye,
  ChevronDown,
  UserX,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Listing } from "@/types/listing";

interface ListingWithOwner extends Listing {
  owner_name?: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
  listings_count?: number;
  email?: string;
}

interface DeactivatedUser {
  id: string;
  masked_email: string; // Email is masked for security
  user_id: string | null;
  deactivated_by: string;
  reason: string | null;
  created_at: string;
  deactivated_by_name?: string;
}

type SortField = "created_at" | "full_name" | "listings_count" | "email";
type SortOrder = "asc" | "desc";

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  
  // Listings state
  const [listings, setListings] = useState<ListingWithOwner[]>([]);
  const [filteredListings, setFilteredListings] = useState<ListingWithOwner[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [priceSort, setPriceSort] = useState<"none" | "asc" | "desc">("none");
  const [createdSort, setCreatedSort] = useState<"none" | "asc" | "desc">("none");

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [userSortField, setUserSortField] = useState<SortField>("created_at");
  const [userSortOrder, setUserSortOrder] = useState<SortOrder>("desc");

  // Deactivation state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<UserProfile | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Deactivated users history state
  const [deactivatedUsers, setDeactivatedUsers] = useState<DeactivatedUser[]>([]);
  const [deactivatedUsersLoading, setDeactivatedUsersLoading] = useState(true);

  // Unique values for filters
  const [uniqueMakes, setUniqueMakes] = useState<string[]>([]);
  const [uniqueModels, setUniqueModels] = useState<string[]>([]);
  const [uniqueYears, setUniqueYears] = useState<number[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    if (role !== "admin") {
      navigate("/");
      return;
    }
    fetchListings();
    fetchUsers();
    fetchDeactivatedUsers();
  }, [role, navigate]);

  const fetchListings = async () => {
    try {
      const { data: listingsData, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (listingsData) {
        // Get unique owner IDs
        const ownerIds = [...new Set(listingsData.map(l => l.user_id))];
        
        // Fetch owner profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, full_name, company_name")
          .in("user_id", ownerIds);

        const listingsWithOwners = listingsData.map(listing => {
          const owner = profiles?.find(p => p.user_id === listing.user_id);
          const ownerName = owner?.full_name || 
            `${owner?.first_name || ""} ${owner?.last_name || ""}`.trim() || 
            owner?.company_name || "Unknown";
          return { ...listing, owner_name: ownerName } as ListingWithOwner;
        });

        setListings(listingsWithOwners);
        setFilteredListings(listingsWithOwners);

        // Extract unique values for filters
        setUniqueMakes([...new Set(listingsData.map(l => l.make))].sort());
        setUniqueModels([...new Set(listingsData.map(l => l.model))].sort());
        setUniqueYears([...new Set(listingsData.map(l => l.year))].sort((a, b) => b - a));
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setListingsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (profilesData) {
        // Get listings count for each user
        const { data: listingsData } = await supabase
          .from("listings")
          .select("user_id");

        const listingsCountMap: Record<string, number> = {};
        listingsData?.forEach(l => {
          listingsCountMap[l.user_id] = (listingsCountMap[l.user_id] || 0) + 1;
        });

        // Fetch user emails via edge function (admin only)
        let userEmails: Record<string, string> = {};
        try {
          const { data: session } = await supabase.auth.getSession();
          if (session?.session?.access_token) {
            const response = await supabase.functions.invoke("get-admin-users");
            if (response.data?.userEmails) {
              userEmails = response.data.userEmails;
            }
          }
        } catch (emailError) {
          console.error("Error fetching user emails:", emailError);
        }

        const usersWithCount = profilesData.map(profile => ({
          ...profile,
          listings_count: listingsCountMap[profile.user_id] || 0,
          email: userEmails[profile.user_id] || ""
        }));

        setUsers(usersWithCount);
        setFilteredUsers(usersWithCount);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchDeactivatedUsers = async () => {
    try {
      // Use the admin view which masks email addresses for security
      const { data, error } = await supabase
        .from("deactivated_users_admin" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Get admin names for deactivated_by
        const adminIds = [...new Set(data.map((d: any) => d.deactivated_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, first_name, last_name")
          .in("user_id", adminIds);

        const deactivatedWithNames = data.map((d: any) => {
          const admin = profiles?.find(p => p.user_id === d.deactivated_by);
          const adminName = admin?.full_name || 
            `${admin?.first_name || ""} ${admin?.last_name || ""}`.trim() || 
            "Unknown Admin";
          return { ...d, deactivated_by_name: adminName } as DeactivatedUser;
        });

        setDeactivatedUsers(deactivatedWithNames);
      }
    } catch (error) {
      console.error("Error fetching deactivated users:", error);
    } finally {
      setDeactivatedUsersLoading(false);
    }
  };

  // Filter listings
  useEffect(() => {
    let filtered = [...listings];

    if (ownerFilter) {
      filtered = filtered.filter(l => 
        l.owner_name?.toLowerCase().includes(ownerFilter.toLowerCase())
      );
    }

    if (makeFilter) {
      filtered = filtered.filter(l => l.make === makeFilter);
    }

    if (modelFilter) {
      filtered = filtered.filter(l => l.model === modelFilter);
    }

    if (yearFilter) {
      filtered = filtered.filter(l => l.year === parseInt(yearFilter));
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(l => l.approval_status === statusFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter(l => new Date(l.created_at) >= new Date(dateFrom));
    }

    if (dateTo) {
      filtered = filtered.filter(l => new Date(l.created_at) <= new Date(dateTo + "T23:59:59"));
    }

    // Sort by price
    if (priceSort !== "none") {
      filtered.sort((a, b) => {
        if (priceSort === "asc") {
          return a.daily_price - b.daily_price;
        }
        return b.daily_price - a.daily_price;
      });
    }

    // Sort by created date
    if (createdSort !== "none") {
      filtered.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        if (createdSort === "asc") {
          return dateA - dateB;
        }
        return dateB - dateA;
      });
    }

    setFilteredListings(filtered);
  }, [listings, ownerFilter, makeFilter, modelFilter, yearFilter, statusFilter, dateFrom, dateTo, priceSort, createdSort]);

  // Filter and sort users
  useEffect(() => {
    let filtered = [...users];

    if (userSearch) {
      filtered = filtered.filter(u => 
        u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.first_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.last_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.company_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (userSortField) {
        case "full_name":
          aVal = a.full_name || `${a.first_name || ""} ${a.last_name || ""}`;
          bVal = b.full_name || `${b.first_name || ""} ${b.last_name || ""}`;
          break;
        case "listings_count":
          aVal = a.listings_count || 0;
          bVal = b.listings_count || 0;
          break;
        case "email":
          aVal = a.email || "";
          bVal = b.email || "";
          break;
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
      }

      if (userSortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    setFilteredUsers(filtered);
  }, [users, userSearch, userSortField, userSortOrder]);

  const clearListingFilters = () => {
    setOwnerFilter("");
    setMakeFilter("");
    setModelFilter("");
    setYearFilter("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setPriceSort("none");
    setCreatedSort("none");
  };

  const handleDeactivateUser = async () => {
    if (!userToDeactivate) return;
    
    setIsDeactivating(true);
    try {
      const response = await supabase.functions.invoke("deactivate-user", {
        body: {
          user_id: userToDeactivate.user_id,
          reason: deactivateReason || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to deactivate user");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "User deactivated",
        description: `${userToDeactivate.email || userToDeactivate.full_name || "User"} has been deactivated and cannot create a new account with the same email.`,
      });

      // Remove user from the list and refresh deactivated users
      setUsers(prev => prev.filter(u => u.user_id !== userToDeactivate.user_id));
      setFilteredUsers(prev => prev.filter(u => u.user_id !== userToDeactivate.user_id));
      fetchDeactivatedUsers();
    } catch (error) {
      console.error("Error deactivating user:", error);
      toast({
        title: "Failed to deactivate user",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeactivating(false);
      setDeactivateDialogOpen(false);
      setUserToDeactivate(null);
      setDeactivateReason("");
    }
  };

  const openDeactivateDialog = (userProfile: UserProfile) => {
    setUserToDeactivate(userProfile);
    setDeactivateDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Rejected</Badge>;
      case "deactivated":
        return <Badge className="bg-gray-500/20 text-gray-500 border-gray-500/30">Deactivated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Admin Panel | Car Rental" description="Manage listings and users" />
      <Header />

      <main className="container mx-auto px-4 pt-36 sm:pt-24 pb-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Admin Panel</h1>

        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="listings" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Listings
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="deactivated" className="flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Deactivated
            </TabsTrigger>
          </TabsList>

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Owner Name</label>
                    <Input
                      placeholder="Search owner..."
                      value={ownerFilter}
                      onChange={(e) => setOwnerFilter(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Make</label>
                    <Select value={makeFilter} onValueChange={setMakeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All makes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All makes</SelectItem>
                        {uniqueMakes.map(make => (
                          <SelectItem key={make} value={make}>{make}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Model</label>
                    <Select value={modelFilter} onValueChange={setModelFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All models" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All models</SelectItem>
                        {uniqueModels.map(model => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Year</label>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All years</SelectItem>
                        {uniqueYears.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="deactivated">Deactivated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">From Date</label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">To Date</label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button variant="outline" onClick={clearListingFilters} className="w-full">
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Listings ({filteredListings.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {listingsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 font-medium hover:bg-transparent"
                              onClick={() => {
                                if (priceSort === "none") setPriceSort("asc");
                                else if (priceSort === "asc") setPriceSort("desc");
                                else setPriceSort("none");
                              }}
                            >
                              Price/Day
                              <ArrowUpDown className={`ml-1 h-3 w-3 ${priceSort !== "none" ? "text-primary" : ""}`} />
                              {priceSort === "asc" && <span className="text-xs text-primary ml-1">↑</span>}
                              {priceSort === "desc" && <span className="text-xs text-primary ml-1">↓</span>}
                            </Button>
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 font-medium hover:bg-transparent"
                              onClick={() => {
                                if (createdSort === "none") setCreatedSort("desc");
                                else if (createdSort === "desc") setCreatedSort("asc");
                                else setCreatedSort("none");
                              }}
                            >
                              Created
                              <ArrowUpDown className={`ml-1 h-3 w-3 ${createdSort !== "none" ? "text-primary" : ""}`} />
                              {createdSort === "asc" && <span className="text-xs text-primary ml-1">↑</span>}
                              {createdSort === "desc" && <span className="text-xs text-primary ml-1">↓</span>}
                            </Button>
                          </TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredListings.map((listing) => (
                          <TableRow key={listing.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {listing.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="font-medium">
                              {listing.year} {listing.make} {listing.model}
                            </TableCell>
                            <TableCell>
                              <Link 
                                to={`/owner/${listing.user_id}`}
                                className="text-primary hover:underline"
                              >
                                {listing.owner_name}
                              </Link>
                            </TableCell>
                            <TableCell>{listing.city}, {listing.state}</TableCell>
                            <TableCell>${listing.daily_price}</TableCell>
                            <TableCell>{getStatusBadge(listing.approval_status)}</TableCell>
                            <TableCell>{format(new Date(listing.created_at), "MMM d, yyyy")}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/listing/${listing.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                  <CardTitle>Users ({filteredUsers.length})</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <ArrowUpDown className="h-4 w-4" />
                          Sort
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setUserSortField("created_at"); setUserSortOrder("desc"); }}>
                          Newest First
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setUserSortField("created_at"); setUserSortOrder("asc"); }}>
                          Oldest First
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setUserSortField("full_name"); setUserSortOrder("asc"); }}>
                          Name A-Z
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setUserSortField("full_name"); setUserSortOrder("desc"); }}>
                          Name Z-A
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setUserSortField("listings_count"); setUserSortOrder("desc"); }}>
                          Most Listings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setUserSortField("listings_count"); setUserSortOrder("asc"); }}>
                          Fewest Listings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Listings</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {user.user_id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="font-medium">
                              {user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {user.email || "—"}
                            </TableCell>
                            <TableCell>{user.company_name || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{user.listings_count}</Badge>
                            </TableCell>
                            <TableCell>{format(new Date(user.created_at), "MMM d, yyyy")}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link to={`/owner/${user.user_id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => openDeactivateDialog(user)}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deactivated Users Tab */}
          <TabsContent value="deactivated" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Deactivated Users ({deactivatedUsers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {deactivatedUsersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : deactivatedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No deactivated users yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Deactivated By</TableHead>
                          <TableHead>Deactivated On</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deactivatedUsers.map((deactivated) => (
                          <TableRow key={deactivated.id}>
                            <TableCell className="font-medium">
                              {deactivated.masked_email}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-xs truncate">
                              {deactivated.reason || "—"}
                            </TableCell>
                            <TableCell>
                              {deactivated.deactivated_by_name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              {format(new Date(deactivated.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Deactivate User Dialog */}
        <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate{" "}
                <strong>{userToDeactivate?.email || userToDeactivate?.full_name || "this user"}</strong>?
                <br /><br />
                This action will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Delete the user's account</li>
                  <li>Prevent them from creating a new account with the same email</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="deactivate-reason">Reason (optional)</Label>
              <Textarea
                id="deactivate-reason"
                placeholder="Enter reason for deactivation..."
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeactivateUser}
                disabled={isDeactivating}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeactivating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  "Deactivate User"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPanel;
