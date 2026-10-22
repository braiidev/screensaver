/**
 * clock.js - El reloj.
 *
 * Muestra la hora y la fecha de la zona horaria que hay activa en el store, y
 * en el formato de hora que digan los ajustes. Se suscribe a las dos cosas, asi
 * que cambiar de ciudad o de formato repinta sin recargar nada.
 *
 * En 12 horas el periodo (`a. m.`) va en su propio nodo: es la mitad de alto y
 * el reloj es enorme, asi que si fuera parte del texto marcaria el tamano de
 * todo. Con 24 horas ese nodo se queda vacio.
 *
 * Solo pinta cuando el texto cambia: el navegador recibe dos escrituras por
 * minuto, no diez por segundo.
 */

import { CONFIG } from "../../config.js";
import { createClockFormat } from "../../utils/time.js";

/**
 * @param {Object} elements
 * @param {HTMLElement} elements.$clock donde va la hora
 * @param {HTMLElement} elements.$period donde va el periodo (solo en 12 h)
 * @param {HTMLElement} elements.$day donde va la fecha
 * @param {Object} deps
 * @param {import("../../core/store.js")} deps.store
 * @param {import("../../core/scheduler.js")} deps.scheduler
 */
export function createClock({ $clock, $period, $day }, { store, scheduler }) {
  let format = null;
  let lastTime = null;
  let lastPeriod = null;
  let lastDate = null;
  let stopTicking = null;

  /** Rehace el formateador con lo que diga el store ahora mismo. */
  function rebuild() {
    format = createClockFormat(
      store.get("timezone"),
      store.get("hourCycle") ?? "h23",
    );
    // Se anulan las caches para que el formato nuevo se pinte de inmediato.
    lastTime = null;
    lastPeriod = null;
    lastDate = null;
    render();
  }

  function render() {
    const now = new Date();
    const { time, period } = format.now(now);

    if (time !== lastTime) {
      $clock.textContent = time;
      lastTime = time;
    }

    if (period !== lastPeriod) {
      $period.textContent = period;
      lastPeriod = period;
    }

    const date = format.date(now);
    if (date !== lastDate) {
      $day.textContent = date;
      lastDate = date;
    }
  }

  const offZone = store.subscribe("timezone", rebuild);
  const offCycle = store.subscribe("hourCycle", rebuild);

  return {
    start() {
      rebuild();
      stopTicking = scheduler.every(CONFIG.clock.tickInterval, render);
    },

    stop() {
      stopTicking?.();
      stopTicking = null;
      offZone();
      offCycle();
    },
  };
}
