/**
 * Auth utilities
 * Actualizado para manejar sesiones seguras con Cookies (SSR)
 */

import { supabase } from './supabaseClient';

// 1. Modificamos signIn para recibir las cookies de Astro
export async function signIn(formData: FormData, cookies: any) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  console.log("Intentando signIn para:", email);
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // 🛑 AQUÍ ESTÁ LA MAGIA: Si el login es exitoso, guardamos la sesión en el navegador
  if (data.session) {
    // path: '/' asegura que la cookie esté disponible en toda la aplicación
    cookies.set('sb-access-token', data.session.access_token, { path: '/' });
    cookies.set('sb-refresh-token', data.session.refresh_token, { path: '/' });
  }

  return { data, error };
}

// 2. Modificamos signUp por si el usuario entra directo al registrarse
export async function signUp(
    email: string,
    password: string,
    metadata?: { name?: string },
    cookies?: any // Lo hacemos opcional por si lo llamas desde un lugar sin cookies
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: metadata?.name
        }
      }
    });
  
    if (error) {
      return { error };
    }
  
    const user = data.user;
  
    if (user) {
      // Guardar el perfil en tu tabla personalizada
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          username: metadata?.name ?? null
        });
  
      if (profileError) {
        return { error: profileError };
      }

      // Si Supabase devuelve sesión tras el registro, la guardamos
      if (data.session && cookies) {
        cookies.set('sb-access-token', data.session.access_token, { path: '/' });
        cookies.set('sb-refresh-token', data.session.refresh_token, { path: '/' });
      }
    }
  
    return { error: null };
  }

// 3. Modificamos signOut para que limpie las cookies
export async function signOut(cookies: any) {
  // Borramos la evidencia del navegador
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });
  
  // Cerramos sesión en Supabase
  return supabase.auth.signOut();
}

// 4. (Opcional) Una versión segura de getSession basada en cookies
export async function getSession(cookies: any) {
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (!accessToken || !refreshToken) return null;

    const { data, error } = await supabase.auth.getUser(accessToken.value);
    
    if (error || !data?.user) return null;
    
    return data.user;
}