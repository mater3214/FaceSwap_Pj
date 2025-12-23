import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// You need to set these environment variables in .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseAnonKey && 
         supabaseUrl !== '' && 
         supabaseAnonKey !== '';
};

// Create Supabase client (only if configured)
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Auth functions
export const signUp = async (email, password, username = '') => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env file.');
  }
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username || email.split('@')[0]
      }
    }
  });
  
  if (error) throw error;
  return data;
};

export const signIn = async (email, password) => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env file.');
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }
  
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  if (!supabase) return null;
  
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const onAuthStateChange = (callback) => {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  
  return supabase.auth.onAuthStateChange(callback);
};

export default supabase;
