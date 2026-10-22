/**
 * units.js - Los grados, en la unidad que se haya elegido.
 *
 * La API se pide siempre en celsius: convertir aqui cuesta una multiplicacion y
 * evita volver a pedir el tiempo cada vez que se cambia de unidad. El simbolo
 * de grado es el mismo en las dos escalas.
 */

const FAHRENHEIT = {
  /** 9/5 de un grado celsius es un grado fahrenheit. */
  scale: 9 / 5,
  /** El cero de la una no es el cero de la otra. */
  offset: 32,
};

/**
 * De celsius a la unidad elegida.
 *
 * @param {number} celsius
 * @param {string} units "celsius" o "fahrenheit"
 * @returns {number | null} null si no hay un numero
 */
export function convertTemperature(celsius, units) {
  if (!Number.isFinite(celsius)) return null;
  if (units !== "fahrenheit") return celsius;
  return celsius * FAHRENHEIT.scale + FAHRENHEIT.offset;
}

/**
 * "21°", redondeado y con su simbolo. "--" si no hay dato.
 *
 * @param {number} celsius
 * @param {string} units
 */
export function formatTemperature(celsius, units) {
  const value = convertTemperature(celsius, units);
  return value === null ? "--" : `${Math.round(value)}°`;
}
