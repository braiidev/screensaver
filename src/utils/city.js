/**
 * city.js - La forma de una ciudad.
 *
 * Una ciudad es lo que basta para pedir el clima y para poner la hora: un
 * nombre, unas coordenadas y, cuando se conoce, su zona horaria IANA.
 *
 * El identificador sale de las coordenadas redondeadas y no del nombre: dos
 * ciudades pueden llamarse igual, y el mismo sitio se puede escribir de dos
 * maneras. Con las coordenadas, buscar "Madrid" dos veces da la misma ficha.
 */

import { CONFIG } from "../config.js";

/**
 * El identificador estable de unas coordenadas.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {string} por ejemplo "40.42,-3.70"
 */
export function cityId(latitude, longitude) {
  const decimals = CONFIG.cities.idDecimals;
  return `${latitude.toFixed(decimals)},${longitude.toFixed(decimals)}`;
}

/**
 * Convierte lo que devuelve un servicio (geolocalizacion, IP o geocoding) en
 * una ciudad del store.
 *
 * Los nombres cambian segun la fuente: `geo.js` habla de `city` y el geocoding
 * de Open-Meteo de `name`. Aqui se aceptan los dos.
 *
 * @param {{latitude?: number, longitude?: number, city?: string, name?: string,
 *   country?: string, admin1?: string, timezone?: string}} place
 * @returns {Object | null} null si no hay coordenadas
 */
export function toCity(place) {
  if (!place) return null;

  const { latitude, longitude } = place;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    id: cityId(latitude, longitude),
    city: place.city || place.name || "",
    country: place.country || "",
    admin1: place.admin1 || "",
    latitude,
    longitude,
    // La geolocalizacion no la conoce: llega con la primera respuesta del
    // clima y entonces se guarda en la propia ciudad.
    timezone: typeof place.timezone === "string" ? place.timezone : "",
  };
}
