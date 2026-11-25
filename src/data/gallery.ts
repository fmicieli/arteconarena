import type { ImageMetadata } from 'astro';
import d2 from '../assets/portfolio/portfolio-details-2.jpg';
import d3 from '../assets/portfolio/portfolio-details-3.jpg';
import p1 from '../assets/portfolio/portfolio-1.jpg';
import p2 from '../assets/portfolio/portfolio-2.jpg';
import p3 from '../assets/portfolio/portfolio-3.jpg';
import p5 from '../assets/portfolio/portfolio-5.jpg';
import p8 from '../assets/portfolio/portfolio-8.jpg';
import p9 from '../assets/portfolio/portfolio-9.jpg';
import p6 from '../assets/portfolio/portfolio-6.jpg';
import concierto from '../assets/img/about-video.jpg';
import posterHistoria from '../assets/posters/tu-historia-en-arena.jpg';
import posterQuieras from '../assets/posters/la-historia-que-quieras.jpg';

export interface GalleryItem {
  image: ImageMetadata;
  alt: string;
  /** Si existe, el ítem abre este video (en /public) en el lightbox. */
  video?: string;
  /** Punto de foco al recortar la foto en la grilla (object-position). Por defecto, centro. */
  focus?: string;
}

// TODO(clienta): si quiere, sumar nombre del evento/lugar a cada foto como pie.
export const gallery: GalleryItem[] = [
  { image: p6, alt: 'Marina Viviana López deja caer arena desde la mano sobre la mesa de luz, bañada en luz azul', focus: '50% 22%' },
  { image: posterHistoria, alt: 'Video: «Tu historia en arena», un relato dibujado con arena de principio a fin', video: 'video/tu-historia-en-arena.mp4' },
  { image: d2, alt: 'Marina dibuja un retrato con arena en vivo, proyectado en una pantalla de colores' },
  { image: p5, alt: 'Mesa de luz encendida en la oscuridad con un dibujo de arena en proceso', focus: '50% 62%' },
  { image: p1, alt: 'Escenario de la Zurich Gala del Mar con orquesta y público, iluminado en azul y rosa' },
  { image: p3, alt: 'Marina inclinada sobre la mesa de luz durante un evento, con un presentador detrás' },
  { image: p9, alt: 'Show en escenario con pantalla gigante que muestra un paisaje nocturno dibujado con arena' },
  { image: posterQuieras, alt: 'Video: «La historia que quieras», una mujer y un cisne dibujados con arena', video: 'video/la-historia-que-quieras.mp4' },
  { image: concierto, alt: 'Show de Sand Art con músicos en vivo y el dibujo proyectado en una gran pantalla' },
  { image: d3, alt: 'Marina dibuja junto a músicos en vivo, con la obra proyectada detrás' },
  { image: p2, alt: 'Función con luz verde: las manos sobre la arena y el dibujo proyectado al fondo' },
  { image: p8, alt: 'Evento con humo y luces violetas, con un dibujo de arena proyectado en pantalla' },
];
