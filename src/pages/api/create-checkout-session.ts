import { stripe } from "../../lib/stripeClient";
import { supabase } from "../../lib/supabaseClient";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { priceId } = await request.json();

    // 1. Validar sesión del usuario directamente en el servidor
    // Esto evita que alguien intente pagar sin estar logueado
    const authHeader = request.headers.get("Authorization");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Debes iniciar sesión para suscribirte" }), { status: 401 });
    }

    // 2. Crear la sesión de Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      // Usamos variables de entorno para las URLs o fallback a localhost
      success_url: `${import.meta.env.SITE || 'http://localhost:4321'}/dashboard?success=true`,
      cancel_url: `${import.meta.env.SITE || 'http://localhost:4321'}/pricing?canceled=true`,
      customer_email: user.email,
      client_reference_id: user.id, 
      subscription_data: {
        metadata: { 
          supabaseUUID: user.id 
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (error: any) {
    console.error("Stripe Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};