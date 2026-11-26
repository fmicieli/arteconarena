# Arte con Arena — sitio web

Sitio de **Marina Viviana López**, artista de Sand Art en vivo. One-page estática hecha con [Astro](https://astro.build), con CSS propio y sin frameworks de UI.

## Correrlo en local

Requiere Node 18.20.8 o superior (recomendado 22).

```bash
npm install
npm run dev        # http://localhost:4321 con recarga en vivo
npm run build      # genera el sitio en dist/
npm run preview    # sirve dist/ para revisar el build final
```

## Estructura

```
src/
  styles/tokens.css    ← design tokens (paleta, tipografía, espaciado, movimiento)
  styles/global.css    ← reset, utilidades, botones, animaciones
  data/site.ts         ← textos de SEO, palabras clave, servicios, mail y links de redes
  data/gallery.ts      ← fotos y videos de la galería (orden y textos alternativos)
  components/          ← una sección por archivo
  pages/               ← la home, sitemap.xml y robots.txt (se generan solos al compilar)
  assets/              ← imágenes originales (Astro genera AVIF/WebP responsive al compilar)
public/video/          ← videos ya comprimidos (720p, H.264, < 6 MB)
```

**Sumar una foto a la galería:** copiá el `.jpg` a `src/assets/portfolio/`, importalo en `src/data/gallery.ts` y agregá una línea con su `alt`.

**Sumar un video:** comprimilo antes de subirlo (nunca subas originales de 30 MB):

```bash
ffmpeg -i original.mp4 -vf scale=-2:720 -c:v libx264 -crf 27 -maxrate 1M -bufsize 2M \
  -c:a aac -b:a 96k -movflags +faststart public/video/nombre.mp4
```

## Publicación

Se publica en **https://arteconarena.com.ar** con GitHub Pages. Cada push a `main` compila y publica el sitio solo (`.github/workflows/deploy.yml`).

Cómo está armado:

| Pieza | Dónde | Qué hace |
|---|---|---|
| Dominio `arteconarena.com.ar` | **NIC Argentina** (titular: Marina Viviana López) | Se renueva ahí. Delegado a los DNS de Cloudflare: `camilo.ns.cloudflare.com` y `gene.ns.cloudflare.com` |
| DNS | **Cloudflare** (plan Free) | 4 registros `A` del dominio a GitHub Pages (185.199.108–111.153), `CNAME` de `www` a `fmicieli.github.io` y el `TXT` de verificación de Google Search Console. Todos en *DNS only* (nube gris) |
| Sitio | **GitHub Pages**, repo `fmicieli/arteconarena` | `public/CNAME` le indica el dominio. HTTPS lo emite GitHub |

Para publicar sin dominio propio (por ejemplo en `usuario.github.io/repo`), cargá en **Settings → Secrets and variables → Actions → Variables** `SITE_URL=https://usuario.github.io` y `BASE_PATH=/nombre-del-repo`, y borrá `public/CNAME`.

## SEO

- Título, descripción y palabras clave en `src/data/site.ts`.
- Datos estructurados (schema.org) en `src/layouts/Base.astro`: sitio, artista y servicios, con sus redes.
- `sitemap.xml` incluye las fotos de la galería para Google Imágenes; sus títulos salen del `alt` de cada foto en `src/data/gallery.ts`.
- Google Search Console: el dominio está verificado por el `TXT` en Cloudflare. Ahí se carga `https://arteconarena.com.ar/sitemap.xml`.

## Pendientes

Por ahora es una versión básica. Las mejoras de contenido se definen con Marina.
