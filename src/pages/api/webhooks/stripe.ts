import { stripe } from "../../../lib/stripeClient";
import { supabase } from "../../../lib/supabaseClient";
import type { APIRoute } from "astro";

// Evitamos que Astro intente renderizar esto como HTML
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return new Response("Configuración de webhook faltante", { status: 400 });
  }

  const payload = await request.text();
  let event;

  try {
    // Verificamos que la petición sea auténtica de Stripe
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error de firma de Webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Manejamos el evento de pago exitoso
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const supabaseUserId = session.client_reference_id; // El ID que enviamos en el checkout

    if (supabaseUserId) {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_premium: true,
          stripe_customer_id: session.customer 
        })
        .eq("id", supabaseUserId);

      if (error) {
        console.error("Error actualizando perfil en Supabase:", error);
        return new Response("Error DB", { status: 500 });
      }
      
      console.log(`✅ Usuario ${supabaseUserId} ahora es Premium`);
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};