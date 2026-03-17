/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#4AAED9', // Color primario - Azul cielo medio
        background: '#EEF7FD', // Fondo principal - Azul cielo muy claro
        card: '#FFFFFF', // Fondo tarjetas - Blanco
        accent: '#F07830', // Acento / CTA - Naranja cálido
        accentSecondary: '#B8A0E8', // Acento secundario - Lila suave
        textMain: '#1A1A2E', // Texto principal - Negro suave
        success: '#2ECC8A', // Éxito - Verde menta
        error: '#E84F4F', // Error - Rojo suave
        border: '#C8E8F5', // Bordes - Azul muy claro
      },
    },
  },
  plugins: [],
};
