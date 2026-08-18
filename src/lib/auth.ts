/**
 * Auth utilities
 * Actualizado para manejar sesiones seguras con Cookies (SSR)
 */

import { supabase } from './supabaseClient';

// 1. Modificamos signIn para recibir las cookies de Astro
export async function signIn(formData: FormData, cookies: any) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  console.log('Intentando signIn para:', email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // 🛑 Guardamos la sesión en el navegador si el login es exitoso
  if (data.session) {
    cookies.set('sb-access-token', data.session.access_token, { path: '/' });
    cookies.set('sb-refresh-token', data.session.refresh_token, { path: '/' });
  }

  return { data, error };
}

// 2. Modificamos signUp para registrar usuario y detectar correos duplicados
export async function signUp(
  email: string,
  password: string,
  metadata?: { first_name?: string; last_name?: string; nationality?: string },
  cookies?: any // Agregamos el parámetro cookies aquí
) {
  // 1. Declaramos data y error en el alcance principal de la función
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: metadata?.first_name ?? null,
        last_name: metadata?.last_name ?? null,
        nationality: metadata?.nationality ?? null,
      },
    },
  });

  // 2. Manejo de errores devueltos por Supabase
  if (error) {
    if (error.message.includes('already registered') || error.status === 422) {
      return { error: { message: 'Diese E-Mail-Adresse wird bereits verwendet. Bitte logge dich ein.' } };
    }
    return { error };
  }

  // 3. Detección de correos duplicados oculta (identities vacío)
  if (data?.user?.identities && data.user.identities.length === 0) {
    return { error: { message: 'Diese E-Mail-Adresse wird bereits verwendet. Bitte logge dich ein.' } };
  }

  // 4. Si Supabase devuelve sesión tras el registro (ej: cuando la confirmación de email está apagada), la guardamos
  if (data?.session && cookies) {
    cookies.set('sb-access-token', data.session.access_token, { path: '/' });
    cookies.set('sb-refresh-token', data.session.refresh_token, { path: '/' });
  }

  // Si todo salió bien, devolvemos null en el error
  return { error: null };
}

// 3. Modificamos signOut para que limpie las cookies
export async function signOut(cookies: any) {
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });

  return supabase.auth.signOut();
}

// 4. Versión segura de getSession basada en cookies
export async function getSession(cookies: any) {
  const accessToken = cookies.get('sb-access-token');
  const refreshToken = cookies.get('sb-refresh-token');

  if (!accessToken || !refreshToken) return null;

  const { data, error } = await supabase.auth.getUser(accessToken.value);

  if (error || !data?.user) return null;

  return data.user;
}