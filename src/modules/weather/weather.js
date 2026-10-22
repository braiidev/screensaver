/**
 * weather.js - La ficha del clima.
 *
 * Pinta el tiempo de la ciudad activa del store y lo refresca cada cierto
 * rato. Si no hay ninguna ciudad todavia (primer arranque), la localiza una
 * vez y la guarda, de modo que a partir de ahi se abre directo en ella sin
 * volver a pedir permiso.
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
 * Cambiar de ciudad es una interrupcion, no un refresco: el intento que
 * estuviera en vuelo se cancela y empieza otro. Por eso hay una `generation`
 * y no un booleano de "ocupado": el intento viejo, al terminar, no puede
 * pisar lo que esta pintando el nuevo.
 */

import { CONFIG } from "../../config.js";
import { identify } from "../../data/wno.js";
import { iconFor } from "../../ui/icons.js";
import { formatPlace, locate } from "../../services/geo.js";
import { fetchWeather } from "../../services/weatherApi.js";
import { toCity } from "../../utils/city.js";
import { createDayFormat } from "../../utils/time.js";
import { formatTemperature } from "../../utils/units.js";

/**
 * @param {Object} elements
 * @param {HTMLElement} elements.$weather donde va la temperatura
 * @param {HTMLElement} elements.$icon donde va el icono
 * @param {HTMLElement} elements.$location donde va la localizacion
 * @param {HTMLElement} elements.$condition donde va la condicion del cielo
 * @param {HTMLElement} elements.$feels donde va la sensacion termica
 * @param {HTMLElement} elements.$forecast donde va la tira del pronostico
 * @param {HTMLElement} elements.$retry boton de reintentar
 * @param {Object} deps
 * @param {import("../../core/store.js")} deps.store
 * @param {import("../../core/scheduler.js")} deps.scheduler
 */
