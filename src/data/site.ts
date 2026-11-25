export const site = {
  name: 'Arte con Arena',
  artist: 'Marina Viviana López',
  title: 'Arte con Arena · Marina Viviana López | Sand Art en vivo para eventos',
  description:
    'Sand Art en vivo: dibujos con arena proyectados en pantalla para eventos corporativos, bodas y festivales. Shows únicos y a medida de Marina Viviana López.',
  email: 'marina_vlopez@hotmail.com',
};

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
