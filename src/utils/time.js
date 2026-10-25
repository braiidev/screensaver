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
 * es comparativamente caro de construir.
 *
 * En 12 horas la hora y el periodo (`a. m.`) llegan en piezas separadas. Se
 * piden asi y no con `format()`, que los devuelve ya pegados: el reloj pinta
 * el periodo mas pequeno y alineado abajo, y para eso tiene que ser otro nodo.
 *
 * @param {string} timeZone zona IANA, por ejemplo "Europe/Madrid"
 * @param {string} [hourCycle] "h23" para 24 horas, "h12" para 12
 */
export function createClockFormat(timeZone, hourCycle = "h23") {
  const clock = new Intl.DateTimeFormat(CONFIG.app.locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle,
  });

  const dateFull = new Intl.DateTimeFormat(CONFIG.app.locale, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const dateCompact = new Intl.DateTimeFormat(CONFIG.app.locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const dateLong = new Intl.DateTimeFormat(CONFIG.app.locale, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  /** La pieza de un tipo, o "" si ese formato no la tiene. */
  const pick = (parts, type) => parts.find((part) => part.type === type)?.value ?? "";

  /** "09:05" y, en 12 horas, "a. m."; en 24 horas el periodo viene vacio. */
  const read = (moment) => {
    const parts = clock.formatToParts(moment);
    return {
      time: `${pick(parts, "hour")}:${pick(parts, "minute")}`,
      period: pick(parts, "dayPeriod"),
    };
  };

  return {
    /** Las dos piezas a la vez, que es lo que usa el reloj. */
    now: (moment = new Date()) => read(moment),
    /** "09:05" */
    time: (moment = new Date()) => read(moment).time,
    /** "a. m." o "" */
    period: (moment = new Date()) => read(moment).period,
    /** "jueves, 22 de octubre" */
    date: (moment = new Date()) => dateLong.format(moment),
    /** "vie., 24 oct." */
    dateCompact: (moment = new Date()) => dateCompact.format(moment),
    /** "viernes, 24 de octubre de 2026" */
    dateFull: (moment = new Date()) => dateFull.format(moment),
    /** La zona horaria que usa este formateador. */
    timeZone,
    hourCycle,
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
