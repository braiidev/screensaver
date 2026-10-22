/**
 * settings.js - El engranaje y el panel de ajustes.
 *
 * El engranaje vive en la esquina de abajo a la derecha, discreto, y se
 * desvanece a los cinco segundos sin actividad. Cualquier movimiento del raton,
 * del dedo o del teclado lo devuelve. Es la unica puerta a los ajustes, asi que
 * no puede quedarse escondido mientras se esta usando el panel: mientras esta
 * abierto, el temporizador no corre.
 *
 * El panel es un `<dialog>` modal y no una caja cualquiera: el navegador le da
 * gratis el foco encerrado dentro, el cierre con Escape y la capa por encima de
 * todo lo demas. Los controles son `<input>` nativos, escondidos y con su
 * etiqueta dibujada al lado, de modo que las flechas, el tabulador y el lector
 * de pantalla funcionan sin inventar nada.
 */

import { CONFIG } from "../../config.js";
import { iconFor } from "../../ui/icons.js";

/**
 * @param {Object} elements
 * @param {HTMLElement} elements.$toggle el engranaje
 * @param {HTMLElement} elements.$panel el `<dialog>` con el panel
 * @param {Object} deps
 * @param {import("../../core/store.js")} deps.store
 * @param {import("../../core/scheduler.js")} deps.scheduler
 */
export function createSettings({ $toggle, $panel }, { store, scheduler }) {
  const $icon = $toggle.querySelector("[data-icon]");
  const $close = $panel.querySelector(".settings__close");
  const $interval = $panel.querySelector("#setting-interval");

  /** Las bajas de todo lo que se suscribe, para el `stop()`. */
  const offs = [];
  /** Temporizador que desvanece el engranaje. */
  let hideTimer = null;
  /** Ultimo movimiento que rearmo ese temporizador. */
  let lastActivity = 0;
  /** Si el panel esta abierto. */
  let open = false;

  /* ------------------------------------------------------------ Ajustes */

  /**
   * Un grupo de radios: el store manda y los radios obedecen.
   *
   * @param {string} name atributo `name` de los radios
   * @param {string} key clave del store
   */
  function bindSegments(name, key) {
    const inputs = [...$panel.querySelectorAll(`input[name="${name}"]`)];

    const sync = () => {
      const value = store.get(key);
      for (const $input of inputs) $input.checked = $input.value === value;
    };

    for (const $input of inputs) {
      $input.addEventListener("change", () => {
        if ($input.checked) store.set(key, $input.value);
      });
    }

    offs.push(store.subscribe(key, sync));
    sync();
  }

  /**
   * Un interruptor de si o no.
   *
   * @param {HTMLInputElement} $input
   * @param {string} key
   */
  function bindSwitch($input, key) {
    const sync = () => {
      $input.checked = store.get(key) === true;
    };

    $input.addEventListener("change", () => store.set(key, $input.checked));
    offs.push(store.subscribe(key, sync));
    sync();
  }

  /** Las opciones de intervalo salen del config: no hay numeros en el HTML. */
  function buildIntervals() {
    for (const minutes of CONFIG.wallpaper.intervals) {
      const $option = document.createElement("option");
      $option.value = String(minutes);
      $option.textContent = `${minutes} min`;
      $interval.append($option);
    }

    const sync = () => {
      $interval.value = String(store.get("wallpaperInterval"));
    };

    $interval.addEventListener("change", () => {
      // El valor de un `<select>` es texto; los ajustes lo quieren numero.
      store.set("wallpaperInterval", Number($interval.value));
    });

    offs.push(store.subscribe("wallpaperInterval", sync));
    sync();
  }

  /* ------------------------------------------------------- El engranaje */

  function cancelHide() {
    hideTimer?.();
    hideTimer = null;
  }

  function hide() {
    hideTimer = null;
    if (open) return;
    $toggle.classList.add("is-idle");
  }

  /** Lo muestra y rearma la cuenta atras de los cinco segundos. */
  function restart() {
    cancelHide();
    $toggle.classList.remove("is-idle");
    hideTimer = scheduler.after(CONFIG.ui.idle, hide);
  }

  /**
   * Un movimiento no rearma el temporizador en cada evento: se agrupa en uno
   * por segundo. Sin esto, mover el raton cancelaria y crearia un reloj 60
   * veces por segundo.
   */
  function wake() {
    if (open) return;

    const now = Date.now();
    if (now - lastActivity < CONFIG.ui.activityThrottle) return;
    lastActivity = now;
    restart();
  }

  /* ------------------------------------------------------------ El panel */

  function showPanel() {
    if (open) return;

    open = true;
    cancelHide();
    $toggle.classList.remove("is-idle");
    $toggle.setAttribute("aria-expanded", "true");

    // `showModal` existe desde hace mas de una decada, pero si falta (un
    // navegador muy viejo) se abre igual, sin velo ni foco encerrado: mejor un
    // panel sin capa que un engranaje que no hace nada.
    if (typeof $panel.showModal === "function") $panel.showModal();
    else $panel.setAttribute("open", "");
  }

  function hidePanel() {
    if (!open) return;

    // `close()` dispara el evento `close`, que es el que recoge todo. Los
    // navegadores lo hacen en una tarea aparte; si alguno lo hiciera en el
    // acto, tambien vale.
    if (typeof $panel.close !== "function") {
      $panel.removeAttribute("open");
      onClose();
      return;
    }
    $panel.close();
  }

  /** Un clic fuera de la caja (en el fondo del dialogo) cierra. */
  function onBackdrop(event) {
    if (event.target === $panel) hidePanel();
  }

  /** Cierre, venga de Escape, del boton o de `hidePanel()`. */
  function onClose() {
    if (!open) return;

    open = false;
    $toggle.setAttribute("aria-expanded", "false");

    // El foco vuelve a donde se abrio: con teclado se sigue desde ahi.
    $toggle.focus();
    restart();
  }

  return {
    start() {
      $icon.innerHTML = iconFor("settings");

      bindSegments("units", "units");
      bindSegments("hourCycle", "hourCycle");
      bindSwitch($panel.querySelector("#setting-forecast"), "forecast");
      bindSwitch($panel.querySelector("#setting-feels"), "feelsLike");
      bindSwitch($panel.querySelector("#setting-wallpaper"), "wallpaper");
      buildIntervals();

      $toggle.addEventListener("click", showPanel);
      $close.addEventListener("click", hidePanel);
      $panel.addEventListener("click", onBackdrop);
      $panel.addEventListener("close", onClose);

      document.addEventListener("pointermove", wake, { passive: true });
      document.addEventListener("pointerdown", wake, { passive: true });
      document.addEventListener("keydown", wake);

      restart();
    },

    stop() {
      cancelHide();
      document.removeEventListener("pointermove", wake);
      document.removeEventListener("pointerdown", wake);
      document.removeEventListener("keydown", wake);
      $toggle.removeEventListener("click", showPanel);
      $close.removeEventListener("click", hidePanel);
      $panel.removeEventListener("click", onBackdrop);
      $panel.removeEventListener("close", onClose);
      if ($panel.open) $panel.close();
      offs.forEach((off) => off());
    },
  };
}
