import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, onAuthStateChange, signIn, signUp, signOut, isSupabaseConfigured } from '../services/supabase';

// Create Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        // Check if Supabase is configured
        const configured = isSupabaseConfigured();
        setIsConfigured(configured);

        if (!configured) {
            console.warn('Supabase not configured. Auth features will be disabled.');
            setLoading(false);
            return;
        }

        // Get initial user
        getCurrentUser().then((user) => {
            setUser(user);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Auth methods
    const handleSignUp = async (email, password, username) => {
        const data = await signUp(email, password, username);
        return data;
    };

    const handleSignIn = async (email, password) => {
        const data = await signIn(email, password);
        setUser(data.user);
        return data;
    };

    const handleSignOut = async () => {
        await signOut();
        setUser(null);
    };

    const value = {
        user,
        loading,
        isConfigured,
        isAuthenticated: !!user,
        signUp: handleSignUp,
        signIn: handleSignIn,
        signOut: handleSignOut
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook to use auth context
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
