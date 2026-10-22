/**
 * geocoding.js - Buscar ciudades por su nombre.
 *
 * El geocoding de Open-Meteo devuelve nombre, pais y, sobre todo, la zona
 * horaria IANA de cada resultado. Con eso la ciudad se puede guardar completa:
 * no hace falta preguntar por ella otra vez para saber que hora es alli.
 *
 * Se pide poco y se espera poco: el panel busca mientras se escribe, y una
 * busqueda que llega tarde no debe pisar a la siguiente. De eso se encarga
 * quien llama, cancelando la anterior.
 */

import { CONFIG } from "../config.js";
import { toCity } from "../utils/city.js";
import { getJSON } from "./http.js";

/**
 * @param {string} query lo que se ha escrito
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Array<Object>>} ciudades listas para el store
 */
export async function searchPlaces(query, { signal } = {}) {
  const name = query.trim();
  if (name.length < CONFIG.geocoding.minQuery) return [];

  const url =
    `${CONFIG.endpoints.geocoding}?name=${encodeURIComponent(name)}` +
    `&count=${CONFIG.geocoding.count}` +
    `&language=${CONFIG.app.language}` +
    `&format=json`;

  const data = await getJSON(url, { signal, retries: 1 });

  return (data.results ?? [])
    .map(toCity)
    .filter((city) => city && city.city);
}
