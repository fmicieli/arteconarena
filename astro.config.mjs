// @ts-check
import { defineConfig } from 'astro/config';

// SITE_URL y BASE_PATH se pueden sobreescribir desde el workflow de GitHub Pages.
// - Con dominio propio (arteconarena.com.ar): SITE_URL=https://arteconarena.com.ar, BASE_PATH=/
// - Sin dominio: SITE_URL=https://<usuario>.github.io, BASE_PATH=/<repo>
export default defineConfig({
  site: process.env.SITE_URL || 'https://arteconarena.com.ar',
  base: process.env.BASE_PATH || '/',
  output: 'static',
  build: { inlineStylesheets: 'always' },
  image: { responsiveStyles: false },
});
