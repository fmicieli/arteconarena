/**
 * Relato en arena (prueba interna).
 *
 * Cómo funciona:
 * 1. Cada escena se dibuja en un canvas oculto en escala de grises = luz que atraviesa la arena
 *    (blanco = vidrio limpio, negro = arena espesa), igual que en la mesa de luz.
 * 2. Un shader WebGL convierte esa imagen en arena: grano, bordes irregulares, luz cálida al centro
 *    y el borde oscuro de la mesa, con la paleta del sitio.
 * 3. El scroll elige el capítulo y el capítulo se dibuja solo hasta terminar, con la mano de Marina
 *    (a contraluz) haciendo cada gesto: verter, trazar, rellenar, barrer, escribir.
 */

type Seg = readonly [number, number];
/** Pose de la mano: puño que vierte, índice que dibuja o mano abierta que barre. */
export type Pose = 'fist' | 'point' | 'flat';
export type Hand = { x: number; y: number; a: number; pose: Pose };

/** Tamaño del dibujo: 960×640 en pantallas horizontales, 640×960 en el celular en vertical. */
export let W = 960;
export let H = 640;
let PORTRAIT = false;
export function setOrientation(portrait: boolean) {
  PORTRAIT = portrait;
  W = portrait ? 640 : 960;
  H = portrait ? 960 : 640;
}

