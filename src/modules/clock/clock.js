/**
 * clock.js - El reloj.
 *
 * Muestra la hora y la fecha de la zona horaria que hay activa en el store.
 * Ahora mismo esa zona es la del dispositivo; en la Fase 4, la de la ciudad
 * elegida. El reloj se suscribe a esa clave, asi que no hay que tocarlo cuando
 * la ciudad cambie.
 *
 * Solo pinta cuando el texto cambia: el navegador recibe dos escrituras por
 * minuto, no diez por segundo.
 */

import { CONFIG } from "../../config.js";
import { createClockFormat } from "../../utils/time.js";

/**
 * @param {Object} elements
 * @param {HTMLElement} elements.$clock donde va la hora
 * @param {HTMLElement} elements.$day donde va la fecha
 * @param {Object} deps
 * @param {import("../../core/store.js")} deps.store
 * @param {import("../../core/scheduler.js")} deps.scheduler
 */
export function createClock({ $clock, $day }, { store, scheduler }) {
  let format = createClockFormat(store.get("timezone"));
  let lastTime = null;
  let lastDate = null;
  let stopTicking = null;

  function render() {
    const now = new Date();

    const time = format.time(now);
    if (time !== lastTime) {
      $clock.textContent = time;
      lastTime = time;
    }

    const date = format.date(now);
    if (date !== lastDate) {
      $day.textContent = date;
      lastDate = date;
    }
  }

  const unsubscribe = store.subscribe("timezone", (timeZone) => {
    format = createClockFormat(timeZone);
    // Se anula la cache para que el nuevo formato se pinte de inmediato.
    lastTime = null;
    lastDate = null;
    render();
  });

  return {
    start() {
      render();
      stopTicking = scheduler.every(CONFIG.clock.tickInterval, render);
    },

    stop() {
      stopTicking?.();
      stopTicking = null;
      unsubscribe();
    },
  };
}
