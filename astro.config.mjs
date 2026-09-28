import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react'; // 👈 ¡El cambio está aquí! (astrojs en lugar de astro)
import sitemap from '@astrojs/sitemap';

// Rutas privadas/de auth: fuera del sitemap (también bloqueadas en public/robots.txt)
const sitemapExcluded = ['/login', '/register', '/dashboard', '/profile', '/admin'];

export default defineConfig({
  site: 'https://dentivaapp.de',
  integrations: [
    tailwind(),
    react(),
    sitemap({
      filter: (page) => !sitemapExcluded.includes(new URL(page).pathname.replace(/\/$/, '')),
      // Sin slash final, para coincidir con el canonical de MainLayout (/agb, no /agb/)
      serialize: (item) => {
        const url = new URL(item.url);
        if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/$/, '');
        return { ...item, url: url.href };
      },
    }),
  ],
  devToolbar: {
    enabled: false,
  },
  output: 'server',
  adapter: netlify(),
});