/** Línea de tiempo: qué gesto ocurre en qué tramo del scroll (0 → 1). */
const TL = {
  pour: [0.03, 0.2],
  ground: [0.08, 0.27],
  hills: [0.28, 0.36],
  sky: [0.32, 0.4],
  river: [0.38, 0.46],
  moon: [0.44, 0.51],
  tree: [0.49, 0.56],
  person: [0.55, 0.62],
  sweep: [0.68, 0.84],
  curtains: [0.8, 0.9],
  text: [0.9, 0.985],
} as const satisfies Record<string, Seg>;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p: number, [a, b]: Seg) => clamp((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Gris según cuánta luz pasa: 0 = arena espesa, 1 = vidrio limpio. */
const g = (t: number) => {
  const v = Math.round(clamp(t) * 255);
  return `rgb(${v},${v},${v})`;
};
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const horizonY = (x: number) => H * 0.56 + Math.sin(x * 0.011) * 6 + Math.sin(x * 0.031 + 1) * 3;

/** Granos que caen del puñado: posiciones fijas por semilla, así el scroll puede ir y volver. */
const GRAINS = (() => {
  const r = rng(7);
  return Array.from({ length: 900 }, (_, i) => ({
    t: lerp(TL.pour[0], TL.pour[1] - 0.03, i / 900 + (r() - 0.5) * 0.004),
    dx: (r() - 0.5) * 2,
    y0: 70 + r() * 10,
    land: r(),
  }));
})();

/** Bordes del montículo que empuja la mano al barrer: irregularidad fija. */
const RIDGE = (() => {
  const r = rng(21);
  // Más granos cerca del frente y algunos sueltos que salen despedidos hacia adelante.
  return Array.from({ length: 1400 }, () => ({ a: r(), off: -6 + r() ** 2.2 * 46, s: 0.8 + r() * 2.6 }));
})();

function newCanvas() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}

/* ---------------- Escena 1 y 2: el paisaje ---------------- */

function drawLandscape(ctx: CanvasRenderingContext2D, p: number, hand: Hand | null) {
  const set = (x: number, y: number, active: boolean, pose: Pose = 'point') => {
    if (hand && active) Object.assign(hand, { x, y, a: 1, pose });
  };
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Cielo: una capa fina de arena, más espesa arriba, con nubes "abiertas" con el costado de la mano.
  const sky = ease(seg(p, TL.sky));
  if (sky > 0) {
    const gr = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    gr.addColorStop(0, g(0.4));
    gr.addColorStop(0.65, g(0.76));
    gr.addColorStop(1, g(0.93));
    ctx.globalAlpha = sky;
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H * 0.62);
    ctx.strokeStyle = g(0.9);
    ctx.lineWidth = 9;
    for (const [fx, fy, w] of [[0.09, 0.19, 220], [0.34, 0.11, 160], [0.54, 0.23, 120], [0.8, 0.14, 150]] as const) {
      const x = W * fx - (PORTRAIT ? 40 : 0), y = H * fy * (PORTRAIT ? 0.8 : 1);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + w / 2, y - 16, x + w, y + 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    set(W * (0.15 + 0.7 * sky), H * 0.12 + Math.sin(sky * 9) * 30, sky < 1, 'flat');
  }

  // Luna: se traza el contorno con el dedo y después se limpia el interior.
  const moon = seg(p, TL.moon);
  if (moon > 0) {
    const mx = W * 0.72, my = H * (PORTRAIT ? 0.2 : 0.21), mr = Math.min(W, H) * 0.087;
    const ring = ease(clamp(moon * 1.8));
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(mx, my, mr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring);
    ctx.stroke();
    const fill = ease(clamp((moon - 0.45) / 0.55));
    if (fill > 0) {
      ctx.globalAlpha = fill;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const ang = -Math.PI / 2 + Math.PI * 2 * ring;
    set(mx + Math.cos(ang) * mr, my + Math.sin(ang) * mr, moon < 1);
  }

  // Sierras: silueta oscura que se va agregando de izquierda a derecha.
  const hills = ease(seg(p, TL.hills));
  if (hills > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W * hills, H);
    ctx.clip();
    ctx.fillStyle = g(0.32);
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      const y = horizonY(x) - (34 + 52 * Math.max(0, Math.sin(x * 0.0062 + 0.4)) + 14 * Math.sin(x * 0.021));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.fill();
    ctx.restore();
    set(W * hills, horizonY(W * hills) - 60, hills < 1, 'fist');
  }

  // Suelo: la arena vertida forma un montículo que se aplana hasta ser el horizonte.
  const pour = seg(p, TL.pour);
  const ground = ease(seg(p, TL.ground));
  const amount = clamp(Math.max(ground, pour * 0.4) * 1.1);
  if (amount > 0) {
    const cx = W * 0.5;
    const r = W * (0.1 + 0.8 * Math.max(ground, pour * 0.2));
    const flat = 2 + ground * 10;
    ctx.fillStyle = g(0.1);
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 5) {
      const d = Math.abs(x - cx) / r;
      const shape = d < 1 ? 1 - d ** flat : 0;
      const top = lerp(H + 4, horizonY(x), amount * shape) + Math.sin(x * 0.37) * 1.5;
      ctx.lineTo(x, top);
    }
    ctx.lineTo(W, H);
    ctx.fill();
    // Textura: zonas donde la mano dejó la capa un poco más fina.
    if (ground > 0.6) {
      ctx.globalAlpha = (ground - 0.6) / 0.4;
      ctx.strokeStyle = g(0.15);
      ctx.lineWidth = 12;
      for (const [fx, y, w] of [[0.06, 0.7, 180], [0.4, 0.66, 140], [0.73, 0.75, 200], [0.21, 0.88, 160], [0.65, 0.92, 220]] as const) {
        const x = W * fx;
        ctx.beginPath();
        ctx.moveTo(x, H * y);
        ctx.quadraticCurveTo(x + w / 2, H * y - 10, x + w, H * y + 6);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  // Río: se limpia la arena con el dedo, serpenteando desde el horizonte hacia adelante.
  const river = ease(seg(p, TL.river));
  if (river > 0) {
    const top = horizonY(W * 0.5);
    // Centro y ancho del río según la altura: curva en S que se abre hacia el espectador.
    const at = (y: number) => {
      const k = clamp((y - top) / (H - top));
      return { x: W * (0.5 + Math.sin(k * 3.4 + 0.2) * 0.07 - k * 0.12), w: lerp(6, W * 0.3, k ** 1.6) };
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, top + (H - top) * river + 2);
    ctx.clip();
    ctx.fillStyle = g(0.95);
    ctx.beginPath();
    for (let y = top; y <= H + 4; y += 4) { const c = at(y); ctx.lineTo(c.x - c.w / 2, y); }
    for (let y = H + 4; y >= top; y -= 4) { const c = at(y); ctx.lineTo(c.x + c.w / 2, y); }
    ctx.closePath();
    ctx.fill();
    // Ondas del agua y reflejo de la luna: líneas finas de arena dentro del río.
    ctx.strokeStyle = g(0.55);
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const y = top + 14 + i * i * 3.4;
      const c = at(y);
      ctx.beginPath();
      ctx.moveTo(c.x - c.w * 0.3, y);
      ctx.lineTo(c.x + c.w * (0.05 + (i % 3) * 0.08), y);
      ctx.stroke();
    }
    // Pasto: rayas claras hechas con la uña sobre el suelo.
    ctx.strokeStyle = g(0.7);
    ctx.lineWidth = 2.5;
    const r = rng(3);
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = lerp(H * 0.66, H * 0.97, r());
      const c = at(y);
      if (Math.abs(x + 20 - c.x) < c.w / 2 + 30) continue;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 10, y - 6, x + 26 + r() * 20, y - 2);
      ctx.stroke();
    }
    ctx.restore();
    set(W * 0.5, top + (H - top) * river, river < 1);
  }

  // Árbol: crece de abajo hacia arriba, oscuro, con borde raspado claro.
  const tree = ease(seg(p, TL.tree));
  if (tree > 0) {
    const base = H * 0.86;
    const tx = Math.max(W * 0.13, 130), fy = H * (PORTRAIT ? 0.3 : 0.25);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, base - (base - fy + 120) * tree - 40, tx + 200, H);
    ctx.clip();
    ctx.fillStyle = g(0.03);
    ctx.beginPath();
    ctx.moveTo(tx - 19, base);
    ctx.quadraticCurveTo(tx - 5, (base + fy) / 2, tx - 29, fy + 70);
    ctx.lineTo(tx + 5, fy + 70);
    ctx.quadraticCurveTo(tx + 19, (base + fy) / 2, tx + 29, base);
    ctx.fill();
    // Copa: muchos toques de arena de distinto tamaño, como los deja la yema del dedo.
    const tr = rng(11);
    for (let i = 0; i < 70; i++) {
      const a = tr() * Math.PI * 2, d = Math.sqrt(tr());
      const x = tx + Math.cos(a) * d * 120, y = fy + Math.sin(a) * d * 85;
      ctx.beginPath();
      ctx.arc(x, y, 12 + tr() * 26, 0, Math.PI * 2);
      ctx.fill();
    }
    // Ramas que asoman del tronco.
    ctx.strokeStyle = g(0.03);
    ctx.lineWidth = 7;
    for (const [dx, dy] of [[-70, -40], [60, -55], [-30, -90]] as const) {
      ctx.beginPath();
      ctx.moveTo(tx - 5, fy + 122);
      ctx.quadraticCurveTo(tx - 5 + dx * 0.4, fy + 122 + dy * 0.7, tx - 5 + dx, fy + 122 + dy);
      ctx.stroke();
    }
    ctx.strokeStyle = g(0.55);
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(tx - 48 + i * 21, fy - 19 + (i % 3) * 32, 22, 3.6, 5.6);
      ctx.stroke();
    }
    ctx.restore();
    set(tx, base - (base - fy + 90) * tree, tree < 1, 'fist');
  }

  // Persona mirando la luna, de espaldas: arena que se va agregando (aparece de a poco).
  const person = ease(seg(p, TL.person));
  if (person > 0) {
    // Grande y en primer plano: la cabeza y los hombros recortados contra el cielo claro.
    const x = W * 0.76, foot = H * 0.98, h = H * 0.6;
    ctx.globalAlpha = person;
    ctx.fillStyle = g(0.02);
    ctx.beginPath();
    ctx.ellipse(x, foot - h * 0.9, h * 0.075, h * 0.088, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - h * 0.03, foot - h * 0.82);
    ctx.lineTo(x - h * 0.05, foot - h * 0.77);
    ctx.bezierCurveTo(x - h * 0.17, foot - h * 0.76, x - h * 0.19, foot - h * 0.7, x - h * 0.17, foot - h * 0.56);
    ctx.lineTo(x - h * 0.14, foot - h * 0.3);
    ctx.lineTo(x - h * 0.11, foot);
    ctx.lineTo(x + h * 0.13, foot);
    ctx.lineTo(x + h * 0.16, foot - h * 0.3);
    ctx.lineTo(x + h * 0.18, foot - h * 0.56);
    ctx.bezierCurveTo(x + h * 0.2, foot - h * 0.7, x + h * 0.17, foot - h * 0.76, x + h * 0.05, foot - h * 0.77);
    ctx.lineTo(x + h * 0.03, foot - h * 0.82);
    ctx.closePath();
    ctx.fill();
    // Contorno raspado: la línea clara que separa la figura del fondo.
    ctx.strokeStyle = g(0.8);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    set(x, foot - h * person, person < 1, 'fist');
  }
}

