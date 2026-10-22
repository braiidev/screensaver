/**
 * geo.js - De donde esta la app.
 *
 * Primero se le pregunta al navegador, que da la posicion exacta pero necesita
 * permiso. Si no lo hay, si tarda demasiado o si el navegador no sabe hacerlo,
 * se pregunta a un servicio de IP, que da una posicion aproximada.
 *
 * En los dos casos se devuelve lo mismo: coordenadas y un nombre para poner en
 * pantalla. El nombre se busca aparte, porque las coordenadas solas no dicen
 * "Madrid".
 */

import { CONFIG } from "../config.js";
import { getJSON } from "./http.js";

/**
 * La posicion del navegador, si el usuario la concede.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<{latitude: number, longitude: number, source: string} | null>}
 */
function devicePosition(signal) {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }

    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      resolve(value);
    };
    const onAbort = () => finish(null);

    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          finish({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            source: "device",
          }),
        // Permiso denegado, tiempo agotado o posicion no disponible: da igual
        // el motivo, se pasa al respaldo.
        () => finish(null),
        {
          timeout: CONFIG.geo.timeout,
          maximumAge: CONFIG.geo.maximumAge,
        },
      );
    } catch {
      finish(null);
    }
  });
}

/**
 * Busca el nombre del sitio de unas coordenadas.
 *
 * @returns {Promise<{city: string, country: string}>}
 */
async function placeName(latitude, longitude, signal) {
  try {
    const data = await getJSON(
      `${CONFIG.endpoints.reverseGeocode}?latitude=${latitude}&longitude=${longitude}` +
        `&localityLanguage=${CONFIG.app.language}`,
      { signal, retries: 1 },
    );

    return {
      city: data.city || data.locality || data.principalSubdivision || "",
      country: data.countryName || "",
    };
  } catch {
    // Sin nombre se sigue: las coordenadas bastan para pedir el clima.
    return { city: "", country: "" };
  }
}

/**
 * La posicion por IP, que no necesita permiso.
 */
async function ipPosition(signal) {
  const data = await getJSON(CONFIG.geo.fallbackUrl, { signal, retries: 1 });

  if (typeof data?.latitude !== "number" || typeof data?.longitude !== "number") {
    throw new Error("La respuesta de la IP no trae coordenadas");
  }

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    city: data.cityName || "",
    country: data.countryName || "",
    source: "ip",
  };
}

/**
 * Donde esta la app.
 *
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{latitude: number, longitude: number, city: string, country: string, source: string}>}
 */
export async function locate({ signal } = {}) {
  const device = await devicePosition(signal);

  if (device) {
    const { city, country } = await placeName(device.latitude, device.longitude, signal);
    return { ...device, city, country };
  }

  return ipPosition(signal);
}

/**
 * Un nombre para poner en pantalla a partir de una posicion.
 *
 * Si no hay nombre se usan las coordenadas, que siempre son algo.
 *
 * @param {{ city?: string, country?: string, latitude: number, longitude: number }} place
 */
export function formatPlace(place) {
  const { city = "", country = "", latitude = 0, longitude = 0 } = place || {};

  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
}
