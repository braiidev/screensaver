/**
 * wallpaper.js - El fondo rotativo.
 *
 * Dos cintas superpuestas: una visible y otra oculta. El cruce no se hace a
 * ciegas: la imagen nueva se precarga y solo se revela cuando el navegador
 * ya la tiene lista, asi que nunca se ve un hueco ni un parpadeo.
 *
 * El movimiento es sutil: la cinta que entra se asienta mientras aparece y la
 * que sale se aleja mientras desaparece. Las dos cosas van en el CSS, con los
 * tokens `--duration-fade` y `--wallpaper-scale`.
 *
 * El fondo se puede apagar desde los ajustes. Apagado no se descarga nada y el
 * lienzo queda en el color de fondo; encendido, si no habia ninguna imagen
 * (se apago antes de la primera), se pide una en ese momento.
 */

import { CONFIG } from "../../config.js";
import { wallpapers } from "../../data/wallpapers.js";

/**
 * @param {Object} elements
 * @param {HTMLElement} elements.$wallpaper la caja del fondo
 * @param {HTMLElement} elements.$tapeA primera cinta
 * @param {HTMLElement} elements.$tapeB segunda cinta
 * @param {Object} deps
 * @param {import("../../core/scheduler.js")} deps.scheduler
 * @param {import("../../core/store.js")} deps.store
 */
export function createWallpaper({ $wallpaper, $tapeA, $tapeB }, { scheduler, store }) {
  const tapes = [$tapeA, $tapeB];
  let visible = -1; // indice de la cinta que se ve
  let current = -1; // indice del fondo actual
  let stopTimer = null;
  let running = false;
  let generation = 0; // sube con cada arranque o parada

  /**
   * Pide la version grande de una imagen del CDN de fotos. Si la url no es de
   * ese CDN, se deja como esta.
   */
  function highRes(url) {
    if (typeof url !== "string") return null;
    return url.replace(CONFIG.wallpaper.highResPattern, `${CONFIG.wallpaper.highResSuffix}.$1`);
  }

  /**
   * Elige un fondo al azar, sin repetir el anterior.
   */
  function pickIndex() {
    if (wallpapers.length < 2) return 0;
    let index;
    do {
      index = Math.floor(Math.random() * wallpapers.length);
    } while (index === current);
    return index;
  }

  /**
   * Espera a que la imagen este descargada y lista para pintarse.
   * @returns {Promise<boolean>} false si la imagen no se pudo cargar
   */
  async function preload(url) {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
      return true;
    } catch {
      // Si la imagen falla se muestra igualmente: es mejor un fondo roto que
      // quedarse con la pantalla a negro.
      return false;
    }
  }

  /**
   * Pone la imagen en una cinta y la deja visible.
   * @param {HTMLElement} tape
   * @param {string} url
   * @param {boolean} instant sin animacion, para el primer fondo
   */
  function reveal(tape, url, instant = false) {
    tape.style.backgroundImage = `url("${url}")`;
    if (!instant) {
      tape.classList.add("is-active");
      return;
    }
    tape.classList.add("no-transition", "is-active");
    // Forzar el reflow para que el estado final se registre sin animacion.
    void tape.offsetWidth;
    tape.classList.remove("no-transition");
  }

  /**
   * Cambia el fondo.
   * @param {number} index
   */
  async function show(index) {
    const wallpaper = wallpapers[index];
    if (!wallpaper) return;

    const url = highRes(wallpaper.url);
    if (!url) return;

    // Primero se descarga, despues se revela. Nunca al reves.
    await preload(url);

    const next = visible === 0 ? 1 : 0;
    const incoming = tapes[next];

    if (visible === -1) {
      reveal(incoming, url, true);
    } else {
      reveal(incoming, url);
      tapes[visible].classList.remove("is-active");
    }

    visible = next;
    current = index;
  }

  /** Si el fondo esta encendido en los ajustes. */
  function enabled() {
    return store.get("wallpaper") !== false;
  }

  /** Los minutos entre cambios, que se pueden elegir en los ajustes. */
  function interval() {
    return store.get("wallpaperInterval") ?? CONFIG.wallpaper.interval;
  }

  /** Deja el fondo a la vista o en el color de fondo, sin descargar nada. */
  function paint() {
    $wallpaper.classList.toggle("is-off", !enabled());
  }

  /** Rehace el temporizador con el intervalo que valga ahora. */
  function schedule() {
    stopTimer?.();
    stopTimer = null;
    if (!running || !enabled()) return;

    stopTimer = scheduler.every(interval() * CONFIG.time.minute, () =>
      show(pickIndex()),
    );
  }

  function onToggle() {
    paint();
    if (!running) return;
    if (enabled() && current === -1) show(pickIndex());
    schedule();
  }

  const offToggle = store.subscribe("wallpaper", onToggle);
  const offInterval = store.subscribe("wallpaperInterval", schedule);

  return {
    async start() {
      running = true;
      paint();

      if (enabled() && current === -1) {
        const gen = ++generation;
        await show(pickIndex());
        // Si mientras se descargaba la imagen se paro o se encendio otra vez,
        // este arranque ya no vale.
        if (gen !== generation) return;
      }

      schedule();
    },

    stop() {
      running = false;
      generation++;
      stopTimer?.();
      stopTimer = null;
      offToggle();
      offInterval();
    },
  };
}