/* ---------------- Escena 3: la ventana ---------------- */

function drawWindow(ctx: CanvasRenderingContext2D, land: HTMLCanvasElement, p: number, hand: Hand) {
  ctx.fillStyle = g(0.1);
  ctx.fillRect(0, 0, W, H);
  // Arena espesa con remolinos suaves.
  ctx.strokeStyle = g(0.2);
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(W * (0.1 + i * 0.17), H * (0.15 + (i % 2) * 0.7), 70 + i * 6, 0.3 + i, 2.2 + i);
    ctx.stroke();
  }
  const ow = W * (PORTRAIT ? 0.62 : 0.56), oh = ow * (H / W);
  const ox = (W - ow) / 2, oy = H * 0.44 - oh / 2;
  ctx.drawImage(land, ox, oy, ow, oh);
  // Marco raspado con el dedo y alféizar.
  ctx.strokeStyle = g(0.92);
  ctx.lineWidth = 6;
  ctx.strokeRect(ox - 8, oy - 8, ow + 16, oh + 16);
  ctx.lineWidth = 3;
  ctx.strokeRect(ox - 20, oy - 20, ow + 40, oh + 40);
  ctx.fillStyle = g(0.86);
  ctx.fillRect(ox - 52, oy + oh + 26, ow + 104, 16);

  // Cortinas: caen desde arriba, claras, con pliegues de arena.
  const cu = ease(seg(p, TL.curtains));
  if (cu > 0) {
    const ch = (oh + 46) * cu;
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? ox - 64 : ox + ow - 50;
      const cw = 114;
      ctx.fillStyle = g(0.84);
      ctx.beginPath();
      ctx.moveTo(x0, oy - 26);
      ctx.lineTo(x0 + cw, oy - 26);
      for (let i = 0; i <= 6; i++) {
        const xx = x0 + cw - (cw / 6) * i;
        ctx.lineTo(xx, oy - 26 + ch + (i % 2 ? 10 : 0) * cu);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = g(0.38);
      ctx.lineWidth = 4;
      for (let k = 1; k < 4; k++) {
        const fx = x0 + (cw / 4) * k;
        ctx.beginPath();
        ctx.moveTo(fx, oy - 20);
        ctx.bezierCurveTo(fx + 8, oy + ch * 0.3, fx - 8, oy + ch * 0.6, fx + 2, oy - 30 + ch);
        ctx.stroke();
      }
    }
    if (cu < 1) Object.assign(hand, { x: ox + ow + 20, y: oy - 26 + (oh + 46) * cu, a: 1, pose: 'point' });
  }

  // "Esta historia continuará…", escrito con el dedo como en sus videos.
  const tx = seg(p, TL.text);
  if (tx > 0) {
    const s = 'Esta historia continuará…';
    ctx.font = '500 46px Caveat, cursive';
    const tw = ctx.measureText(s).width;
    const x = (W - tw) / 2, y = H * 0.955;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 6, y - 52, (tw + 12) * tx, 72);
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.fillText(s, x, y);
    ctx.restore();
    if (tx < 1) Object.assign(hand, { x: x + tw * tx, y: y - 14, a: 1, pose: 'point' });
  }
}

