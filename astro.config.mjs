import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

export default defineConfig({
  integrations: [tailwind()],
  devToolbar: {
    enabled: false,
  },
  output: 'server',
  adapter: netlify(),
});
