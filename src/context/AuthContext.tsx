import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';
import { makeSyntheticEmail, hashString, generateRecoveryCode } from '../lib/utils';

interface AuthContextType {
  user: any;
  profile: Profile | null;
  loading: boolean;
  recoveryCode: string | null;
  setRecoveryCode: (code: string | null) => void;
  signIn: (username: string, pin: string) => Promise<{ error?: string }>;
  signUp: (username: string, pin: string, email: string) => Promise<{ error?: string; recoveryCode?: string }>;
  resetPin: (username: string, recoveryCode: string, newPin: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setProfile(data);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (username: string, pin: string) => {
    try {
      const syntheticEmail = makeSyntheticEmail(username);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: pin,
      });
      if (error) {
        return { error: 'Invalid username or 6-digit PIN. Please try again.' };
      }
      if (data.user) {
        await fetchProfile(data.user.id);
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Sign in failed' };
    }
  };

  const signUp = async (username: string, pin: string, email: string) => {
    try {
      if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        return { error: 'PIN must be exactly 6 numeric digits.' };
      }
      const code = generateRecoveryCode();
      const codeHash = await hashString(code);
      const syntheticEmail = makeSyntheticEmail(username);

      const { data, error } = await supabase.auth.signUp({
        email: syntheticEmail,
        password: pin,
        options: {
          data: {
            username: username.trim(),
            real_email: email.trim(),
            recovery_code_hash: codeHash,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      setRecoveryCode(code);
      if (data.user) {
        await fetchProfile(data.user.id);
      }
      return { recoveryCode: code };
    } catch (err: any) {
      return { error: err.message || 'Sign up failed' };
    }
  };

  const resetPin = async (username: string, inputCode: string, newPin: string) => {
    try {
      if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
        return { error: 'New PIN must be exactly 6 numeric digits.' };
      }
      const codeHash = await hashString(inputCode);
      const { data, error } = await supabase.rpc('verify_and_reset_pin', {
        p_username: username.trim(),
        p_recovery_code_hash: codeHash,
        p_new_pin: newPin,
      });

      if (error) {
        return { error: error.message };
      }

      // Re-authenticate or update password
      const syntheticEmail = makeSyntheticEmail(username);
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: newPin,
      });

      if (signInErr) {
        return { error: 'PIN verified. Please sign in with your new PIN.' };
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'Reset failed' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        recoveryCode,
        setRecoveryCode,
        signIn,
        signUp,
        resetPin,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
