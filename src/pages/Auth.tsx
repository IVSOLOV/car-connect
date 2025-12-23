import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Mail, Lock, User, Phone, ArrowRight, ArrowLeft, Building2, Camera } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().min(2, "Must be at least 2 characters");
const phoneSchema = z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, "Please enter a valid US phone number");

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

type AuthMode = "login" | "signup" | "forgot";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    if (mode !== "forgot") {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
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
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB.",
          variant: "destructive",
        });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
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
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You've successfully signed in.",
          });
          navigate("/");
        }
      } else {
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
          if (error.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Try signing in instead.",
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
          toast({
            title: "Account created!",
            description: "Welcome to DiRent. You can now browse and save listings.",
          });
          navigate("/");
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

  const getHeading = () => {
    switch (mode) {
      case "login":
        return "Welcome back";
      case "signup":
        return "Create your account";
      case "forgot":
        return "Reset your password";
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
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="DiRent" className="h-16" />
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
          {mode === "forgot" && resetSent ? (
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
                        onClick={() => fileInputRef.current?.click()}
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
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isLoading}
                        >
                          {avatarPreview ? "Change Photo" : "Upload Photo"}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">Max 5MB, JPG or PNG</p>
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
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
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

              <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  "Please wait..."
                ) : (
                  <>
                    {mode === "login" && "Sign In"}
                    {mode === "signup" && "Create Account"}
                    {mode === "forgot" && "Send Reset Link"}
                    <ArrowRight className="h-4 w-4" />
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

          {mode !== "forgot" && (
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
    </div>
  );
};

export default Auth;
