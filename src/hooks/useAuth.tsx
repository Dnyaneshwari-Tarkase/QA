import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'teacher' | 'student';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  secretCode: string | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole, secretCode: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string, secretCode: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Generate a unique 2-3 word secret code
function generateSecretCode(): string {
  const adjectives = ['swift', 'bright', 'calm', 'bold', 'wise', 'keen', 'pure', 'true', 'clear', 'fresh', 'grand', 'prime', 'noble', 'royal', 'brave'];
  const nouns = ['eagle', 'tiger', 'river', 'storm', 'flame', 'frost', 'stone', 'cloud', 'ocean', 'forest', 'mountain', 'star', 'moon', 'sun', 'wind'];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(Math.random() * 100);
  return `${randomAdj}-${randomNoun}-${randomNum}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [secretCode, setSecretCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoleAndSecretCode(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setSecretCode(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoleAndSecretCode(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoleAndSecretCode = async (userId: string) => {
    try {
      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (!roleError && roleData) {
        setRole(roleData.role as AppRole);
      }

      // Fetch secret code from profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('secret_code')
        .eq('id', userId)
        .single();

      if (!profileError && profileData) {
        setSecretCode(profileData.secret_code);
      }
    } catch (error) {
      console.error('Error fetching role/secret code:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: AppRole, secretCode: string) => {
    // For teachers, generate a unique secret code
    // For students, they must provide a valid teacher's secret code
    let finalSecretCode = secretCode;
    
    if (role === 'teacher') {
      // Generate unique code for teacher
      finalSecretCode = generateSecretCode();
    } else {
      // For students, verify the teacher's secret code exists
      const { data: teacherProfile, error: teacherError } = await supabase
        .from('profiles')
        .select('id, secret_code')
        .eq('secret_code', secretCode)
        .single();

      if (teacherError || !teacherProfile) {
        return { error: new Error('Invalid teacher secret code. Please check with your teacher.') };
      }
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
          secret_code: finalSecretCode,
        },
      },
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    // Update the profile with the secret code after signup
    // Note: This will be handled by the trigger but we also need to update it
    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser) {
      await supabase
        .from('profiles')
        .update({ secret_code: finalSecretCode })
        .eq('id', newUser.id);
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string, secretCode: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    // After successful login, verify the secret code matches
    if (data.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('secret_code')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        await supabase.auth.signOut();
        return { error: new Error('Failed to verify secret code.') };
      }

      // Check if the secret code matches
      if (profileData.secret_code !== secretCode) {
        await supabase.auth.signOut();
        return { error: new Error('Invalid secret code.') };
      }

      setSecretCode(profileData.secret_code);
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setSecretCode(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, secretCode, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}