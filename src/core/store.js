/**
 * store.js - El estado central de la aplicacion.
 *
 * Un solo objeto guarda el estado. Los modulos no se pasan datos entre si:
 * leen del store y se suscriben a las claves que les importan. Asi el reloj
 * puede cambiar de zona horaria sin que el fondo se entere, o al reves.
 *
 * Reglas:
 *   - Solo el store guarda estado.
 *   - `set` no notifica si el valor no ha cambiado.
 *   - `subscribe` devuelve la funcion para darse de baja.
 */

const state = {};
const listeners = new Map();

/**
 * Devuelve el valor de una clave.
 * @param {string} key
 */
export function get(key) {
  return state[key];
}

/**
 * Escribe un valor y avisa a quien estara suscrito a esa clave.
 * @param {string} key
 * @param {*} value
 */
export function set(key, value) {
  if (Object.is(state[key], value)) return;
  const previous = state[key];
  state[key] = value;
  const subscribers = listeners.get(key);
  if (!subscribers) return;
  // Copia: un suscriptor puede darse de baja mientras se notifica.
  for (const fn of [...subscribers]) fn(value, previous);
}

/**
 * Se suscribe a los cambios de una clave.
 * @param {string} key
 * @param {(value: *, previous: *) => void} fn
 * @returns {() => void} funcion para cancelar la suscripcion
 */
export function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => {
    listeners.get(key)?.delete(fn);
  };
}

/**
 * Carga el estado inicial. Notifica como un `set` normal.
 * @param {Record<string, *>} initial
 */
export function init(initial) {
  for (const [key, value] of Object.entries(initial)) set(key, value);
  return state;
}

/**
 * Copia del estado completo. Para depurar.
 */
export function snapshot() {
  return { ...state };
}
