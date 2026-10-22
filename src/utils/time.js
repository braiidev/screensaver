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

/**
 * Un formateador del dia de la semana, corto, para la tira del pronostico.
 *
 * La fecha llega como "2026-10-22", sin hora, y ya viene en la zona horaria de
 * la ciudad. Por eso se formatea en UTC y no en la zona de la ciudad: no hay
 * nada que convertir. Pasar esa fecha por una zona la moveria de dia —con
 * `timeZone: "Pacific/Auckland"`, un jueves a las 12:00 UTC ya es viernes— y
 * la tira mostraria el dia equivocado.
 *
 * @returns {(isoDate: string) => string} "jue"
 */
export function createDayFormat() {
  const weekday = new Intl.DateTimeFormat(CONFIG.app.locale, {
    timeZone: "UTC",
    weekday: "short",
  });

  return (isoDate) => {
    const [year, month, day] = isoDate.split("-").map(Number);
    return weekday.format(new Date(Date.UTC(year, month - 1, day)));
  };
}
