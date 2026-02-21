import React, { useState, useEffect, useRef } from "react";
import Footer from "@/components/Footer";
import { Session } from "@supabase/supabase-js";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { Mail, Lock, User, Phone, ArrowRight, ArrowLeft, Building2, Camera, Loader2, Eye, EyeOff, Smartphone } from "lucide-react";
import logo from "@/assets/logo.png";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.string().email("Please enter a valid email address");

// Common weak passwords and patterns to block
const weakPatterns = [
  /^12345/,
  /^123456/,
  /^password/i,
  /^qwerty/i,
  /^abc123/i,
  /^111111/,
  /^000000/,
  /^letmein/i,
  /^welcome/i,
  /^admin/i,
  /^(.)\1{5,}/, // Same character repeated 6+ times
];

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/, "Password must contain at least one special character")
  .refine((password) => !weakPatterns.some(pattern => pattern.test(password)), {
    message: "Password is too common or weak. Please choose a stronger password.",
  });

const nameSchema = z.string().min(2, "Must be at least 2 characters");
const phoneSchema = z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, "Please enter a valid US phone number");

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

type AuthMode = "login" | "signup" | "forgot" | "verify-email" | "reset-password";

// Determine initial mode synchronously to prevent race conditions with auth redirects
const getInitialMode = (): AuthMode => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('reset') === 'true') return "reset-password";
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  if (hashParams.get('type') === 'recovery') return "reset-password";
  return "login";
};

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>(getInitialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showCompanyAsOwner, setShowCompanyAsOwner] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetSent, setResetSent] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRecoveryRef = useRef(false);
  const recoverySessionRef = useRef<Session | null>(null);

  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Listen for PASSWORD_RECOVERY auth event to reliably detect reset flow
  useEffect(() => {
    // Sync the ref with initial mode (already set synchronously via getInitialMode)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasResetParam = urlParams.get('reset') === 'true' || hashParams.get('type') === 'recovery';
    
    if (hasResetParam) {
      isRecoveryRef.current = true;
    }

    let recoveryReceived = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryReceived = true;
        isRecoveryRef.current = true;
        recoverySessionRef.current = session;
        setMode("reset-password");
      }
    });

    // If URL says reset but no valid recovery event fires within 3s, the token is expired/used
    if (hasResetParam) {
      const timeout = setTimeout(() => {
        if (!recoveryReceived && !recoverySessionRef.current) {
          isRecoveryRef.current = false;
          setMode("login");
          window.history.replaceState(null, '', '/auth');
          toast({
            title: "Reset link expired",
            description: "This password reset link has already been used or has expired. Please request a new one.",
            variant: "destructive",
          });
        }
      }, 3000);
      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    }

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // If recovery ref is set, never redirect away
    if (isRecoveryRef.current) {
      return;
    }

    // Check URL params for verified success
    const urlParams = new URLSearchParams(window.location.search);
    const verified = urlParams.get('verified');
    
    // If user just verified their email and is now logged in
    if (verified === 'true' && user) {
      toast({
        title: "Email verified! ✓",
        description: "Your account is now active. Welcome to DiRent!",
      });
      window.history.replaceState(null, '', '/auth');
      navigate("/");
      return;
    }
    
    // Handle case where user clicks verification link but is already verified
    if (user?.email_confirmed_at && mode === "verify-email") {
      toast({
        title: "Already verified",
        description: "Your email has already been verified. Redirecting to home...",
      });
      navigate("/");
      return;
    }
    
    if (user && mode !== "reset-password") {
      navigate("/");
    }
  }, [user, navigate, mode, toast]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    if (mode === "signup") {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    } else if (mode === "login") {
      if (!password) {
        newErrors.password = "Password is required";
      }
    }

    if (mode === "signup") {
      const firstNameResult = nameSchema.safeParse(firstName);
      if (!firstNameResult.success) {
        newErrors.firstName = firstNameResult.error.errors[0].message;
      }

      const lastNameResult = nameSchema.safeParse(lastName);
      if (!lastNameResult.success) {
        newErrors.lastName = lastNameResult.error.errors[0].message;
      }

      const phoneResult = phoneSchema.safeParse(phone);
      if (!phoneResult.success) {
        newErrors.phone = phoneResult.error.errors[0].message;
      }

      if (!agreedToTerms) {
        newErrors.terms = "You must agree to the Privacy Policy and Terms of Service";
      }

      if (password !== signupConfirmPassword) {
        newErrors.signupConfirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 10MB.",
          variant: "destructive",
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Compress large images for avatar use (max 800px wide)
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const maxWidth = 800;
        if (img.width > maxWidth || file.size > 2 * 1024 * 1024) {
          const canvas = document.createElement('canvas');
          const ratio = Math.min(maxWidth / img.width, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              setAvatarFile(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              setAvatarFile(file);
            }
          }, 'image/jpeg', 0.8);
        } else {
          setAvatarFile(file);
        }
        setAvatarPreview(objectUrl);
      };
      img.onerror = () => {
        setAvatarFile(file);
        setAvatarPreview(objectUrl);
      };
      img.src = objectUrl;
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast({
        title: "Upload failed",
        description: "Could not load image. Please try again.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const handleForgotPassword = async () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }

    setIsLoading(true);
    try {
      // Check if the email exists in our database
      let emailCheck;
      let checkError;
      try {
        const result = await supabase.functions.invoke(
          'check-email-exists',
          { body: { email: email.toLowerCase() } }
        );
        emailCheck = result.data;
        checkError = result.error;
      } catch (invokeErr) {
        console.error("check-email-exists invoke failed:", invokeErr);
        checkError = invokeErr;
      }

      if (checkError) {
        console.error("Error checking email:", checkError);
        toast({
          title: "Error",
          description: "Could not verify email. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!emailCheck?.exists) {
        toast({
          title: "Email not found",
          description: "No account exists with this email address. Please check the email or create a new account.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Use our custom DiRent-branded email via Resend instead of Supabase's default
      let emailResult;
      let emailError;
      try {
        const result = await supabase.functions.invoke(
          'send-auth-email',
          {
            body: {
              type: 'recovery',
              email: email.toLowerCase(),
              redirect_to: 'https://directrental.lovable.app/auth?reset=true',
            },
          }
        );
        emailResult = result.data;
        emailError = result.error;
      } catch (invokeErr) {
        console.error("send-auth-email invoke failed:", invokeErr);
        emailError = invokeErr;
      }

      if (emailError || emailResult?.error) {
        console.error("Reset email error:", emailError, emailResult?.error);
        toast({
          title: "Error",
          description: "Failed to send reset email. Please try again.",
          variant: "destructive",
        });
      } else {
        setResetSent(true);
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === "forgot") {
      await handleForgotPassword();
      return;
    }
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          // Check if login failed because email is not verified
          if (error.message.toLowerCase().includes("email not confirmed")) {
            toast({
              title: "Email not verified",
              description: "Please verify your email before signing in. We'll send you a new verification link.",
            });
            setMode("verify-email");
          } else {
            toast({
              title: "Sign in failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Welcome back!",
            description: "You've successfully signed in.",
            variant: "success" as any,
            duration: 1000,
          });
          navigate("/");
        }
      } else {
        // Check if email is deactivated before attempting signup
        try {
          const { data: deactivatedCheck, error: checkError } = await supabase.functions.invoke(
            "check-deactivated-email",
            { body: { email: email.toLowerCase() } }
          );

          if (checkError) {
            console.error("Error checking deactivated email:", checkError);
          } else if (deactivatedCheck?.isDeactivated) {
            toast({
              title: "Account Deactivated",
              description: "This email has been deactivated and cannot be used to create a new account. Please contact support for assistance.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        } catch (checkErr) {
          console.error("Error checking deactivated email:", checkErr);
        }

        const { error } = await signUp({
          email,
          password,
          firstName,
          lastName,
          phone,
          companyName: companyName || undefined,
          showCompanyAsOwner,
          avatarFile: avatarFile || undefined,
        });
        if (error) {
          const errorMsg = error.message.toLowerCase();
          if (errorMsg.includes("already registered") || errorMsg.includes("already been registered") || errorMsg.includes("already exists")) {
            toast({
              title: "Account already exists",
              description: "A user with this email address has already been registered. Please sign in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          setMode("verify-email");
          toast({
            title: "Verification email sent!",
            description: "Please check your inbox to verify your email address.",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      // Check if email is already verified by checking current session/user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser?.email_confirmed_at) {
        toast({
          title: "Already verified",
          description: "Your email has already been verified. You can now sign in.",
        });
        setMode("login");
        setIsResending(false);
        return;
      }

      // First generate a new confirmation link from Supabase
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (resendError) {
        // Check if error indicates already confirmed
        if (resendError.message.toLowerCase().includes('already confirmed') || 
            resendError.message.toLowerCase().includes('already verified')) {
          toast({
            title: "Already verified",
            description: "Your email has already been verified. You can now sign in.",
          });
          setMode("login");
        } else {
          toast({
            title: "Failed to resend",
            description: resendError.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Verification email sent",
          description: "Please check your inbox for the verification link.",
        });
        setResendCooldown(60);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  // Cooldown timer effect
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResetPassword = async () => {
    const newErrors: Record<string, string> = {};
    
    const passwordResult = passwordSchema.safeParse(newPassword);
    if (!passwordResult.success) {
      newErrors.newPassword = passwordResult.error.errors[0].message;
    }
    
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    
    setIsLoading(true);
    try {
      // Restore the recovery session before updating password to avoid reauthentication error
      if (recoverySessionRef.current) {
        await supabase.auth.setSession({
          access_token: recoverySessionRef.current.access_token,
          refresh_token: recoverySessionRef.current.refresh_token,
        });
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Sign out the user so they must log in with new password
        await supabase.auth.signOut();
        
        toast({
          title: "Password updated!",
          description: "Please sign in with your new password.",
        });
        // Clear the hash and redirect to login
        window.history.replaceState(null, '', '/auth');
        setMode("login");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getHeading = () => {
    switch (mode) {
      case "login":
        return "Welcome back";
      case "signup":
        return "Create your account";
      case "forgot":
        return "Reset your password";
      case "verify-email":
        return "Verify your email";
      case "reset-password":
        return "Set new password";
    }
  };

  const getSubheading = () => {
    switch (mode) {
      case "login":
        return "Sign in to access your account";
      case "signup":
        return "Join the direct car rental marketplace";
      case "forgot":
        return "Enter your email and we'll send you a reset link";
      case "verify-email":
        return "We've sent you a verification link";
      case "reset-password":
        return "Choose a new password for your account";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 pt-36 sm:pt-12">
      <SEO 
        title="Sign In | DiRent - Direct Owner Car Rentals"
        description="Sign in or create an account to rent cars directly from owners or list your car for rent."
        canonicalUrl="/auth"
      />
      
      {/* Back to Dashboard link */}
      <div className="w-full max-w-md mx-auto mb-4">
        <Link 
          to="/dashboard" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="bg-background/95 rounded-md inline-flex">
              <img src={logo} alt="DiRent" className="h-20 mix-blend-screen" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {getHeading()}
          </h1>
          <p className="text-muted-foreground">
            {getSubheading()}
          </p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          {mode === "reset-password" ? (
            <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="space-y-4">
              {/* Mobile app banner - detect mobile devices */}
              {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
                <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm text-foreground font-medium">Have the DiRent app?</p>
                    <p className="text-xs text-muted-foreground">You can reset your password directly in the app for a smoother experience.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={() => {
                        window.location.href = `com.solostar.dirent://auth?reset=true`;
                        // Fallback: if app doesn't open within 1.5s, stay on web
                        setTimeout(() => {
                          // User is still here, app didn't open - that's fine, they can use web
                        }, 1500);
                      }}
                    >
                      Open in DiRent App
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-destructive">{errors.newPassword}</p>
                )}
                {!errors.newPassword && (
                  <p className="text-xs text-muted-foreground">
                    Min 8 characters with uppercase, lowercase, number & special character
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
              
              <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  <>
                    Update Password
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          ) : mode === "verify-email" ? (
            <div className="text-center py-4">
              <div className="mb-4 mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Check your inbox</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We've sent a verification link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Click the link in the email to verify your account and start using DiRent.
              </p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleResendVerification}
                  disabled={isResending || resendCooldown > 0}
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Resend verification email
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMode("login");
                    setEmail("");
                    setPassword("");
                  }}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to sign in
                </Button>
              </div>
            </div>
          ) : mode === "forgot" && resetSent ? (
            <div className="text-center py-4">
              <div className="mb-4 mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Check your inbox</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setMode("login");
                  setResetSent(false);
                  setEmail("");
                }}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                      {errors.firstName && (
                        <p className="text-xs text-destructive">{errors.firstName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                      {errors.lastName && (
                        <p className="text-xs text-destructive">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Cell Phone (US)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>

                  {/* Avatar Upload */}
                  <div className="space-y-2">
                    <Label>Profile Photo (Optional)</Label>
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-border hover:border-primary transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          disabled={isLoading}
                        >
                          {avatarPreview ? "Change Photo" : "Upload Photo"}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">Max 10MB, JPG or PNG</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Company Name with Checkbox */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name (Optional)</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="companyName"
                          type="text"
                          placeholder="Your Company LLC"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    
                    {/* Show Company as Owner Checkbox */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showCompanyAsOwner"
                        checked={showCompanyAsOwner}
                        onCheckedChange={(checked) => setShowCompanyAsOwner(checked === true)}
                        disabled={isLoading || !companyName}
                      />
                      <Label 
                        htmlFor="showCompanyAsOwner" 
                        className={`text-sm font-normal cursor-pointer ${!companyName ? 'text-muted-foreground' : ''}`}
                      >
                        Display company name instead of my name on listings
                      </Label>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                  {mode === "signup" && !errors.password && (
                    <p className="text-xs text-muted-foreground">
                      Min 8 characters with uppercase, lowercase, number & special character
                    </p>
                  )}
                </div>
              )}

              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="signupConfirmPassword">Re-enter Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signupConfirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className={`pl-10 pr-10 ${errors.signupConfirmPassword ? 'border-destructive' : ''}`}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.signupConfirmPassword && (
                    <p className="text-sm text-destructive">{errors.signupConfirmPassword}</p>
                  )}
                  {signupConfirmPassword && password && signupConfirmPassword !== password && !errors.signupConfirmPassword && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">Passwords do not match</p>
                  )}
                  {signupConfirmPassword && password && signupConfirmPassword === password && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">Passwords match</p>
                  )}
                </div>
              )}

              {mode === "login" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setErrors({});
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {mode === "signup" && (
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="agreedToTerms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                      disabled={isLoading}
                      className="mt-0.5"
                    />
                    <Label 
                      htmlFor="agreedToTerms" 
                      className="text-sm font-normal cursor-pointer leading-relaxed"
                    >
                      I agree to the{" "}
                      <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                        Privacy Policy
                      </Link>{" "}
                      and{" "}
                      <Link to="/terms" className="text-primary hover:underline" target="_blank">
                        Terms of Service
                      </Link>
                    </Label>
                  </div>
                  {errors.terms && (
                    <p className="text-sm text-destructive">{errors.terms}</p>
                  )}
                </div>
              )}

              <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait...
                  </>
                ) : (
                  <>
                    {mode === "login" && "Sign In"}
                    {mode === "signup" && "Create Account"}
                    {mode === "forgot" && "Send Reset Link"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>


              {mode === "forgot" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMode("login");
                    setErrors({});
                  }}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to sign in
                </Button>
              )}
            </form>
          )}

          {mode !== "forgot" && mode !== "reset-password" && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setErrors({});
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Benefits */}
        {mode === "signup" && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p className="mb-2">As a member you can:</p>
            <ul className="space-y-1">
              <li>✓ Save your favorite listings</li>
              <li>✓ Message car owners directly</li>
              <li>✓ List your own cars for rent</li>
            </ul>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
