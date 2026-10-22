/**
 * time.js - Formato de la hora y de la fecha.
 *
 * Todo con `Intl`, para que las horas con cero, los nombres de los dias y los
 * meses salgan bien en español y cambien solos con la zona horaria.
 *
 * Con `hourCycle: "h23"` la medianoche es 00:00 y nunca 24:00, que es lo que
 * sale por defecto en algunos navegadores con `hour12: false`.
 */

import { CONFIG } from "../config.js";

/**
 * La zona horaria del dispositivo. Es el valor inicial del reloj hasta que
 * haya una ciudad activa.
 * @returns {string}
 */
export function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Crea un formateador para una zona horaria concreta.
 *
 * Los formateadores se crean una vez y se reutilizan: `Intl.DateTimeFormat`
 * es comparatively caro de construir.
 *
 * @param {string} timeZone zona IANA, por ejemplo "Europe/Madrid"
 */
export function createClockFormat(timeZone) {
  const time = new Intl.DateTimeFormat(CONFIG.app.locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const date = new Intl.DateTimeFormat(CONFIG.app.locale, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return {
    /** "09:05" */
    time: (moment = new Date()) => time.format(moment),
    /** "jueves, 22 de octubre" */
    date: (moment = new Date()) => date.format(moment),
    /** La zona horaria que usa este formateador. */
    timeZone,
  };
}
