/**
 * storage.js - Lo que se recuerda entre visitas.
 *
 * `localStorage` es comodo pero no fiable: en modo privado puede lanzar al
 * escribir, puede estar lleno y lo que hay guardado puede venir de otra
 * version. Aqui todo fallo se traga y se devuelve lo que se pueda. La app
 * funciona igual sin memoria, solo que empieza de cero.
 */

import { CONFIG } from "../config.js";

/**
 * El almacen, si el navegador deja usarlo.
 *
 * El acceso a `localStorage` puede lanzar solo por leerlo, asi que la
 * comprobacion va dentro de `try`.
 */
function area() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Lee un valor guardado.
 *
 * @param {string} key clave sin prefijo
 * @returns {*} el valor, o `null` si no hay nada o no se puede leer
 */
export function readJSON(key) {
  const store = area();
  if (!store) return null;

  try {
    const text = store.getItem(CONFIG.storage.prefix + key);
    return text === null ? null : JSON.parse(text);
  } catch {
    // JSON roto o almacen bloqueado: se empieza de cero.
    return null;
  }
}

/**
 * Guarda un valor.
 *
 * @param {string} key clave sin prefijo
 * @param {*} value tiene que poder pasar por `JSON.stringify`
 * @returns {boolean} si se pudo guardar
 */
export function writeJSON(key, value) {
  const store = area();
  if (!store) return false;

  try {
    store.setItem(CONFIG.storage.prefix + key, JSON.stringify(value));
    return true;
  } catch {
    // Cuota llena o modo privado: se sigue sin memoria.
    return false;
  }
}
