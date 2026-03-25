import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react'; // 👈 ¡El cambio está aquí! (astrojs en lugar de astro)

export default defineConfig({
  integrations: [tailwind(), react()],
  devToolbar: {
    enabled: false,
  },
  output: 'server',
  adapter: netlify(),
});