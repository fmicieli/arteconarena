import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { gallery } from '../data/gallery';
import { site } from '../data/site';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Sitemap con la home y las fotos de la galería (sirve también para Google Imágenes). */
export const GET: APIRoute = async ({ site: origin }) => {
  const home = new URL(import.meta.env.BASE_URL, origin).href;
  const images = await Promise.all(
    gallery.map(async (item) => {
      // Misma variante que usa la galería, así no se generan archivos extra.
      const img = await getImage({ src: item.image, width: Math.min(1600, item.image.width), format: 'webp', quality: 82 });
      return { loc: new URL(img.src, origin).href, title: item.alt.replace(/^Video: /, '') };
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${esc(home)}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
${images.map((i) => `    <image:image><image:loc>${esc(i.loc)}</image:loc><image:title>${esc(`${i.title} · ${site.name}`)}</image:title></image:image>`).join('\n')}
  </url>
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
