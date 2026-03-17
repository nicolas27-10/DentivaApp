/**
 * Auth utilities placeholder.
 * TODO: Supabase auth - implement signIn, signUp, signOut, getSession.
 * TODO: Protect dashboard/unit routes based on session.
 * TODO: Optional: role-based access, email verification flow.
 */

import { supabase } from './supabaseClient';

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  console.log("signIn", email)
  console.log("signIn", password)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signUp(
    email: string,
    password: string,
    metadata?: { name?: string }
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: metadata?.name
        }
      }
    })
  
    if (error) {
      return { error }
    }
  
    const user = data.user
  
    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          username: metadata?.name ?? null
        })
  
      if (profileError) {
        return { error: profileError }
      }
    }
  
    return { error: null }
  }

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session;
  }
