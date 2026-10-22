/**
 * wno.js - Los 28 codigos WMO, en espanol.
 *
 * Open-Meteo devuelve un numero por estado del cielo. Aqui se traduce a dos
 * cosas: la etiqueta que se lee en pantalla y el nombre del icono que hay que
 * dibujar. El dibujo y su color viven en `ui/icons.js`.
 *
 * `day` y `night` solo cambian el dibujo: despejado no es lo mismo de dia que
 * de noche, pero se llama igual.
 *
 * Este fichero se edita a mano. Si la API cambia un codigo, se cambia aqui.
 */

const WMO = {
  "0": { label: "Despejado", day: "sun", night: "moon" },
  "1": { label: "Mayormente despejado", day: "sun-cloud", night: "moon-cloud" },
  "2": { label: "Parcialmente nublado", day: "sun-cloud", night: "moon-cloud" },
  "3": { label: "Nublado", day: "cloud", night: "cloud" },
  "45": { label: "Niebla", day: "fog", night: "fog" },
  "48": { label: "Niebla con escarcha", day: "fog", night: "fog" },
  "51": { label: "Llovizna débil", day: "drizzle", night: "drizzle" },
  "53": { label: "Llovizna", day: "drizzle", night: "drizzle" },
  "55": { label: "Llovizna fuerte", day: "drizzle", night: "drizzle" },
  "56": { label: "Llovizna helada", day: "drizzle", night: "drizzle" },
  "57": { label: "Llovizna helada fuerte", day: "drizzle", night: "drizzle" },
  "61": { label: "Lluvia débil", day: "rain", night: "rain" },
  "63": { label: "Lluvia", day: "rain", night: "rain" },
  "65": { label: "Lluvia fuerte", day: "rain", night: "rain" },
  "66": { label: "Lluvia helada", day: "rain", night: "rain" },
  "67": { label: "Lluvia helada fuerte", day: "rain", night: "rain" },
  "71": { label: "Nieve débil", day: "snow", night: "snow" },
  "73": { label: "Nieve", day: "snow", night: "snow" },
  "75": { label: "Nieve fuerte", day: "snow", night: "snow" },
  "77": { label: "Granos de nieve", day: "snow", night: "snow" },
  "80": { label: "Chubascos débiles", day: "rain", night: "rain" },
  "81": { label: "Chubascos", day: "rain", night: "rain" },
  "82": { label: "Chubascos fuertes", day: "rain", night: "rain" },
  "85": { label: "Chubascos de nieve", day: "snow", night: "snow" },
  "86": { label: "Chubascos de nieve fuertes", day: "snow", night: "snow" },
  "95": { label: "Tormenta", day: "storm", night: "storm" },
  "96": { label: "Tormenta con granizo", day: "storm", night: "storm" },
  "99": { label: "Tormenta con granizo fuerte", day: "storm", night: "storm" },
};

/**
 * La etiqueta y el icono de un codigo WMO.
 *
 * Un codigo desconocido no rompe la pantalla: se trata como nublado.
 *
 * @param {number} code codigo WMO
 * @param {boolean} [isDay]
 * @returns {{ label: string, icon: string }}
 */
export function identify(code, isDay = true) {
  const entry = WMO[code] ?? WMO["3"];

  return {
    label: entry.label,
    icon: isDay ? entry.day : entry.night,
  };
}
