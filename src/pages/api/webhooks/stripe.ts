import { stripe } from "../../../lib/stripeClient";
import { createClient } from "@supabase/supabase-js"; // 👈 Importamos createClient directamente
import type { APIRoute } from "astro";

export const prerender = false;

// 1. Creamos un cliente de Supabase con poderes de Administrador (salta el RLS)
const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY // 👈 Usamos la llave maestra
);

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return new Response("Configuración de webhook faltante", { status: 400 });
  }

  const payload = await request.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error de firma de Webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // --- MANEJO DE EVENTOS ---

  // A) Evento de pago exitoso (Nueva suscripción)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const supabaseUserId = session.client_reference_id; 

    if (supabaseUserId) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ 
          is_premium: true,
          stripe_customer_id: session.customer 
        })
        .eq("id", supabaseUserId);

      if (error) {
        console.error("❌ Error actualizando perfil en Supabase:", error);
        return new Response("Error DB", { status: 500 });
      }
      
      console.log(`✅ Usuario ${supabaseUserId} ahora es Premium`);
    } else {
      console.log("⚠️ No se encontró client_reference_id en la sesión de Stripe.");
    }
  } 
  
  // B) Evento de cancelación de suscripción (Fin del periodo)
  else if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as any;
    const stripeCustomerId = subscription.customer; // Ej: cus_N12345...

    if (stripeCustomerId) {
      // Buscamos al usuario por su ID de Stripe y le quitamos el Premium
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_premium: false })
        .eq("stripe_customer_id", stripeCustomerId);

      if (error) {
        console.error("❌ Error quitando premium en Supabase:", error);
        return new Response("Error DB", { status: 500 });
      }
      
      console.log(`📉 Suscripción finalizada para el cliente Stripe: ${stripeCustomerId}`);
    }
  }

  // Responder a Stripe que recibimos el evento correctamente
  return new Response(JSON.stringify({ received: true }), { status: 200 });
};