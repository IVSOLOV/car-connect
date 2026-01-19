import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "guest" | "host" | "admin";

// Welcome email is now combined with the confirmation email template
// No separate welcome email needed during signup

interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyName?: string;
  showCompanyAsOwner?: boolean;
  avatarFile?: File;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  upgradeToHost: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc("get_user_role", { _user_id: userId });
      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }
      return data as AppRole;
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id).then(setRole);
          }, 0);
        } else {
          setRole(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id).then(setRole);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (data: SignUpData) => {
    const { email, password, firstName, lastName, phone, companyName, showCompanyAsOwner, avatarFile } = data;
    const redirectUrl = `${window.location.origin}/`;
    
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          company_name: companyName || null,
          show_company_as_owner: showCompanyAsOwner || false,
        },
      },
    });
    
    // Check if user already exists - multiple detection methods:
    // 1. Empty identities array (standard Supabase behavior)
    // 2. User created_at equals updated_at with no new session (existing user, auto_confirm_email=true)
    if (!error && signUpData.user) {
      const identitiesEmpty = signUpData.user.identities?.length === 0;
      const isExistingUser = signUpData.user.created_at !== signUpData.user.updated_at || 
        (signUpData.user.email_confirmed_at && new Date(signUpData.user.email_confirmed_at) < new Date(Date.now() - 5000));
      
      if (identitiesEmpty || isExistingUser) {
        return { error: new Error("A user with this email address has already been registered") };
      }
    }
    
    // If signup successful and there's an avatar file, upload it
    if (!error && signUpData.user && avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `${signUpData.user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });
      
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        // Update the profile with avatar URL
        await supabase
          .from('profiles')
          .update({ avatar_url: urlData.publicUrl })
          .eq('user_id', signUpData.user.id);
      }
    }
    
    // Send custom verification email through Resend for better deliverability
    if (!error && signUpData.user) {
      try {
        await supabase.functions.invoke('send-auth-email', {
          body: {
            type: 'confirmation',
            email: email,
            redirect_to: `${window.location.origin}/`,
          },
        });
        console.log('Custom verification email sent via Resend');
      } catch (emailError) {
        console.error('Failed to send custom verification email:', emailError);
        // Don't fail the signup if email sending fails - Supabase's default email will still go out
      }
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const upgradeToHost = async () => {
    if (!user) {
      return { error: new Error("User not authenticated") };
    }

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "host" });
    
    if (!error) {
      setRole("host");
    }
    
    return { error: error as Error | null };
  };

  const value = {
    user,
    session,
    role,
    loading,
    signUp,
    signIn,
    signOut,
    upgradeToHost,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
