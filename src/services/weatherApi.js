/**
 * weatherApi.js - El tiempo, tal como lo devuelve Open-Meteo.
 *
 * Traduce la respuesta cruda de la API a los cuatro datos que la app necesita,
 * para que el modulo del clima no tenga que saber como se llaman los campos de
 * Open-Meteo ni como viene `is_day`.
 */

import { CONFIG } from "../config.js";
import { getJSON } from "./http.js";

/**
 * @param {Object} options
 * @param {number} options.latitude
 * @param {number} options.longitude
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{temperature: number, code: number, isDay: boolean, timezone: string}>}
 */
export async function fetchCurrent({ latitude, longitude, signal }) {
  const url =
    `${CONFIG.endpoints.forecast}?latitude=${latitude}&longitude=${longitude}` +
    `&current=${CONFIG.weather.currentFields.join(",")}` +
    `&timezone=${CONFIG.weather.timezone}` +
    `&forecast_days=${CONFIG.weather.forecastDays}`;

  const data = await getJSON(url, { signal, retries: CONFIG.weather.retries });
  const { temperature_2m, weather_code, is_day } = data.current;

  return {
    temperature: temperature_2m,
    code: weather_code,
    isDay: is_day === 1,
    // Con `timezone=auto` la API devuelve la zona IANA de las coordenadas.
    timezone: data.timezone,
  };
}
