/**
 * weather.js - El bloque del clima.
 *
 * Pide la localizacion, luego el tiempo, y lo refresca cada cierto rato.
 *
 * Dos reglas que se arreglaron aqui y conviene no romper:
 *
 *   1. Un solo temporizador. Antes, si el tiempo fallaba, el reintento se
 *      calendarizaba a mano y ademas seguia el refresco periodico: dos relojes
 *      encadenando peticiones que se multiplicaban. Ahora `clearTimers()` se
 *      llama antes de cada intento y siempre queda uno solo.
 *   2. La localizacion se reintenta. Antes, si fallaba, `place` se quedaba a
 *      null para siempre y la app no volvia a pedir ciudad nunca. Ahora el
 *      fallo entra por el mismo camino que el del tiempo y se reintenta.
 *
 * La zona horaria que devuelve la API se guarda en el store, de modo que el
 * reloj pasa a mostrar la hora del sitio del que se habla y no la del aparato.
 */

import { CONFIG } from "../../config.js";
import setIcon from "../../data/wno.js";
import { formatPlace, locate } from "../../services/geo.js";
import { fetchCurrent } from "../../services/weatherApi.js";

/**
 * @param {Object} elements
 * @param {HTMLElement} elements.$weather donde va la temperatura
 * @param {HTMLElement} elements.$icon donde va el icono
 * @param {HTMLElement} elements.$location donde va la localizacion
 * @param {HTMLElement} elements.$retry boton de reintentar
 * @param {Object} deps
 * @param {import("../../core/store.js")} deps.store
 * @param {import("../../core/scheduler.js")} deps.scheduler
 */
export function createWeather(
  { $weather, $icon, $location, $retry },
  { store, scheduler },
) {
  const refreshMs = CONFIG.weather.refreshInterval * CONFIG.time.minute;

  /** Coordenadas y nombre ya resueltos, para no repetir la localizacion. */
  let place = null;
  let running = false;
  let busy = false;
  let refreshTimer = null;
  let retryTimer = null;
  let abort = null;
  let stopDots = null;

  /** Puntos suspensivos mientras se espera una respuesta. */
  function dots($element) {
    $element.style.letterSpacing = CONFIG.loading.letterSpacing;
    $element.textContent = "";

    const stop = scheduler.every(CONFIG.loading.interval, () => {
      let text = $element.textContent;
      if (text.length === CONFIG.loading.dots) text = "";
      else text += ".";
      $element.textContent = text;
    });

    return () => {
      stop();
      $element.style.letterSpacing = "normal";
    };
  }

  function startDots($element) {
    stopDots?.();
    stopDots = dots($element);
  }

  function endDots() {
    stopDots?.();
    stopDots = null;
  }

  function clearTimers() {
    refreshTimer?.();
    refreshTimer = null;
    retryTimer?.();
    retryTimer = null;
  }

  function showError(error, { onLocation }) {
    $retry.hidden = false;

    const $target = onLocation ? $location : $weather;
    $target.textContent = onLocation
      ? CONFIG.messages.locationError
      : CONFIG.messages.weatherError;
    $target.classList.add("warning");

    console.error(error?.message ?? error);
  }

  function render({ temperature, code, isDay, timezone }) {
    $weather.classList.remove("warning");
    $location.classList.remove("warning");
    $retry.hidden = true;

    const degrees = Number.isFinite(temperature) ? Math.round(temperature) : "--";
    $weather.textContent = `${degrees}˚`;
    $icon.style.backgroundImage = setIcon(code, isDay) ?? "";

    if (timezone) store.set("timezone", timezone);
  }

  /**
   * Un intento completo: localizar si hace falta y pedir el tiempo.
   *
   * @param {{ silent?: boolean }} [options] silencioso: no borra lo que ya
   *   hay en pantalla mientras refresca
   */
  async function refresh({ silent = false } = {}) {
    if (!running || busy) return;

    busy = true;
    clearTimers();
    abort?.abort();
    abort = new AbortController();
    const { signal } = abort;

    try {
      if (!place) {
        startDots($location);
        place = await locate({ signal });
        $location.textContent = formatPlace(place);
        endDots();
      }

      if (!silent) startDots($weather);

      const current = await fetchCurrent({ ...place, signal });
      render(current);

      refreshTimer = scheduler.after(refreshMs, () =>
        refresh({ silent: true }),
      );
    } catch (error) {
      // Si lo que pasa es que nos han parado, no es un fallo.
      if (!signal.aborted) {
        showError(error, { onLocation: !place });
        retryTimer = scheduler.after(CONFIG.weather.retryDelay, () =>
          refresh(),
        );
      }
    } finally {
      endDots();
      busy = false;
    }
  }

  /** Reintento manual, el del boton. */
  function retry() {
    if (!running || busy) return;
    clearTimers();
    refresh();
  }

  return {
    /** Arranca y devuelve la promesa del primer intento, como el fondo. */
    start() {
      running = true;

      $retry.textContent = CONFIG.messages.retry;
      $retry.addEventListener("click", retry);

      return refresh();
    },

    stop() {
      running = false;
      clearTimers();
      abort?.abort();
      abort = null;
      endDots();
      $retry.removeEventListener("click", retry);
    },

    retry,
  };
}
