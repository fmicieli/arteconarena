export const site = {
  name: 'Arte con Arena',
  artist: 'Marina Viviana López',
  title: 'Sand Art en vivo para eventos · Arte con Arena | Marina Viviana López',
  description:
    'Arte con arena en vivo en Argentina: Marina Viviana López dibuja con arena sobre una mesa de luz y la obra se proyecta en pantalla. Shows de Sand Art para bodas, eventos corporativos y festivales.',
  email: 'marina_vlopez@hotmail.com',
  phone: '+5492324476673',
  /** Términos con los que la gente busca este servicio (para datos estructurados). */
  keywords: [
    'Sand Art',
    'arte con arena',
    'dibujos con arena',
    'show de arena en vivo',
    'sand art para eventos',
    'sand art para bodas',
    'sand art para eventos corporativos',
    'pintura con arena',
    'animación con arena',
  ],
};

export const services = [
  { name: 'Sand Art para eventos corporativos', description: 'Show de dibujo con arena en vivo, proyectado en pantalla, con la historia o la visión de la empresa.' },
  { name: 'Sand Art para bodas y celebraciones', description: 'Relato de amor dibujado con arena en vivo durante la fiesta, proyectado para todos los invitados.' },
  { name: 'Sand Art para eventos culturales y festivales', description: 'Show de arte con arena en escenario, con música en vivo y proyección en pantalla gigante.' },
];

export const links = {
  whatsapp: 'https://wa.me/5492324476673?text=' +
    encodeURIComponent('Hola Marina, quiero consultar por un show de Sand Art para mi evento.'),
  email: 'mailto:marina_vlopez@hotmail.com?subject=Arte%20con%20Arena%3A%20Consulta',
  facebook: 'https://www.facebook.com/ArteConArenaSandArt?locale=es_LA',
  instagram: 'https://www.instagram.com/marina_viviana_lopez/',
  youtube: 'https://www.youtube.com/@marinavivianalopez-artecon4792',
};

/** Resuelve rutas de /public respetando el `base` configurado. */
export const asset = (path: string) =>
  `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