/* ---------------- Composición ---------------- */

class Scene {
  out = newCanvas();
  private a = newCanvas();
  private b = newCanvas();
  private landFull: HTMLCanvasElement | null = null;

  render(p: number): Hand {
    const hand: Hand = { x: W / 2, y: H / 2, a: 0, pose: 'point' };
    const ctx = this.out.getContext('2d')!;
    const actx = this.a.getContext('2d')!;
    drawLandscape(actx, p, hand);
    ctx.drawImage(this.a, 0, 0);

    const sw = ease(seg(p, TL.sweep));
    if (sw > 0) {
      if (!this.landFull) {
        this.landFull = newCanvas();
        drawLandscape(this.landFull.getContext('2d')!, TL.person[1], null);
      }
      drawWindow(this.b.getContext('2d')!, this.landFull, p, hand);
      // Barrido en arco: la mano gira desde abajo a la izquierda y deja la escena nueva detrás.
      const cx = -W * 0.25, cy = H * 1.35;
      const R = lerp(H * 0.35, Math.hypot(W * 1.25, H * 1.35) + 60, sw);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.b, 0, 0);
      ctx.restore();
      if (sw < 1) {
        // Arena empujada: un cordón oscuro e irregular en el frente del barrido.
        // Bandas suaves superpuestas = un cordón de arena con volumen, más espeso al frente.
        for (const [off, lw, t] of [[4, 30, 0.22], [8, 18, 0.1], [10, 8, 0.04]] as const) {
          ctx.strokeStyle = g(t);
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.arc(cx, cy, R + off, -1.52, -0.03);
          ctx.stroke();
        }
        ctx.fillStyle = g(0.06);
        for (const d of RIDGE) {
          const ang = lerp(0.03, 1.52, d.a);
          const rr = R + d.off;
          ctx.fillRect(cx + Math.cos(ang) * rr, cy - Math.sin(ang) * rr, d.s, d.s);
        }
        // La mano va en la parte visible del arco (a mitad del tramo que cruza la mesa).
        const vis: number[] = [];
        for (let a = 0.03; a < 1.53; a += 0.02) {
          const px = cx + Math.cos(a) * R, py = cy - Math.sin(a) * R;
          if (px > 40 && px < W - 40 && py > 40 && py < H - 40) vis.push(a);
        }
        if (vis.length) {
          const ang = vis[Math.floor(vis.length * 0.55)];
          Object.assign(hand, { x: cx + Math.cos(ang) * (R + 10), y: cy - Math.sin(ang) * (R + 10), a: 1, pose: 'flat' });
        }
      }
    }

