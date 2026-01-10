import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Car, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useListingSubscription } from "@/hooks/useListingSubscription";

const ListingSuccess = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkSubscription } = useListingSubscription();

  useEffect(() => {
    // Refresh subscription status after successful payment
    checkSubscription();
  }, [checkSubscription]);

  // If no user, redirect to auth
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Success! | DiRent"
        description="Your subscription is active"
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-lg mx-auto">
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <CheckCircle className="h-16 w-16 text-primary" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">
                  🎉 You're All Set!
                </h1>
                <p className="text-lg text-muted-foreground">
                  Thanks for joining DiRent! Your payment info is saved and your 30-day free trial has started.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p>
                  Your listing will be reviewed by our team and go live within 24 hours. 
                  You'll receive an email notification once it's approved!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={() => navigate("/create-listing")} 
                  className="flex-1 gap-2"
                >
                  <Car className="h-4 w-4" />
                  List Another Vehicle
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")} 
                  className="flex-1 gap-2"
                >
                  <Search className="h-4 w-4" />
                  Browse Listings
                </Button>
              </div>

              <Button 
                variant="ghost" 
                onClick={() => navigate("/my-account")}
                className="text-muted-foreground"
              >
                Go to My Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ListingSuccess;
