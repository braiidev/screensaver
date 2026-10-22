/**
 * weather.js - La ficha del clima.
 *
 * Pide la localizacion, luego el tiempo con su pronostico, y lo refresca cada
 * cierto rato.
 *
 * Tres reglas que se arreglaron aqui y conviene no romper:
 *
 *   1. Un solo temporizador. Antes, si el tiempo fallaba, el reintento se
 *      calendarizaba a mano y ademas seguia el refresco periodico: dos relojes
 *      encadenando peticiones que se multiplicaban. Ahora `clearTimers()` se
 *      llama antes de cada intento y siempre queda uno solo.
 *   2. La localizacion se reintenta. Antes, si fallaba, `place` se quedaba a
 *      null para siempre y la app no volvia a pedir ciudad nunca. Ahora el
 *      fallo entra por el mismo camino que el del tiempo y se reintenta.
 *   3. Un fallo de red no borra un dato bueno. Si ya hay temperatura en
 *      pantalla, el refresco fallido se queda callado: la ficha sigue
 *      mostrando la ultima lectura mientras el reintento va por detras. El
 *      aviso y el boton son para cuando no hay nada que enseñar.
 *
 * La zona horaria que devuelve la API se guarda en el store, de modo que el
 * reloj pasa a mostrar la hora del sitio del que se habla y no la del aparato.
 */

import { CONFIG } from "../../config.js";
import { identify } from "../../data/wno.js";
import { iconFor } from "../../ui/icons.js";
import { formatPlace, locate } from "../../services/geo.js";
import { fetchWeather } from "../../services/weatherApi.js";
import { createDayFormat } from "../../utils/time.js";

/**
 * @param {Object} elements
 * @param {HTMLElement} elements.$weather donde va la temperatura
 * @param {HTMLElement} elements.$icon donde va el icono
 * @param {HTMLElement} elements.$location donde va la localizacion
 * @param {HTMLElement} elements.$condition donde va la condicion del cielo
 * @param {HTMLElement} elements.$forecast donde va la tira del pronostico
 * @param {HTMLElement} elements.$retry boton de reintentar
 * @param {Object} deps
 * @param {import("../../core/store.js")} deps.store
 * @param {import("../../core/scheduler.js")} deps.scheduler
 */
export function createWeather(
  { $weather, $icon, $location, $condition, $forecast, $retry },
  { store, scheduler },
) {
  const refreshMs = CONFIG.weather.refreshInterval * CONFIG.time.minute;

  /** Coordenadas y nombre ya resueltos, para no repetir la localizacion. */
  let place = null;
  /** Si hay una lectura buena en pantalla. Decide si un fallo puede callarse. */
  let hasData = false;
  let running = false;
  let busy = false;
  let refreshTimer = null;
  let retryTimer = null;
  let abort = null;
  let stopDots = null;

  /** El formateador de dias. La fecha del pronostico no depende de la zona. */
  const dayFormat = createDayFormat();

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
    // Con una lectura buena en pantalla, el fallo se queda en la consola.
    if (!onLocation && hasData) {
      console.error(error?.message ?? error);
      return;
    }

    $retry.hidden = false;

    const $target = onLocation ? $location : $weather;
    $target.textContent = onLocation
      ? CONFIG.messages.locationError
      : CONFIG.messages.weatherError;
    $target.classList.add("warning");

    // Si lo que falta es el tiempo, lo que habia al lado ya no vale: ni el
    // icono, ni la condicion, ni el pronostico de dentro de un rato.
    if (!onLocation) {
      $condition.textContent = "";
      $icon.innerHTML = "";
      $icon.removeAttribute("data-tone");
      $forecast.textContent = "";
    }

    console.error(error?.message ?? error);
  }

  /** "21°", o "--" si la API no mando el dato. */
  function degrees(value) {
    return Number.isFinite(value) ? `${Math.round(value)}°` : "--";
  }

  /** "jue" -> "Jue". `Intl` los devuelve en minuscula. */
  function dayLabel(isoDate) {
    const label = dayFormat(isoDate);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  /**
   * La tira de dias, una celda por dia.
   *
   * Se construye con `createElement` y no con una plantilla de HTML: los
   * nombres vienen de `Intl` y los numeros de la API, y asi no hay forma de
   * que un texto acabe interpretado como marcado.
   *
   * El icono del pronostico es el de dia: un dia entero no tiene noche.
   */
  function renderForecast(daily) {
    $forecast.textContent = "";

    daily.forEach((day, index) => {
      const { icon } = identify(day.code, true);
      const name = index === 0 ? CONFIG.messages.today : dayLabel(day.date);

      const $day = document.createElement("li");
      $day.className = "forecast__day";
      $day.setAttribute(
        "aria-label",
        `${name}: ${CONFIG.messages.forecastMax} ${degrees(day.max)}, ` +
          `${CONFIG.messages.forecastMin} ${degrees(day.min)}`,
      );

      const $name = document.createElement("span");
      $name.className = "forecast__name";
      $name.textContent = name;

      const $dayIcon = document.createElement("span");
      $dayIcon.className = "meteo-icon forecast__icon";
      $dayIcon.dataset.tone = icon;
      $dayIcon.innerHTML = iconFor(icon);
      $dayIcon.setAttribute("aria-hidden", "true");

      const $max = document.createElement("span");
      $max.className = "forecast__max";
      $max.textContent = degrees(day.max);

      const $min = document.createElement("span");
      $min.className = "forecast__min";
      $min.textContent = degrees(day.min);

      $day.append($name, $dayIcon, $max, $min);
      $forecast.append($day);
    });
  }

  function render({ current, daily, timezone }) {
    $weather.classList.remove("warning");
    $location.classList.remove("warning");
    $retry.hidden = true;

    const { label, icon } = identify(current.code, current.isDay);

    $weather.textContent = degrees(current.temperature);
    $condition.textContent = label;
    $icon.dataset.tone = icon;
    $icon.innerHTML = iconFor(icon);

    renderForecast(daily ?? []);

    hasData = true;

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

      const weather = await fetchWeather({ ...place, signal });
      render(weather);

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