    // Granos cayendo del puñado.
    const pour = seg(p, TL.pour);
    if (pour > 0 && pour < 1) {
      const fd = 0.03;
      const surface = lerp(H * 0.97, H * 0.72, pour);
      ctx.fillStyle = g(0.12);
      for (const gr of GRAINS) {
        const t = (p - gr.t) / fd;
        if (t <= 0 || t >= 1) continue;
        const y = lerp(gr.y0, surface - gr.land * 30, t * t);
        const x = W / 2 + gr.dx * (8 + (y / H) * 26);
        ctx.fillRect(x, y, 2.2, 2.2);
      }
      Object.assign(hand, { x: W / 2, y: 66, a: 1, pose: 'fist' });
    }
    return hand;
  }
}

/* ---------------- Mesa a pantalla completa ---------------- */

/** Dónde va el dibujo dentro de la pantalla; el resto es la franja de arena espesa. */
export type Box = { x: number; y: number; w: number; h: number };

export function layoutBox(vw: number, vh: number): Box {
  let w: number, h: number;
  if (vh > vw) {
    // Celular en vertical: el área de dibujo también es vertical (2:3).
    w = vw * 0.88;
    h = w * 1.5;
    if (h > vh * 0.72) {
      h = vh * 0.72;
      w = h / 1.5;
    }
  } else {
    h = vh * 0.76;
    w = h * 1.5;
    if (w > vw * 0.8) {
      w = vw * 0.8;
      h = w / 1.5;
    }
  }
  return { x: (vw - w) / 2, y: vh * (vh > vw ? 0.46 : 0.5) - h / 2, w, h };
}

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `
precision highp float;
uniform sampler2D uTex; uniform vec2 uRes; uniform vec4 uBox; // x0, y0, x1, y1 en píxeles (y desde abajo)
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
vec3 ramp(float t){
  vec3 c0 = vec3(.141, .110, .098), c1 = vec3(.275, .208, .180), c2 = vec3(.541, .369, .314), c3 = vec3(.827, .698, .655), c4 = vec3(1., .988, .973);
  if (t < .3) return mix(c0, c1, t / .3);
  if (t < .55) return mix(c1, c2, (t - .3) / .25);
  if (t < .8) return mix(c2, c3, (t - .55) / .25);
  return mix(c3, c4, (t - .8) / .2);
}
void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 bs = uBox.zw - uBox.xy;
  float s = max(min(bs.x, bs.y) / 640., .5);
  vec2 d = vec2(noise(fc * .22 / s), noise(fc * .22 / s + 19.7)) - .5;
  vec2 buv = (fc + d * 3.2 * s - uBox.xy) / bs;
  float t = texture2D(uTex, clamp(buv, .001, .999)).r;
  // Franja de arena alrededor del dibujo: espesa, despareja, con un borde irregular hacia adentro.
  vec2 q = max(uBox.xy - fc, fc - uBox.zw);
  float dist = max(q.x, q.y);
  float rag = (noise(fc * .01 / s) - .5) * 46. * s + (noise(fc * .045 / s) - .5) * 14. * s;
  float band = smoothstep(-26. * s, 14. * s, dist + rag);
  float tb = .03 + noise(fc * .006 / s) * .14 + noise(fc * .025 / s) * .07;
  t = mix(t, tb, band);
  float clump = noise(fc * .03 / s) * .6 + noise(fc * .1 / s) * .4;
  float mid = 1. - abs(t * 2. - 1.);
  float tt = clamp(t + (clump - .5) * (.12 + .2 * mid), 0., 1.);
  float grain = hash(floor(fc / max(1., s * .9)));
  float speck = smoothstep(grain - .32, grain + .32, tt);
  float trans = mix(tt, speck, .42);
  // Luz de la mesa: más intensa en el centro del dibujo.
  vec2 c = (fc - (uBox.xy + bs * .5)) / bs.x;
  float vig = 1.1 - dot(c, c) * 1.3;
  vec3 col = ramp(clamp(trans * vig, 0., 1.));
  col += vec3(1., .86, .72) * pow(trans, 3.) * .07 * vig;
  gl_FragColor = vec4(col, 1.);
}`;

