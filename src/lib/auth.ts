/**
 * Auth utilities placeholder.
 * TODO: Supabase auth - implement signIn, signUp, signOut, getSession.
 * TODO: Protect dashboard/unit routes based on session.
 * TODO: Optional: role-based access, email verification flow.
 */

// import { supabase } from './supabaseClient';

// export async function signIn(email: string, password: string) {
//   const { data, error } = await supabase.auth.signInWithPassword({ email, password });
//   return { data, error };
// }

// export async function signUp(email: string, password: string, metadata?: { name?: string }) {
//   const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
//   return { data, error };
// }

// export async function signOut() {
//   return supabase.auth.signOut();
// }

// export async function getSession() {
//   const { data: { session } } = await supabase.auth.getSession();
//   return session;
// }
