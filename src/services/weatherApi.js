/**
 * weatherApi.js - El tiempo, tal como lo devuelve Open-Meteo.
 *
 * Traduce la respuesta cruda de la API a los datos que la app necesita, para
 * que el modulo del clima no tenga que saber como se llaman los campos de
 * Open-Meteo ni como viene `is_day`.
 *
 * El bloque `current` y el bloque `daily` viajan en la misma peticion: el
 * pronostico no cuesta una llamada extra.
 */

import { CONFIG } from "../config.js";
import { getJSON } from "./http.js";

/**
 * @param {Object} options
 * @param {number} options.latitude
 * @param {number} options.longitude
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{
 *   current: {temperature: number, apparentTemperature: number, code: number, isDay: boolean},
 *   daily: Array<{date: string, code: number, max: number, min: number}>,
 *   timezone: string,
 * }>}
 */
export async function fetchWeather({ latitude, longitude, signal }) {
  const url =
    `${CONFIG.endpoints.forecast}?latitude=${latitude}&longitude=${longitude}` +
    `&current=${CONFIG.weather.currentFields.join(",")}` +
    `&daily=${CONFIG.weather.dailyFields.join(",")}` +
    `&timezone=${CONFIG.weather.timezone}` +
    `&forecast_days=${CONFIG.weather.forecastDays}`;

  const data = await getJSON(url, { signal, retries: CONFIG.weather.retries });
  const { temperature_2m, apparent_temperature, weather_code, is_day } =
    data.current;

  return {
    current: {
      temperature: temperature_2m,
      apparentTemperature: apparent_temperature,
      code: weather_code,
      isDay: is_day === 1,
    },
    daily: toDaily(data.daily),
    // Con `timezone=auto` la API devuelve la zona IANA de las coordenadas.
    timezone: data.timezone,
  };
}

/**
 * El pronostico, de una lista de columnas a una lista de dias.
 *
 * Open-Meteo devuelve el bloque `daily` como columnas paralelas; la app quiere
 * una fila por dia. Si el bloque falta o viene incompleto se devuelve lo que
 * haya, y si no hay nada, una lista vacia: el pronostico es lo unico que puede
 * faltar sin que la ficha se quede sin temperatura.
 *
 * @param {{time?: string[], weather_code?: number[], temperature_2m_max?: number[], temperature_2m_min?: number[]}} [daily]
 * @returns {Array<{date: string, code: number, max: number, min: number}>}
 */
function toDaily(daily) {
  const dates = daily?.time ?? [];

  return dates.map((date, i) => ({
    date,
    code: daily.weather_code?.[i],
    max: daily.temperature_2m_max?.[i],
    min: daily.temperature_2m_min?.[i],
  }));
}