class Renderer {
  box: Box = { x: 0, y: 0, w: 1, h: 1 };
  private gl: WebGLRenderingContext | null;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private uRes: WebGLUniformLocation | null = null;
  private uBox: WebGLUniformLocation | null = null;
  private scene: Scene | null = null;
  private portrait: boolean | null = null;
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!this.gl) {
      this.ctx2d = canvas.getContext('2d');
      return;
    }
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.uRes = gl.getUniformLocation(prog, 'uRes');
    this.uBox = gl.getUniformLocation(prog, 'uBox');
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
    this.box = layoutBox(r.width, r.height);
    const portrait = r.height > r.width;
    if (portrait !== this.portrait) {
      this.portrait = portrait;
      setOrientation(portrait);
      this.scene = new Scene();
    }
  }

  draw(p: number): Hand {
    const scene = this.scene!;
    const hand = scene.render(p);
    const { gl, dpr, box } = this;
    if (gl) {
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene.out);
      gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
      const y0 = this.canvas.height - (box.y + box.h) * dpr;
      gl.uniform4f(this.uBox, box.x * dpr, y0, (box.x + box.w) * dpr, y0 + box.h * dpr);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else if (this.ctx2d) {
      const c = this.ctx2d;
      c.fillStyle = '#241C19';
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      c.filter = 'sepia(.7) contrast(1.1)';
      c.drawImage(scene.out, box.x * dpr, box.y * dpr, box.w * dpr, box.h * dpr);
      c.filter = 'none';
    }
    return hand;
  }
}

