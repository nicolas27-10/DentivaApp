import type { APIRoute } from "astro";
import { stripe } from "@/lib/stripeClient";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "");

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), { 
        status: 401, headers: { "Content-Type": "application/json" } 
      });
    }

    // 1. Creamos el cliente seguro con las credenciales
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Faltan las credenciales de Supabase");
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    // 2. Validamos el usuario
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), { 
        status: 401, headers: { "Content-Type": "application/json" } 
      });
    }

    // 3. Buscamos el ID del cliente de Stripe en Supabase
    const { data: profile, error: profileError } = await supabaseAuth
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "Kein Stripe-Kunde für dieses Konto gefunden" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Construimos la URL de retorno de forma dinámica y a prueba de fallos
    const requestUrl = new URL(request.url);
    const returnUrl = `${requestUrl.origin}/profile`;

    // 5. Creamos la sesión del Portal de Stripe
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    // 6. Enviamos la URL al frontend
    return new Response(JSON.stringify({ url: portalSession.url }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Stripe Portal Error:", error);
    return new Response(
      JSON.stringify({ error: "Portal-Link konnte nicht erstellt werden" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};