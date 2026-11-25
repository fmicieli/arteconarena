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
  data/site.ts         ← textos de SEO, teléfono, mail y links de redes
  data/gallery.ts      ← fotos y videos de la galería (orden y textos alternativos)
  components/          ← una sección por archivo
  assets/              ← imágenes originales (Astro genera AVIF/WebP responsive al compilar)
public/video/          ← videos ya comprimidos (720p, H.264, < 6 MB)
```

**Sumar una foto a la galería:** copiá el `.jpg` a `src/assets/portfolio/`, importalo en `src/data/gallery.ts` y agregá una línea con su `alt`.

**Sumar un video:** comprimilo antes de subirlo (nunca subas originales de 30 MB):

```bash
ffmpeg -i original.mp4 -vf scale=-2:720 -c:v libx264 -crf 27 -maxrate 1M -bufsize 2M \
  -c:a aac -b:a 96k -movflags +faststart public/video/nombre.mp4
```

## Publicar en GitHub Pages

1. Subí el repo a GitHub (rama `main`).
2. En **Settings → Pages**, elegí **Source: GitHub Actions**.
3. Cada push a `main` compila y publica el sitio automáticamente (`.github/workflows/deploy.yml`).

**Dirección del sitio** (en **Settings → Secrets and variables → Actions → Variables**):

| Caso | `SITE_URL` | `BASE_PATH` |
|---|---|---|
| Dominio propio `arteconarena.com.ar` | *(no hace falta)* | *(no hace falta)* |
| Sin dominio (`usuario.github.io/repo`) | `https://usuario.github.io` | `/nombre-del-repo` |

Para el dominio propio: creá `public/CNAME` con el texto `arteconarena.com.ar`, cargá el dominio en **Settings → Pages → Custom domain** y en el DNS del dominio apuntá los registros `A` a las IPs de GitHub Pages (185.199.108.153, .109.153, .110.153, .111.153), o bien un `CNAME` de `www` a `usuario.github.io`.

## Pendientes

Buscá `TODO(clienta)` en el código: son datos a confirmar con Marina.