/* ---------------- La mano de Marina, a contraluz ---------------- */

/** Hacia dónde queda el codo en cada pose (la mano entra desde ese lado). */
const ARM: Record<Pose, [number, number]> = { point: [0.42, 1], fist: [0.08, -1], flat: [-0.55, 1] };

function drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, pose: Pose, k: number) {
  const [ax, ay] = ARM[pose];
  ctx.save();
  ctx.translate(x, y);
  // Rotamos para que +y apunte al codo.
  ctx.rotate(Math.atan2(ay, ax) - Math.PI / 2);
  ctx.scale(k, k);
  ctx.beginPath();
  const cap = (x0: number, y0: number, x1: number, y1: number, r: number) => {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.moveTo(x0 + Math.cos(a + Math.PI / 2) * r, y0 + Math.sin(a + Math.PI / 2) * r);
    ctx.arc(x0, y0, r, a + Math.PI / 2, a - Math.PI / 2);
    ctx.arc(x1, y1, r, a - Math.PI / 2, a + Math.PI / 2);
    ctx.closePath();
  };
  const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
    ctx.moveTo(cx + rx * Math.cos(rot), cy + rx * Math.sin(rot));
    ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
  };
  if (pose === 'point') {
    cap(0, 0, 3, 64, 8); // índice
    ell(8, 104, 36, 44, 0.1); // palma
    ell(26, 72, 12, 12); // dedos recogidos
    ell(38, 86, 12, 12);
    ell(42, 102, 11, 11);
    ell(-28, 92, 10, 26, -0.5); // pulgar
    ctx.moveTo(-26, 128); ctx.lineTo(40, 128); ctx.lineTo(84, 900); ctx.lineTo(-48, 900); ctx.closePath();
  } else if (pose === 'fist') {
    // Puño cerrado que deja caer la arena entre los dedos (la salida está en 0,0).
    ell(0, 34, 40, 38);
    ell(-24, 16, 13, 13); ell(-6, 10, 13, 13); ell(12, 12, 13, 13); ell(28, 20, 12, 12);
    ell(34, 46, 11, 24, 0.3); // pulgar
    ctx.moveTo(-30, 60); ctx.lineTo(32, 60); ctx.lineTo(60, 900); ctx.lineTo(-56, 900); ctx.closePath();
  } else {
    // Mano abierta de canto, como cuando barre la arena.
    ell(0, 60, 30, 70, 0.05);
    cap(-8, 0, -10, 40, 9); cap(6, -6, 4, 40, 9); cap(18, 2, 15, 44, 8);
    ell(-30, 92, 10, 26, -0.6);
    ctx.moveTo(-26, 118); ctx.lineTo(30, 118); ctx.lineTo(70, 900); ctx.lineTo(-56, 900); ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}

/* ---------------- Montaje en la página ---------------- */

/** Final de cada capítulo en la línea de tiempo y cuánto tarda en dibujarse solo (segundos). */
const CHAPTERS = [
  { end: 0.26, secs: 5 },
  { end: 0.64, secs: 8 },
  { end: 1, secs: 7 },
];

