/**
 * scheduler.js - Los temporizadores de la aplicacion.
 *
 * Un unico sitio donde se crean timers. Cada temporizador se puede cancelar
 * por su cuenta y `stopAll()` los para todos de golpe, de modo que ningun
 * temporizador sobreviva al desmontaje de su modulo.
 *
 * `every` no solapa ejecuciones: si la funcion asincrona sigue pendiente
 * cuando llega el siguiente tick, ese tick se salta. Sin esto, un fondo que
 * tarda en precargar acumularia solapamientos.
 */

/**
 * @param {{ onError?: (error: Error) => void }} [options]
 */
export function createScheduler({ onError } = {}) {
  const timers = new Set();

  function cancel(id) {
    clearInterval(id);
    clearTimeout(id);
    timers.delete(id);
  }

  return {
    /**
     * Ejecuta `fn` cada `ms` milisegundos.
     * @param {number} ms
     * @param {() => void | Promise<void>} fn
     * @returns {() => void} funcion para cancelarlo
     */
    every(ms, fn) {
      let running = false;
      const id = setInterval(() => {
        if (running) return;
        running = true;
        Promise.resolve()
          .then(fn)
          .catch((error) => onError?.(error))
          .finally(() => {
            running = false;
          });
      }, ms);
      timers.add(id);
      return () => cancel(id);
    },

    /**
     * Ejecuta `fn` una vez dentro de `ms` milisegundos.
     * @param {number} ms
     * @param {() => void | Promise<void>} fn
     * @returns {() => void} funcion para cancelarlo
     */
    after(ms, fn) {
      const id = setTimeout(() => {
        timers.delete(id);
        Promise.resolve()
          .then(fn)
          .catch((error) => onError?.(error));
      }, ms);
      timers.add(id);
      return () => cancel(id);
    },

    /**
     * Cancela un temporizador concreto.
     * @param {number} id
     */
    cancel,

    /**
     * Cancela todos los temporizadores.
     */
    stopAll() {
      for (const id of timers) {
        clearInterval(id);
        clearTimeout(id);
      }
      timers.clear();
    },

    /** Cuantos temporizadores hay vivos. Para depurar. */
    get size() {
      return timers.size;
    },
  };
}
