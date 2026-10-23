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
 *
 * La seccion de ciudades tiene dos caminos. Escribiendo, se busca en el
 * geocoding de Open-Meteo y se anade el resultado. Sin escribir, se ofrece una
 * lista corta de ciudades conocidas: en un televisor no hay teclado, y la
 * pantalla se tiene que poder montar entera con el mando.
 */

import { CONFIG } from "../../config.js";
void CONFIG.extras;
import { POPULAR } from "../../data/popular.js";
import { searchPlaces } from "../../services/geocoding.js";
import { formatPlace } from "../../services/geo.js";
import { iconFor } from "../../ui/icons.js";
import { toCity } from "../../utils/city.js";
import { applySlot, duplicateSlot, initTheme, PRESETS_A, PRESETS_B, removeSlot, renameSlot, saveTheme, setTheme } from "../../core/theme.js";

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
  const $cityList = $panel.querySelector("#city-list");
  const $results = $panel.querySelector("#city-results");
  const $search = $panel.querySelector("#city-search");
  const $hint = $panel.querySelector("#city-hint");
  const $exNext = $panel.querySelector("#setting-extra-nexthours");
  const $exSun = $panel.querySelector("#setting-extra-sun");
  const $exWind = $panel.querySelector("#setting-extra-wind");
  const $exHuUv = $panel.querySelector("#setting-extra-humidityuv");
  const $exTrend = $panel.querySelector("#setting-extra-trend");
  const $themeA = $panel.querySelector("#theme-a");
  const $themeB = $panel.querySelector("#theme-b");
  const $themeAlign = $panel.querySelector("#theme-align");
  const $themeAccent = $panel.querySelector("#theme-accent");
  const $themeSlot = $panel.querySelector("#theme-slot");
  const $themeSave = $panel.querySelector("#theme-save");
  const $themeRename = $panel.querySelector("#theme-rename");
  const $themeDuplicate = $panel.querySelector("#theme-duplicate");
  const $themeDelete = $panel.querySelector("#theme-delete");

  /** Las bajas de todo lo que se suscribe, para el `stop()`. */
  const offs = [];
  /** Temporizador que desvanece el engranaje. */
  let hideTimer = null;
  /** Ultimo movimiento que rearmo ese temporizador. */
  let lastActivity = 0;
  /** Si el panel esta abierto. */
  let open = false;

  /** Las ciudades que se ofrecen sin escribir, ya con su id. */
  const popular = POPULAR.map(toCity).filter(Boolean);
  /** Lo que se esta viendo en la lista de resultados. */
  let results = popular;
  /** Que decir en el aviso de debajo del buscador. */
  let mode = "popular";
  /** Los botones de las ciudades guardadas, por id, para marcarlos sin
   * reconstruir la lista y no perder el foco. */
  let cityButtons = new Map();
  /** Temporizador del rebote del buscador. */
  let searchTimer = null;
  /** La busqueda en vuelo, para poder cancelarla. */
  let searchAbort = null;

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

  /* ------------------------------------------------------------ Ciudades */

  function cities() {
    return store.get("cities") ?? [];
  }

  /** Si ya no cabe ninguna mas. */
  function isFull() {
    return cities().length >= CONFIG.cities.max;
  }

  /**
   * Guarda una ciudad y la deja activa. Si ya estaba, solo la activa.
   *
   * La lista se cambia antes que la ciudad activa: al reves, el clima
   * intentaria ir a una ciudad que todavia no esta guardada.
   *
   * @param {Object} city
   */
  function addCity(city) {
    const list = cities();

    if (!list.some((item) => item.id === city.id)) {
      if (isFull()) return;
      store.set("cities", [...list, city]);
    }

    store.set("activeCityId", city.id);
  }

  /**
   * Quita una ciudad. Si era la activa, la activa pasa a ser la primera que
   * quede; si no queda ninguna, el clima volvera a localizar.
   *
   * @param {string} id
   */
  function removeCity(id) {
    // Al contrario que al anadir: primero se deja de apuntar a ella y despues
    // se quita, para que el clima no se quede un instante sin destino.
    if (store.get("activeCityId") === id) {
      const left = cities().filter((city) => city.id !== id);
      store.set("activeCityId", left[0]?.id ?? null);
    }

    store.set("cities", cities().filter((city) => city.id !== id));
  }

  /** Marca la ciudad activa sin reconstruir la lista. */
  function paintActive() {
    const activeId = store.get("activeCityId");

    for (const [id, $button] of cityButtons) {
      if (id === activeId) $button.setAttribute("aria-current", "true");
      else $button.removeAttribute("aria-current");
    }
  }

  /** La lista de ciudades guardadas, con su boton de quitar. */
  function renderCities() {
    $cityList.textContent = "";
    cityButtons = new Map();

    for (const city of cities()) {
      const label = formatPlace(city);

      const $item = document.createElement("li");
      $item.className = "place";

      const $name = document.createElement("button");
      $name.type = "button";
      $name.className = "place__name";
      $name.textContent = label;
      $name.addEventListener("click", () => store.set("activeCityId", city.id));

      const $remove = document.createElement("button");
      $remove.type = "button";
      $remove.className = "place__remove";
      $remove.textContent = CONFIG.messages.remove;
      $remove.setAttribute("aria-label", `${CONFIG.messages.remove} ${label}`);
      $remove.addEventListener("click", () => removeCity(city.id));

      $item.append($name, $remove);
      $cityList.append($item);
      cityButtons.set(city.id, $name);
    }

    paintActive();
    renderResults();
  }

  /** El aviso bajo el buscador: que se esta viendo o por que no hay nada. */
  function hintText() {
    if (isFull()) return CONFIG.messages.citiesFull;

    switch (mode) {
      case "popular":
        return CONFIG.messages.popular;
      case "searching":
        return CONFIG.messages.searching;
      case "empty":
        return CONFIG.messages.noResults;
      case "error":
        return CONFIG.messages.searchError;
      default:
        return "";
    }
  }

  /**
   * Pinta los resultados actuales: los populares al principio, los de la
   * busqueda despues. Lo que ya esta guardado (o lo que no cabe) no se puede
   * pulsar, pero se sigue viendo: asi se sabe que existe.
   */
  function renderResults() {
    const saved = new Set(cities().map((city) => city.id));
    const full = isFull();

    $results.textContent = "";

    for (const city of results) {
      const label = formatPlace(city);
      const added = saved.has(city.id);

      const $item = document.createElement("li");
      const $button = document.createElement("button");
      $button.type = "button";
      $button.className = "place__add";
      $button.textContent = label;
      $button.disabled = added || full;
      if (added) {
        $button.setAttribute(
          "aria-label",
          `${label}: ${CONFIG.messages.alreadySaved}`,
        );
      }
      $button.addEventListener("click", () => addCity(city));

      $item.append($button);
      $results.append($item);
    }

    $hint.textContent = hintText();
  }

  /** Vuelve a los populares, que es lo que se ve sin escribir nada. */
  function resetSearch() {
    searchAbort?.abort();
    searchAbort = null;
    searchTimer?.();
    searchTimer = null;

    mode = "popular";
    results = popular;
    renderResults();
  }

  function runSearch() {
    searchTimer = null;

    const query = $search.value.trim();
    if (query.length < CONFIG.geocoding.minQuery) {
      resetSearch();
      return;
    }

    // Una busqueda que llega tarde no puede pisar a la siguiente.
    searchAbort?.abort();
    const controller = new AbortController();
    searchAbort = controller;

    mode = "searching";
    results = [];
    renderResults();

    searchPlaces(query, { signal: controller.signal })
      .then((found) => {
        if (controller.signal.aborted) return;
        results = found;
        mode = found.length > 0 ? "results" : "empty";
        renderResults();
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        results = [];
        mode = "error";
        renderResults();
        console.error(error);
      });
  }

  /** Se busca cuando el usuario deja de escribir, no en cada letra. */
  function onSearchInput() {
    searchTimer?.();
    searchTimer = scheduler.after(CONFIG.geocoding.debounce, runSearch);
  }

  /* ------------------------------------------------------------ Apariencia */

  let themeState = null;
  let themeData = null;

  function refreshThemeUI() {
    if (!$themeA) return;
    themeState = initTheme();
    themeData = themeState.all;
    $themeA.value = themeState.state.themeA;
    $themeB.value = themeState.state.themeB;
    $themeAlign.value = themeState.state.align;
    $themeAccent.value = themeState.state.accent;

    if ($themeSlot) {
      $themeSlot.innerHTML = "";
      for (const slot of themeData.slots) {
        const opt = document.createElement("option");
        opt.value = slot.id;
        opt.textContent = slot.name + (slot.custom ? " (Custom)" : "");
        if (slot.id === themeData.activeId) opt.selected = true;
        $themeSlot.append(opt);
      }
    }
  }

  function applyCurrent() {
    if (!$themeA) return;
    const res = setTheme($themeA.value, $themeB.value, $themeAlign.value, $themeAccent.value);
    themeState = res;
    themeData = res.all;
    refreshThemeUI();
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

      offs.push(store.subscribe("cities", renderCities));
      offs.push(store.subscribe("activeCityId", paintActive));
      renderCities();
      $search.addEventListener("input", onSearchInput);

      refreshThemeUI();
      $themeA?.addEventListener("change", applyCurrent);
      $themeB?.addEventListener("change", applyCurrent);
      $themeAlign?.addEventListener("change", applyCurrent);
      $themeAccent?.addEventListener("input", applyCurrent);

      $themeSlot?.addEventListener("change", () => {
        const res = applySlot($themeSlot.value);
        if (res) {
          themeState = res;
          themeData = res.all;
          $themeA.value = res.state.themeA;
          $themeB.value = res.state.themeB;
          $themeAlign.value = res.state.align;
          $themeAccent.value = res.state.accent;
          refreshThemeUI();
        }
      });

      $themeSave?.addEventListener("click", () => {
        const name = prompt("Nombre del tema guardado:", "Mi tema");
        if (!name) return;
        const res = saveTheme({ ...themeState?.state, themeA: $themeA.value, themeB: $themeB.value, align: $themeAlign.value, accent: $themeAccent.value, name });
        themeState = res;
        themeData = res.all;
        refreshThemeUI();
      });

      $themeRename?.addEventListener("click", () => {
        if (!themeData?.activeId) return;
        const name = prompt("Nuevo nombre:", themeData.slots.find(s=>s.id===themeData.activeId)?.name || "Tema");
        if (!name) return;
        const res = renameSlot(themeData.activeId, name);
        if (res) { themeState = res; themeData = res.all; refreshThemeUI(); }
      });

      $themeDuplicate?.addEventListener("click", () => {
        if (!themeData?.activeId) return;
        const res = duplicateSlot(themeData.activeId);
        if (res) { themeState = res; themeData = res.all; refreshThemeUI(); }
      });

      $themeDelete?.addEventListener("click", () => {
        if (!themeData?.activeId) return;
        const res = removeSlot(themeData.activeId);
        if (res) { themeState = res; themeData = res.all; $themeA.value = res.state.themeA; $themeB.value = res.state.themeB; $themeAlign.value = res.state.align; $themeAccent.value = res.state.accent; refreshThemeUI(); }
      });

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
      $search.removeEventListener("input", onSearchInput);
      searchTimer?.();
      searchTimer = null;
      searchAbort?.abort();
      searchAbort = null;
      if ($panel.open) $panel.close();
      offs.forEach((off) => off());
    },
  };
}
