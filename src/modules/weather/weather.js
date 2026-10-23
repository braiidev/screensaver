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
import {
  convertTemperatureDelta,
  formatTemperature,
} from "../../utils/units.js";

/**
 * @param {Object} elements
 * @param {HTMLElement} elements.$weather donde va la temperatura
 * @param {HTMLElement} elements.$icon donde va el icono
 * @param {HTMLElement} elements.$location donde va la localizacion
 * @param {HTMLElement} elements.$condition donde va la condicion del cielo
 * @param {HTMLElement} elements.$feels donde va la sensacion termica
 * @param {HTMLElement} elements.$extras la fila de extras
 * @param {HTMLElement} elements.$sun amanecer y atardecer
 * @param {HTMLElement} elements.$wind viento
 * @param {HTMLElement} elements.$huUv humedad y UV
 * @param {HTMLElement} elements.$trend tendencia frente a hace una hora
 * @param {HTMLElement} elements.$hourly tira de proximas horas
 * @param {HTMLElement} elements.$forecast donde va la tira del pronostico
 * @param {HTMLElement} elements.$retry boton de reintentar
 * @param {Object} deps
 * @param {import("../../core/store.js")} deps.store
 * @param {import("../../core/scheduler.js")} deps.scheduler
 */
export function createWeather(
  {
    $weather,
    $icon,
    $location,
    $condition,
    $feels,
    $extras,
    $sun,
    $wind,
    $huUv,
    $trend,
    $hourly,
    $forecast,
    $retry,
  },
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

  /** El UV, con un decimal solo cuando hace falta. */
  const uvFormat = new Intl.NumberFormat(CONFIG.app.locale, {
    maximumFractionDigits: 1,
  });

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
      $hourly.textContent = "";
      $hourly.hidden = true;
      resetExtra($sun);
      resetExtra($wind);
      resetExtra($huUv);
      resetExtra($trend);
      $trend.className = "card__trend";
      $extras.hidden = true;
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

  /** "2026-10-22T06:02" -> "06:02". La API ya la manda en hora local. */
  function clockTime(value) {
    return typeof value === "string" && value.length >= 16
      ? value.slice(11, 16)
      : null;
  }

  /**
   * Si una hora cae entre el amanecer y el atardecer de su dia. Asi la tira
   * horaria no pinta un sol a medianoche. Sin datos del dia, se asume de dia.
   */
  function isDayAt(time, daily) {
    const date = time?.slice(0, 10);
    const day = daily.find((item) => item.date === date);
    const sunrise = clockTime(day?.sunrise);
    const sunset = clockTime(day?.sunset);
    const hour = clockTime(time);

    if (!sunrise || !sunset || !hour) return true;
    return hour >= sunrise && hour < sunset;
  }

  /** Un `<span>` de texto, sin pasar por `innerHTML`. */
  function textSpan(className, text) {
    const $span = document.createElement("span");
    $span.className = className;
    $span.textContent = text;
    return $span;
  }

  /** Un icono de `ui/icons.js` dentro de un extra. */
  function extraIcon(icon, tone) {
    const $icon = document.createElement("span");
    $icon.className = "meteo-icon";
    $icon.dataset.tone = tone;
    $icon.innerHTML = iconFor(icon);
    $icon.setAttribute("aria-hidden", "true");
    return $icon;
  }

  /** Deja un extra vacio y oculto antes de decidir si se pinta. */
  function resetExtra($element) {
    $element.textContent = "";
    $element.hidden = true;
    $element.removeAttribute("aria-label");
  }

  /** El separador entre las dos mitades de un extra (sol, humedad/UV). */
  function extraSeparator($element) {
    const $separator = textSpan("extra__sep", "·");
    $separator.setAttribute("aria-hidden", "true");
    $element.append($separator);
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
   * La fila de extras: sol, viento, humedad/UV y tendencia.
   *
   * Cada bloque se apaga por su interruptor y tambien cuando la API no manda
   * el dato. La fila entera se oculta si no queda ninguno, para no dejar un
   * hueco con margen. El UV solo se pinta de dia: de noche siempre es cero.
   */
  function renderExtras({ current, daily, uvIndex, previousTemperature }) {
    const units = store.get("units");
    const today = daily?.[0];

    const sunrise = clockTime(today?.sunrise);
    const sunset = clockTime(today?.sunset);
    resetExtra($sun);
    if (store.get("sun") !== false && (sunrise || sunset)) {
      $sun.hidden = false;
      if (sunrise) $sun.append(extraIcon("sunrise", "sun"), textSpan("", sunrise));
      if (sunrise && sunset) extraSeparator($sun);
      if (sunset) $sun.append(extraIcon("sunset", "sun"), textSpan("", sunset));
      $sun.setAttribute(
        "aria-label",
        [
          sunrise ? `${CONFIG.messages.sunrise} ${sunrise}` : "",
          sunset ? `${CONFIG.messages.sunset} ${sunset}` : "",
        ]
          .filter(Boolean)
          .join(", "),
      );
    }

    const wind = Number.isFinite(current.windSpeed)
      ? Math.round(current.windSpeed)
      : null;
    resetExtra($wind);
    if (store.get("wind") !== false && wind !== null) {
      $wind.hidden = false;
      $wind.append(
        extraIcon("wind", "cloud"),
        textSpan("", `${wind} km/h`),
      );
      $wind.setAttribute("aria-label", `${CONFIG.messages.wind} ${wind} km/h`);
    }

    const humidity = Number.isFinite(current.humidity)
      ? Math.round(current.humidity)
      : null;
    const uv = current.isDay && Number.isFinite(uvIndex) ? uvIndex : null;
    resetExtra($huUv);
    if (store.get("humidityUv") !== false && (humidity !== null || uv !== null)) {
      $huUv.hidden = false;

      const label = [];
      if (humidity !== null) {
        $huUv.append(
          extraIcon("droplet", "rain"),
          textSpan("", `${humidity}%`),
        );
        label.push(`${CONFIG.messages.humidity} ${humidity}%`);
      }
      if (humidity !== null && uv !== null) extraSeparator($huUv);
      if (uv !== null) {
        const text = uvFormat.format(uv);
        $huUv.append(
          extraIcon("sun", "sun"),
          textSpan("", `${CONFIG.messages.uv} ${text}`),
        );
        label.push(`${CONFIG.messages.uv} ${text}`);
      }

      $huUv.setAttribute("aria-label", label.join(", "));
    }

    const delta = Number.isFinite(previousTemperature)
      ? current.temperature - previousTemperature
      : null;
    resetExtra($trend);
    $trend.className = "card__trend";
    if (store.get("trend") !== false && delta !== null && Number.isFinite(delta)) {
      const value = Math.round(convertTemperatureDelta(delta, units));
      $trend.hidden = false;
      $trend.classList.add(value > 0 ? "up" : value < 0 ? "down" : "eq");

      if (value === 0) {
        $trend.setAttribute(
          "aria-label",
          `${CONFIG.messages.trendSame} ${CONFIG.messages.trendAgo}`,
        );
      } else {
        const amount = `${Math.abs(value)}°`;
        const verb =
          value > 0 ? CONFIG.messages.trendUp : CONFIG.messages.trendDown;
        $trend.textContent = amount;
        $trend.setAttribute(
          "aria-label",
          `${verb} ${amount} ${CONFIG.messages.trendAgo}`,
        );
      }
    }

    $extras.hidden =
      $sun.hidden && $wind.hidden && $huUv.hidden && $trend.hidden;
  }

  /**
   * La tira de proximas horas.
   *
   * Cada celda lleva la hora, el icono, la temperatura y, solo cuando supera
   * el umbral, la probabilidad de lluvia. La rejilla envuelve sola: con 5
   * horas entra en una fila en el movil y en la TV, y con 8 o 12 pasa a dos.
   */
  function renderHourly(hours, daily) {
    $hourly.textContent = "";
    $hourly.setAttribute("aria-label", CONFIG.messages.nextHours);
    const visible = store.get("nextHours") !== false && hours.length > 0;
    $hourly.hidden = !visible;
    if (!visible) return;

    hours.forEach((hour) => {
      const time = clockTime(hour.time) ?? "--:--";
      const { label, icon } = identify(hour.code, isDayAt(hour.time, daily));
      const temperature = degrees(hour.temperature);
      const pop = Math.round(hour.precipitationProbability ?? 0);
      const hasPop =
        Number.isFinite(hour.precipitationProbability) &&
        pop >= CONFIG.weather.rainChanceThreshold;

      const $item = document.createElement("li");
      $item.className = "hourly__item";
      $item.setAttribute(
        "aria-label",
        `${time}: ${label}, ${temperature}` +
          (hasPop ? `, ${CONFIG.messages.rainChance} ${pop}%` : ""),
      );

      const $icon = extraIcon(icon, icon);
      $icon.classList.add("hourly__icon");

      const $pop = textSpan("hourly__pop", hasPop ? `${pop}%` : "");
      $pop.hidden = !hasPop;

      $item.append(
        textSpan("hourly__time", time),
        $icon,
        textSpan("hourly__temp", temperature),
        $pop,
      );
      $hourly.append($item);
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
    const { current, daily, hourly, timezone } = weather;
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
    renderExtras(weather);
    renderHourly(hourly ?? [], daily ?? []);

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
    resetExtra($sun);
    resetExtra($wind);
    resetExtra($huUv);
    resetExtra($trend);
    $trend.className = "card__trend";
    $extras.hidden = true;
    $hourly.textContent = "";
    $hourly.hidden = true;
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
  const offNextHours = store.subscribe("nextHours", repaint);
  const offSun = store.subscribe("sun", repaint);
  const offWind = store.subscribe("wind", repaint);
  const offHuUv = store.subscribe("humidityUv", repaint);
  const offTrend = store.subscribe("trend", repaint);

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
      offNextHours();
      offSun();
      offWind();
      offHuUv();
      offTrend();
    },

    retry,

    /** Para las pruebas: la ciudad que se esta pintando. */
    get city() {
      return city;
    },
  };
}
