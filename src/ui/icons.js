/**
 * icons.js - Los iconos del clima, dibujados en linea.
 *
 * Son SVG con `currentColor` en el trazo: no hay ficheros que cargar, no hay
 * peticiones que esperar y el color lo pone el CSS con `data-tone`. Un icono
 * es texto, asi que hereda el tamano de donde se ponga.
 *
 * Los trazos vienen de Lucide (ISC), recortados a 24x24 y a un solo color.
 */

const COMMON = `viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"`;

const ICONS = {
  /** Despejado de dia. */
  sun: `<circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>`,

  /** Despejado de noche. */
  moon: `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`,

  /** Nublado. */
  cloud: `<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>`,

  /** Poco nublado de dia. */
  "sun-cloud": `<path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41"/>
    <path d="M15.95 12.65a4 4 0 0 0-5.93-4.13"/>
    <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>`,

  /** Poco nublado de noche. */
  "moon-cloud": `<path d="M10.19 8.5A6 6 0 0 1 13 4a6 6 0 0 0 8.98 8.6 6 6 0 1 1-11.79-4.1"/>
    <path d="M13 16H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>`,

  /** Llovizna. */
  drizzle: `<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/>
    <path d="M8 19v1M8 14v1M16 19v1M16 14v1M12 21v1M12 16v1"/>`,

  /** Lluvia. */
  rain: `<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/>
    <path d="M16 14v6M8 14v6M12 16v6"/>`,

  /** Nieve. */
  snow: `<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/>
    <path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01"/>`,

  /** Tormenta. */
  storm: `<path d="M6 16.33A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.97"/>
    <path d="m13 12-3 5h4l-3 5"/>`,

  /** Niebla. */
  fog: `<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/>
    <path d="M16 17H7M16 21H9"/>`,

  /** Amanecer, para el extra del sol. */
  sunrise: `<path d="M12 2v8"/>
    <path d="m4.93 10.93 1.41 1.41M2 18h2M20 18h2m-2.07-5.66-1.41 1.41"/>
    <path d="M22 22H2M8 6l4-4 4 4"/>`,

  /** Atardecer, para el extra del sol. */
  sunset: `<path d="M12 10V2"/>
    <path d="m4.93 10.93 1.41 1.41M2 18h2M20 18h2m-2.07-5.66-1.41 1.41"/>
    <path d="M22 22H2m14-16-4 4-4-4"/>`,

  /** Viento, para el extra de la velocidad. */
  wind: `<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
    <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>`,

  /** Gota, para el extra de humedad. */
  droplet: `<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z"/>`,

  /** Ajustes. No es un icono del clima: es el del engranaje de la esquina. */
  settings: `<path d="M20 7h-9M14 17H5"/>
    <circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>`,
};

/**
 * El dibujo de un icono.
 *
 * @param {string} name uno de los nombres de `data/wno.js`, o "settings"
 * @returns {string} el SVG completo. Si el nombre no existe, devuelve nubes:
 *   es preferible un icono generico a un hueco.
 */
export function iconFor(name) {
  const body = ICONS[name] ?? ICONS.cloud;
  return `<svg ${COMMON} aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Los nombres disponibles. Para las pruebas. */
export const ICON_NAMES = Object.keys(ICONS);
