/**
 * preferences.js - Los ajustes que sobreviven a recargar.
 *
 * El store manda mientras la pagina vive; esto es su copia en disco. Al
 * arrancar se lee y se valida: si lo guardado viene de otra version, o alguien
 * lo ha tocado a mano, se queda solo lo que tiene forma conocida y el resto
 * vuelve al valor de fabrica. Nunca se confia en lo que hay en `localStorage`.
 */

import { CONFIG } from "../config.js";
import { toCity } from "../utils/city.js";
import { readJSON, writeJSON } from "./storage.js";

/** Los valores de fabrica, los mismos que ve quien entra por primera vez. */
export const DEFAULTS = {
  units: "celsius",
  hourCycle: "h23",
  forecast: true,
  feelsLike: true,
  wallpaper: true,
  wallpaperInterval: CONFIG.wallpaper.interval,
  activeCityId: null,
};

/** Valores admitidos por los ajustes que no son booleanos. */
const UNITS = ["celsius", "fahrenheit"];
const HOUR_CYCLES = ["h23", "h12"];
const SWITCHES = ["forecast", "feelsLike", "wallpaper"];

/** Claves del store que forman el bloque de ajustes. */
const SETTING_KEYS = [
  "units",
  "hourCycle",
  "forecast",
  "feelsLike",
  "wallpaper",
  "wallpaperInterval",
];

/**
 * Deja solo los ajustes con un valor conocido. Lo que no encaja vuelve al
 * valor de fabrica, uno a uno: un ajuste roto no arrastra a los demas.
 *
 * @param {*} raw
 */
function cleanSettings(raw) {
  const out = { ...DEFAULTS };
  if (!raw || typeof raw !== "object") return out;

  if (UNITS.includes(raw.units)) out.units = raw.units;
  if (HOUR_CYCLES.includes(raw.hourCycle)) out.hourCycle = raw.hourCycle;

  for (const key of SWITCHES) {
    if (typeof raw[key] === "boolean") out[key] = raw[key];
  }

  if (CONFIG.wallpaper.intervals.includes(raw.wallpaperInterval)) {
    out.wallpaperInterval = raw.wallpaperInterval;
  }

  if (typeof raw.activeCityId === "string") out.activeCityId = raw.activeCityId;

  return out;
}

/**
 * Deja solo las ciudades con coordenadas, sin repetir y sin pasar del limite.
 *
 * @param {*} raw
 */
function cleanCities(raw) {
  if (!Array.isArray(raw)) return [];

  const seen = new Set();
  const out = [];

  for (const item of raw) {
    const city = toCity(item);
    if (!city || seen.has(city.id)) continue;

    seen.add(city.id);
    out.push(city);
    if (out.length >= CONFIG.cities.max) break;
  }

  return out;
}

/**
 * Lo guardado, listo para meter en el store.
 *
 * @returns {{cities: Array<Object>, settings: Object}}
 */
export function loadPreferences() {
  const settings = cleanSettings(readJSON(CONFIG.storage.keys.settings));
  const cities = cleanCities(readJSON(CONFIG.storage.keys.cities));

  // Una ciudad activa que ya no esta en la lista no puede seguir activa.
  if (!cities.some((city) => city.id === settings.activeCityId)) {
    settings.activeCityId = cities[0]?.id ?? null;
  }

  return { cities, settings };
}

/** @param {Array<Object>} cities */
export function saveCities(cities) {
  writeJSON(CONFIG.storage.keys.cities, cities);
}

/** @param {Object} settings */
export function saveSettings(settings) {
  writeJSON(CONFIG.storage.keys.settings, settings);
}

/**
 * El bloque de ajustes tal como esta ahora en el store.
 *
 * @param {{get: (key: string) => *}} store
 */
export function settingsFrom(store) {
  const out = {};
  for (const key of SETTING_KEYS) out[key] = store.get(key);
  out.activeCityId = store.get("activeCityId") ?? null;
  return out;
}

/**
 * Copia a disco cada cambio, y solo los cambios de ajustes o de ciudades: el
 * store tambien guarda la zona horaria y el clima, que no se recuerdan.
 *
 * @param {{get: Function, subscribe: Function}} store
 * @returns {() => void} cancela la copia
 */
export function persist(store) {
  const save = () => saveSettings(settingsFrom(store));

  const offs = [...SETTING_KEYS, "activeCityId"].map((key) =>
    store.subscribe(key, save),
  );
  offs.push(store.subscribe("cities", (cities) => saveCities(cities ?? [])));

  return () => offs.forEach((off) => off());
}
