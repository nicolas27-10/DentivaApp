import Stripe from 'stripe';

// Accedemos a la clave secreta desde las variables de entorno de Astro
const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY ?? '';

if (!stripeSecretKey) {
  console.warn("ADVERTENCIA: STRIPE_SECRET_KEY no está definida en las variables de entorno.");
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
});