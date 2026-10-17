// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://amangupta.me',
  trailingSlash: 'ignore',
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: { themes: { light: 'min-light', dark: 'min-dark' } },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