export async function mountStory() {
  await document.fonts?.load('500 46px Caveat').catch(() => {});
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) {
    // Sin animación: cada capítulo como una lámina fija.
    document.querySelector<HTMLElement>('.story')!.hidden = true;
    const stills = document.querySelector<HTMLElement>('.story__stills')!;
    stills.hidden = false;
    stills.querySelectorAll<HTMLCanvasElement>('canvas[data-still]').forEach((c) => {
      const r = new Renderer(c);
      r.resize();
      r.draw(Number(c.dataset.still));
    });
    return;
  }

  const section = document.querySelector<HTMLElement>('.story')!;
  const sticky = section.querySelector<HTMLElement>('.story__sticky')!;
  const canvas = section.querySelector<HTMLCanvasElement>('.story__canvas')!;
  const handsCanvas = section.querySelector<HTMLCanvasElement>('.story__hands')!;
  const hctx = handsCanvas.getContext('2d')!;
  const intro = section.querySelector<HTMLElement>('.story__intro')!;
  const captions = [...section.querySelectorAll<HTMLElement>('.story__caption')];
  const renderer = new Renderer(canvas);

  let target = 0;
  let current = 0;
  let last = 0;
  let raf = 0;
  const hp = { x: W / 2, y: -200, a: 0, pose: 'point' as Pose };

  /** El scroll solo elige el capítulo: 0 = mesa vacía, 1..3 = capítulos. */
  const chapterFromScroll = () => {
    const r = section.getBoundingClientRect();
    const f = clamp(-r.top / (r.height - innerHeight));
    return f < 0.04 ? 0 : f < 0.36 ? 1 : f < 0.7 ? 2 : 3;
  };

  const paint = (p: number, dt: number) => {
    const hand = renderer.draw(p);
    const { box } = renderer;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // La mano sigue el gesto con suavidad y sale de cuadro entre gesto y gesto.
    const sx = box.x + (hand.x / W) * box.w, sy = box.y + (hand.y / H) * box.h;
    const f = 1 - Math.exp(-dt * 14);
    if (hand.a > 0) {
      if (hp.a < 0.05) { hp.x = sx; hp.y = sy; }
      hp.x += (sx - hp.x) * f;
      hp.y += (sy - hp.y) * f;
      hp.pose = hand.pose;
    }
    hp.a += (hand.a - hp.a) * (1 - Math.exp(-dt * 6));
    hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hctx.clearRect(0, 0, handsCanvas.width, handsCanvas.height);
    if (hp.a > 0.01) {
      const [ax, ay] = ARM[hp.pose];
      const away = (1 - hp.a) * box.w * 0.5;
      hctx.globalAlpha = 0.85;
      hctx.fillStyle = '#120c0a';
      drawHand(hctx, hp.x + ax * away, hp.y + ay * away, hp.pose, Math.min(box.w, box.h) / 640);
    }
    intro.style.opacity = String(1 - clamp(p / 0.02));
    for (const el of captions) {
      const from = Number(el.dataset.from), to = Number(el.dataset.to);
      const vis = clamp((p - from) / 0.03) * (1 - clamp((p - to) / 0.03));
      el.style.opacity = String(vis);
      el.style.setProperty('--write', `${(1 - ease(clamp((p - from) / ((to - from) * 0.35)))) * 100}%`);
    }
  };

  const tick = (now: number) => {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (current !== target) {
      // Hacia adelante se dibuja a su ritmo; hacia atrás se "rebobina" rápido.
      const ch = CHAPTERS.find((c) => current < c.end - 1e-4) ?? CHAPTERS[CHAPTERS.length - 1];
      const prevEnd = CHAPTERS[CHAPTERS.indexOf(ch) - 1]?.end ?? 0;
      const speed = target > current ? (ch.end - prevEnd) / ch.secs : 0.4;
      current = target > current ? Math.min(target, current + speed * dt) : Math.max(target, current - speed * dt);
    }
    paint(current, dt);
    const settled = current === target && Math.abs(hp.a - (current === target ? 0 : 1)) < 0.01;
    raf = settled ? 0 : requestAnimationFrame(tick);
    if (!raf) last = 0;
  };
  const kick = () => {
    const ch = chapterFromScroll();
    target = ch === 0 ? 0 : CHAPTERS[ch - 1].end;
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const onResize = () => {
    renderer.resize();
    const r = sticky.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    handsCanvas.width = Math.round(r.width * dpr);
    handsCanvas.height = Math.round(r.height * dpr);
    const { box } = renderer;
    sticky.style.setProperty('--box-top', `${box.y}px`);
    sticky.style.setProperty('--box-bottom', `${box.y + box.h}px`);
    paint(current, 0);
  };
  new ResizeObserver(onResize).observe(sticky);
  addEventListener('scroll', kick, { passive: true });
  onResize();
  kick();
}
