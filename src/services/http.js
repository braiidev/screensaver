/**
 * http.js - Las peticiones de red.
 *
 * Un solo sitio para hablar con el exterior. Ningun modulo llama a `fetch`
 * directamente: piden datos a `services/`, y los servicios pasan por aqui.
 *
 * Cada intento lleva su propio tiempo limite. Si se agota, se cancela con
 * `AbortController` en vez de quedarse esperando para siempre. Los reintentos
 * esperan un poco mas cada vez, para no machacar a un servidor que ya esta
 * caido.
 *
 * Todo se puede cancelar desde fuera con una `AbortSignal`, que es lo que usa
 * un modulo al pararse.
 */

import { CONFIG } from "../config.js";

/**
 * Un fallo de red o una respuesta que no es 2xx.
 */
export class HttpError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, url?: string, cause?: unknown }} [details]
   */
  constructor(message, { status = 0, url = "", cause = null } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
    this.cause = cause;
  }
}

/**
 * Espera `ms` milisegundos, o menos si la peticion se cancela.
 *
 * @param {number} ms
 * @param {AbortSignal} [signal]
 */
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Cancelado", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }

    function onAbort() {
      cleanup();
      reject(new DOMException("Cancelado", "AbortError"));
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Un solo intento: pide la url, la lee como JSON y la devuelve.
 *
 * No basta con pedirle a `fetch` que se cancele: se resuelve a mano en cuanto
 * llega la respuesta, se agota el tiempo o se cancela desde fuera. Asi un
 * `fetch` que se quede colgado no puede colgar la app.
 */
function attempt(url, { timeout, signal }) {
  const controller = new AbortController();

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;

    const cleanup = () => {
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };

    const succeed = (value) => {
      if (settled) return;
      cleanup();
      resolve(value);
    };

    const fail = (error) => {
      if (settled) return;
      cleanup();
      reject(error);
    };

    function onAbort() {
      controller.abort();
      fail(new DOMException("Cancelado", "AbortError"));
    }

    timer = setTimeout(() => {
      controller.abort();
      fail(new HttpError("Tiempo agotado", { url }));
    }, timeout);

    if (signal?.aborted) {
      onAbort();
      return;
    }

    signal?.addEventListener("abort", onAbort, { once: true });

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          fail(
            new HttpError(`HTTP ${response.status}`, {
              status: response.status,
              url,
            }),
          );
          return;
        }

        succeed(await response.json());
      })
      .catch((error) => {
        fail(
          error instanceof HttpError
            ? error
            : new HttpError("No se pudo completar la peticion", {
                url,
                cause: error,
              }),
        );
      });
  });
}

/**
 * Pide una url y devuelve el JSON.
 *
 * @param {string} url
 * @param {Object} [options]
 * @param {number} [options.timeout] milisegundos por intento
 * @param {number} [options.retries] intentos extra despues del primero
 * @param {number} [options.backoff] espera del primer reintento, que se duplica
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<any>}
 */
export async function getJSON(
  url,
  {
    timeout = CONFIG.http.timeout,
    retries = 0,
    backoff = CONFIG.http.backoff,
    signal,
  } = {},
) {
  let lastError;

  for (let number = 0; number <= retries; number++) {
    if (signal?.aborted) throw new DOMException("Cancelado", "AbortError");

    try {
      return await attempt(url, { timeout, signal });
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
      if (number === retries) break;
      await sleep(backoff * 2 ** number, signal);
    }
  }

  throw lastError;
}
