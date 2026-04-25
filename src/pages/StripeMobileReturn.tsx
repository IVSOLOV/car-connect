import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";
import SEO from "@/components/SEO";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type ReturnState = "verifying" | "success" | "failed";

const SUCCESS_DEEP_LINK = "com.solostar.dirent://listing-success?payment=success";
const CANCELED_DEEP_LINK = "com.solostar.dirent://listing-success?payment=canceled";

const StripeMobileReturn = () => {
  const [searchParams] = useSearchParams();
  const paymentStatus = searchParams.get("payment");
  const sessionId = searchParams.get("session_id");
  const [returnState, setReturnState] = useState<ReturnState>(
    paymentStatus === "success" && sessionId ? "verifying" : "failed",
  );

  const successDeepLink = useMemo(() => {
    if (!sessionId) return SUCCESS_DEEP_LINK;
    return `${SUCCESS_DEEP_LINK}&session_id=${encodeURIComponent(sessionId)}`;
  }, [sessionId]);

  useEffect(() => {
    if (paymentStatus !== "success" || !sessionId) {
      setReturnState("failed");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-listing-checkout", {
          body: { session_id: sessionId },
        });

        if (cancelled) return;
        if (error) throw error;
        setReturnState(data?.paid ? "success" : "failed");
      } catch (error) {
        if (cancelled) return;
        console.error("[StripeMobileReturn] Verification error:", error);
        setReturnState("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paymentStatus, sessionId]);

  if (returnState === "verifying") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <SEO title="Confirming Payment | DiRent" description="Confirming your Stripe payment" />
        <LoadingSpinner />
        <p className="text-muted-foreground">Confirming your payment...</p>
      </div>
    );
  }

  const isSuccess = returnState === "success";
  const title = isSuccess ? "Return to DiRent Application" : "Payment Not Completed";
  const message = isSuccess
    ? "Your payment was completed. Please return to the DiRent app to finish your listing."
    : "Your payment was not completed. Please return to DiRent and try again.";
  const buttonText = isSuccess ? "Open DiRent App" : "Back to DiRent";
  const deepLink = isSuccess ? successDeepLink : CANCELED_DEEP_LINK;
  const Icon = isSuccess ? CheckCircle : XCircle;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-10 text-center">
      <SEO title={`${title} | DiRent`} description={message} />
      <main className="max-w-sm space-y-6">
        <Icon className={`mx-auto h-16 w-16 ${isSuccess ? "text-primary" : "text-destructive"}`} />
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{message}</p>
        </div>
        <Button asChild className="w-full" size="lg">
          <a href={deepLink}>{buttonText}</a>
        </Button>
      </main>
    </div>
  );
};

export default StripeMobileReturn;