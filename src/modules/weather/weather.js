/**
 * weather.js - El bloque del clima.
 *
 * Pide la localizacion, luego el tiempo, y lo refresca cada cierto rato.
 *
 * Este modulo todavia no usa los servicios definitivos: eso llega en la
 * Fase 2, junto con la reparacion de los dos fallos que quedan aqui (el
 * reintento se calendariza dos veces y la localizacion no se vuelve a
 * intentar si falla). Por ahora la logica es la misma de siempre, solo
 * cambia de sitio y de forma: es un modulo con start y stop, y sus
 * temporizadores salen del scheduler para poder pararlos.
 */

import { CONFIG } from "../../config.js";
import setIcon from "../../data/wno.js";

/**
 * Escribe los puntos de "cargando" mientras se espera una respuesta.
 *
 * @param {HTMLElement} $element donde van los puntos
 * @param {import("../../core/scheduler.js")} scheduler
 * @returns {() => void} funcion para parar los puntos
 */
function loading($element, scheduler) {
  $element.style.letterSpacing = CONFIG.loading.letterSpacing;
  $element.textContent = "";

  const stop = scheduler.every(CONFIG.loading.interval, () => {
    let dots = $element.textContent;
    if (dots.length === CONFIG.loading.dots) dots = "";
    else dots += ".";
    $element.textContent = dots;
  });

  return () => {
    $element.style.letterSpacing = "normal";
    stop();
  };
}

/**
 * @param {Object} elements
 * @param {HTMLElement} elements.$weather donde va la temperatura
 * @param {HTMLElement} elements.$icon donde va el icono
 * @param {HTMLElement} elements.$location donde va la localizacion
 * @param {Object} deps
 * @param {import("../../core/scheduler.js")} deps.scheduler
 */
export function createWeather({ $weather, $icon, $location }, { scheduler }) {
  const status = { geo: "unload", weather: "unload" };
  const refreshMs = CONFIG.weather.refreshInterval * CONFIG.time.minute;

  let statusMessage = CONFIG.messages.appUnloaded;
  let lat = 0;
  let lon = 0;
  let city = "";
  let country = "";
  let regionName = "";
  let intervalId = null;
  /** Reintentos pendientes de borrar al parar. */
  const retries = new Set();

  /**
   * Localizacion por IP. Si falla, no se vuelve a intentar: eso se arregla
   * en la Fase 2.
   */
  async function requestGeolocation() {
    const destroy = loading($location, scheduler);

    try {
      const resp = await fetch(CONFIG.geo.fallbackUrl);
      if (!resp.ok) throw new Error("HTTP Error");
      if ($location.classList.contains("warning")) $location.classList.remove("warning");

      const data = await resp.json();

      const { latitude, longitude, cityName, countryName, regionName: region } = data;
      lat = latitude;
      lon = longitude;
      city = cityName;
      country = countryName;
      regionName = region;

      const location = `${city}, ${country}`;

      destroy();
      if (location !== $location.textContent) $location.textContent = location;

      status.geo = "loaded";
      statusMessage = null;
    } catch (e) {
      destroy();
      $location.textContent = CONFIG.messages.locationError;
      $location.classList.add("warning");

      status.geo = "error";
      statusMessage = CONFIG.messages.geoError;
      console.error(statusMessage);
    }
  }

  /**
   * Pide el tiempo de una posicion.
   */
  async function fetchWeather(latitude = lat, longitude = lon) {
    const url = `${CONFIG.endpoints.forecast}?latitude=${latitude}&longitude=${longitude}&current=${CONFIG.weather.currentFields.join(",")}&timezone=${CONFIG.weather.timezone}&forecast_days=${CONFIG.weather.forecastDays}`;
    const destroy = loading($weather, scheduler);

    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("HTTP Error");

      if ($weather.classList.contains("warning")) $weather.classList.remove("warning");

      const data = await resp.json();
      const { temperature_2m, weather_code, is_day } = data.current;

      destroy();
      $weather.textContent = `${temperature_2m}˚`;
      $icon.style.backgroundImage = setIcon(weather_code, is_day);

      status.weather = "loaded";
      statusMessage = null;
    } catch (e) {
      destroy();
      $weather.textContent = CONFIG.messages.weatherError;
      $weather.classList.add("warning");

      status.weather = "error";
      statusMessage = CONFIG.messages.weatherUnavailable;

      console.error(statusMessage);
    }
  }

  /**
   * Refresca el tiempo cada cierto rato.
   *
   * Ojo: si el tiempo falla, el reintento se calendariza aqui y ademas
   * sigue el refresco periodico, asi que hay dos relojes en marcha. Es un
   * fallo conocido, se arregla en la Fase 2.
   */
  async function update() {
    if (status.geo !== "loaded") return;
    if (intervalId) return;

    const run = async () => {
      await fetchWeather(lat, lon);

      if (status.weather !== "loaded") {
        const cancel = scheduler.after(refreshMs, async () => {
          retries.delete(cancel);
          await run();
        });
        retries.add(cancel);
        return;
      }
    };

    await run();

    intervalId = scheduler.every(refreshMs, run);
  }

  return {
    async start() {
      await requestGeolocation();
      if (status.geo === "loaded") {
        await update();
      } else {
        console.error(statusMessage);
      }
    },

    stop() {
      intervalId?.();
      intervalId = null;
      for (const cancel of retries) cancel();
      retries.clear();
    },
  };
}