export function createWeather(
  { $weather, $icon, $location, $condition, $feels, $forecast, $retry },
  { store, scheduler },
) {
  const refreshMs = CONFIG.weather.refreshInterval * CONFIG.time.minute;

  /** La ciudad que se esta pintando. */
  let city = null;
  /** La ultima lectura buena, para repintarla si cambia un ajuste. */
  let last = null;
  /** Si hay una lectura buena en pantalla. Decide si un fallo puede callarse. */
  let hasData = false;
  let running = false;
  /** Sube con cada intento: solo el ultimo tiene derecho a pintar. */
  let generation = 0;
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

  function cities() {
    return store.get("cities") ?? [];
  }

  /** La ciudad del store que toca pintar, o null si no hay ninguna. */
  function activeCity() {
    const list = cities();
    if (list.length === 0) return null;
    const id = store.get("activeCityId");
    return list.find((item) => item.id === id) ?? list[0];
  }

  /**
   * Guarda una ciudad y la deja activa. Si ya estaba no se duplica: buscar dos
   * veces el mismo sitio no puede llenar la fila de chips de repetidos.
   *
   * @returns {Object} la ciudad que ha quedado activa
   */
  function addCity(next) {
    if (!next) return null;

    const list = cities();
    const existing = list.find((item) => item.id === next.id);
    if (!existing) store.set("cities", [...list, next].slice(0, CONFIG.cities.max));

    store.set("activeCityId", next.id);
    return existing ?? next;
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

  /** "21°" en la unidad elegida, o "--" si la API no mando el dato. */
  function degrees(value) {
    return formatTemperature(value, store.get("units"));
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

  /**
   * La zona horaria que devuelve la API se guarda en el store y tambien en la
   * ciudad: asi el reloj cambia de hora al instante la proxima vez que se
   * elija, sin esperar a que responda el clima.
   */
  function rememberTimezone(timezone) {
    if (!city || !timezone) return;

    if (city.timezone !== timezone) {
      const updated = { ...city, timezone };
      store.set(
        "cities",
        cities().map((item) => (item.id === city.id ? updated : item)),
      );
      city = updated;
    }

    store.set("timezone", timezone);
  }

  function render(weather) {
    const { current, daily, timezone } = weather;
    last = weather;

    $weather.classList.remove("warning");
    $location.classList.remove("warning");
    $retry.hidden = true;

    const { label, icon } = identify(current.code, current.isDay);

    $weather.textContent = degrees(current.temperature);
    $condition.textContent = label;

    // La sensacion termica se puede apagar, y ademas la API puede no mandarla.
    const feels = degrees(current.apparentTemperature);
    $feels.textContent = `${CONFIG.messages.feelsLike} ${feels}`;
    $feels.hidden = !store.get("feelsLike") || feels === "--";

    $icon.dataset.tone = icon;
    $icon.innerHTML = iconFor(icon);

    $forecast.hidden = store.get("forecast") === false;
    renderForecast(daily ?? []);

    hasData = true;
    rememberTimezone(timezone);
  }

  /** Cambiar un ajuste no vuelve a pedir el tiempo: se repinta lo que hay. */
  function repaint() {
    if (last) render(last);
  }

  /**
   * Deja la ficha lista para otra ciudad: el nombre nuevo ya, y el resto a la
   * espera. Los grados de la ciudad anterior no se quedan bajo el nombre de la
   * nueva, porque durante unos segundos serian una mentira.
   */
  function adopt(next) {
    city = next;
    hasData = false;

    $weather.textContent = "";
    $weather.classList.remove("warning");
    $location.classList.remove("warning");
    last = null;
    $condition.textContent = "";
    $feels.textContent = "";
    $feels.hidden = true;
    $icon.innerHTML = "";
    $icon.removeAttribute("data-tone");
    $forecast.textContent = "";
    $retry.hidden = true;
    $location.textContent = next ? formatPlace(next) : "";

    // Si la zona ya se conoce, el reloj cambia ahora y no cuando llegue el
    // clima. No hay parpadeo: el reloj solo escucha la clave.
    if (next?.timezone) store.set("timezone", next.timezone);
  }

  /**
   * Un intento completo: localizar si no hay ciudad y pedir el tiempo.
   *
   * @param {{ silent?: boolean }} [options] silencioso: no borra lo que ya
   *   hay en pantalla mientras refresca
   */
  async function refresh({ silent = false } = {}) {
    if (!running) return;

    const gen = ++generation;
    clearTimers();
    abort?.abort();

    const controller = new AbortController();
    abort = controller;
    const { signal } = controller;
    const interrupted = () => gen !== generation || signal.aborted;

    try {
      if (!city) {
        startDots($location);
        const place = await locate({ signal });
        if (interrupted()) return;
        endDots();

        addCity(toCity(place));
        // Guardar la ciudad avisa a quien escucha, y ese aviso ya ha arrancado
        // otro intento con la ciudad nueva. Este se retira.
        if (interrupted()) return;
        adopt(activeCity());
      }

      if (!silent) startDots($weather);

      const weather = await fetchWeather({
        latitude: city.latitude,
        longitude: city.longitude,
        signal,
      });
      if (interrupted()) return;

      render(weather);

      refreshTimer = scheduler.after(refreshMs, () =>
        refresh({ silent: true }),
      );
    } catch (error) {
      // Si lo que pasa es que nos han parado, no es un fallo.
      if (interrupted()) return;

      showError(error, { onLocation: !city });
      retryTimer = scheduler.after(CONFIG.weather.retryDelay, () => refresh());
    } finally {
      if (!interrupted()) endDots();
    }
  }

  /** Reintento manual, el del boton. */
  function retry() {
    if (!running) return;
    refresh();
  }

  /** Cambiar de ciudad interrumpe lo que hubiera en vuelo. */
  function onCityChange() {
    if (!running) return;

    const next = activeCity();
    if (next?.id === city?.id) return;

    adopt(next);
    refresh();
  }

  const offCity = store.subscribe("activeCityId", onCityChange);
  const offCities = store.subscribe("cities", onCityChange);
  const offUnits = store.subscribe("units", repaint);
  const offForecast = store.subscribe("forecast", repaint);
  const offFeels = store.subscribe("feelsLike", repaint);

  return {
    /** Arranca y devuelve la promesa del primer intento, como el fondo. */
    start() {
      running = true;

      $retry.textContent = CONFIG.messages.retry;
      $retry.addEventListener("click", retry);

      const stored = activeCity();
      if (stored) adopt(stored);

      return refresh();
    },

    stop() {
      running = false;
      generation++;
      clearTimers();
      abort?.abort();
      abort = null;
      endDots();
      $retry.removeEventListener("click", retry);
      offCity();
      offCities();
      offUnits();
      offForecast();
      offFeels();
    },

    retry,

    /** Para las pruebas: la ciudad que se esta pintando. */
    get city() {
      return city;
    },
  };
}
