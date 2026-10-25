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
import { POPULAR } from "../../data/popular.js";
import { searchPlaces } from "../../services/geocoding.js";
import { formatPlace } from "../../services/geo.js";
import { iconFor } from "../../ui/icons.js";
import { toCity } from "../../utils/city.js";
import {
  applySlot,
  duplicateSlot,
  initTheme,
  PRESETS_A,
  PRESETS_B,
  removeSlot,
  renameSlot,
  saveTheme,
  setTheme,
  VISIBILITY_KEYS,
} from "../../core/theme.js";

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
  const $bgColor = $panel.querySelector("#bg-color");
  const $themePreset = $panel.querySelector("#theme-preset");
  const $themeAdvanced = $panel.querySelector("#theme-advanced");
  const $themeSlot = $panel.querySelector("#theme-slot");
  const $themeName = $panel.querySelector("#theme-name");
  const $themeSave = $panel.querySelector("#theme-save");
  const $themeRename = $panel.querySelector("#theme-rename");
  const $themeDuplicate = $panel.querySelector("#theme-duplicate");
  const $themeDelete = $panel.querySelector("#theme-delete");
  const $fullscreenToggle = $panel.querySelector("#fullscreen-toggle");

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
  /** Preset cuyo nombre ya se volco en el campo, para no pisar lo que se escribe. */
  let namedThemeId = null;
  /** Mientras se aplica un preset no se copia de vuelta al preset. */
  let applyingPreset = false;

  /** La visibilidad tal como esta ahora en el store. */
  function currentVisibility() {
    const out = {};
    for (const key of VISIBILITY_KEYS) out[key] = store.get(key) !== false;
    return out;
  }

  /** Lleva al store la visibilidad de un preset, sin reescribirlo. */
  function applyPresetVisibility(state) {
    if (!state) return;

    applyingPreset = true;
    try {
      for (const key of VISIBILITY_KEYS) {
        if (typeof state[key] === "boolean") store.set(key, state[key]);
      }
    } finally {
      applyingPreset = false;
    }
  }

  function refreshThemeUI() {
    if (!$themeA) return;
    themeState = initTheme(currentVisibility());
    themeData = themeState.all;
    $themeA.value = themeState.state.themeA;
    $themeB.value = themeState.state.themeB;
    $themeAlign.value = themeState.state.align;
    $themeAccent.value = themeState.state.accent;
    try { syncPresetSelect(); } catch {}

    if ($themeName && namedThemeId !== themeState.state.id) {
      $themeName.value = themeState.state.name;
      namedThemeId = themeState.state.id;
    }

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

  /**
   * El preset activo se actualiza solo. Si era de fabrica, `setTheme` crea un
   * Custom con lo que habia y con el cambio; igual que al tocar A/B/color.
   */
  function syncPreset() {
    if (applyingPreset || !$themeA) return;

    const res = setTheme(
      $themeA.value,
      $themeB.value,
      $themeAlign.value,
      $themeAccent.value,
      currentVisibility(),
    );
    themeState = res;
    themeData = res.all;
    refreshThemeUI();
  }

  function applyCurrent() {
    if (!$themeA) return;
    const res = setTheme(
      $themeA.value,
      $themeB.value,
      $themeAlign.value,
      $themeAccent.value,
      currentVisibility(),
    );
    themeState = res;
    themeData = res.all;
    refreshThemeUI();
    try { syncPresetSelect(); } catch {}
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
      bindSegments("dateFormat", "dateFormat");
      bindSwitch($panel.querySelector("#setting-forecast"), "forecast");
      bindSwitch($panel.querySelector("#setting-feels"), "feelsLike");
      bindSwitch($panel.querySelector("#setting-wallpaper"), "wallpaper");
      bindSwitch($panel.querySelector("#setting-show-clock"), "showClock");
      bindSwitch($panel.querySelector("#setting-show-card"), "showCard");
      bindSwitch($panel.querySelector("#setting-show-cities"), "showCities");
      bindSwitch($exNext, "nextHours");
      bindSwitch($exSun, "sun");
      bindSwitch($exWind, "wind");
      bindSwitch($exHuUv, "humidityUv");
      bindSwitch($exTrend, "trend");
      buildIntervals();

      offs.push(store.subscribe("cities", renderCities));
      offs.push(store.subscribe("activeCityId", paintActive));
      renderCities();
      $search.addEventListener("input", onSearchInput);

      refreshThemeUI();
      applyPresetVisibility(themeState?.state);

      // Cualquier cambio de visibilidad se copia al preset activo. Se hace por
      // suscripcion y no dentro de cada switch: asi tambien cuenta si el store
      // cambia desde otro sitio.
      for (const key of VISIBILITY_KEYS) {
        offs.push(store.subscribe(key, syncPreset));
      }

      const THEME_PRESETS = {
        "minimal-neutro": { a: "minimal", b: "clasico", align: "left" },
        "clasico-equilibrado": { a: "clasico", b: "clasico", align: "left" },
        "compacto-limpio": { a: "compacto", b: "clasico", align: "left" },
        "tv-comodo": { a: "tv", b: "clasico", align: "center" },
        "elegante-noche": { a: "minimal", b: "elegante", align: "left" },
        "dev-tecnico": { a: "compacto", b: "dev", align: "left" },
      };

      function findPresetKey(a, b, align) {
        for (const [k, v] of Object.entries(THEME_PRESETS)) {
          if (v.a === a && v.b === b && v.align === align) return k;
        }
        return null;
      }

      function syncPresetSelect() {
        if (!$themePreset) return;
        const key = findPresetKey($themeA?.value, $themeB?.value, $themeAlign?.value);
        if (key && THEME_PRESETS[key]) {
          $themePreset.value = key;
        } else {
          $themePreset.value = "personalizado";
        }
      }

      $themePreset?.addEventListener("change", () => {
        const key = $themePreset.value;
        if (key === "personalizado") return;
        const pset = THEME_PRESETS[key];
        if (!pset) return;
        if ($themeA) $themeA.value = pset.a;
        if ($themeB) $themeB.value = pset.b;
        if ($themeAlign) $themeAlign.value = pset.align;
        applyCurrent();
        $themeAdvanced?.removeAttribute("open");
      });

      $themeA?.addEventListener("change", () => {
        if ($themePreset) $themePreset.value = "personalizado";
        applyCurrent();
      });
      $themeB?.addEventListener("change", () => {
        if ($themePreset) $themePreset.value = "personalizado";
        applyCurrent();
      });
      $themeAlign?.addEventListener("change", () => {
        if ($themePreset) $themePreset.value = "personalizado";
        applyCurrent();
      });
      $themeAccent?.addEventListener("input", () => {
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--color-accent", $themeAccent.value);
          document.body?.style.setProperty("--color-accent", $themeAccent.value);
        }
        applyCurrent();
      });
      $bgColor?.addEventListener("input", () => {
        const c = $bgColor.value;
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--bg-color", c);
          document.body?.style.setProperty("--bg-color", c);
          try { localStorage.setItem("weatherapp:v1:bgcolor", c); } catch {}
        }
      });

      $themeSlot?.addEventListener("change", () => {
        const res = applySlot($themeSlot.value);
        if (res) {
          applyPresetVisibility(res.state);
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
        const name = $themeName?.value.trim() || "Mi preset";
        const base = { ...themeState?.state };
        delete base.id;
        const res = saveTheme({
          ...base,
          themeA: $themeA.value,
          themeB: $themeB.value,
          align: $themeAlign.value,
          accent: $themeAccent.value,
          ...currentVisibility(),
          name,
        });
        themeState = res;
        themeData = res.all;
        refreshThemeUI();
        if ($themeName) $themeName.value = res.state.name;
      });

      $themeRename?.addEventListener("click", () => {
        if (!themeData?.activeId) return;
        const name = $themeName?.value.trim();
        if (!name) return;
        const res = renameSlot(themeData.activeId, name);
        if (res) {
          themeState = res;
          themeData = res.all;
          refreshThemeUI();
          if ($themeName) $themeName.value = res.state.name;
        }
      });

      $themeDuplicate?.addEventListener("click", () => {
        if (!themeData?.activeId) return;
        const res = duplicateSlot(themeData.activeId);
        if (res) {
          applyPresetVisibility(res.state);
          themeState = res;
          themeData = res.all;
          refreshThemeUI();
        }
      });

      $themeDelete?.addEventListener("click", () => {
        if (!themeData?.activeId) return;
        const res = removeSlot(themeData.activeId, currentVisibility());
        if (res) {
          applyPresetVisibility(res.state);
          themeState = res;
          themeData = res.all;
          $themeA.value = res.state.themeA;
          $themeB.value = res.state.themeB;
          $themeAlign.value = res.state.align;
          $themeAccent.value = res.state.accent;
          refreshThemeUI();
        }
      });

      const updateFullscreenBtn = () => {
        if (!$fullscreenToggle) return;
        if (document.fullscreenElement) {
          $fullscreenToggle.textContent = "Salir de pantalla completa";
        } else {
          $fullscreenToggle.textContent = "Activar pantalla completa";
        }
      };
      $fullscreenToggle?.addEventListener("click", () => {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        } else {
          document.documentElement.requestFullscreen?.().catch(() => {});
        }
      });
      document.addEventListener("fullscreenchange", updateFullscreenBtn);
      updateFullscreenBtn();

      // Pestañas horizontales
      const $tabs = Array.from($panel.querySelectorAll(".settings__tab"));
      const $panels = Array.from($panel.querySelectorAll(".settings__panel"));

      const setTabindex = () => {
        $tabs.forEach((t) => {
          if (t.classList.contains("is-active")) {
            t.setAttribute("tabindex", "0");
          } else {
            t.setAttribute("tabindex", "-1");
          }
        });
      };

      const activateTab = (target) => {
        $tabs.forEach((t) => {
          t.classList.remove("is-active");
          t.setAttribute("aria-selected", "false");
        });
        target.classList.add("is-active");
        target.setAttribute("aria-selected", "true");
        setTabindex();
        const name = target.dataset.tab;
        $panels.forEach((p) => {
          p.classList.toggle("is-active", p.dataset.panel === name);
        });
        try {
          localStorage.setItem("weatherapp:v1:settings-tab", name);
        } catch {}
      };

      $tabs.forEach((tab, index) => {
        tab.setAttribute("tabindex", tab.classList.contains("is-active") ? "0" : "-1");
        tab.addEventListener("click", () => {
          activateTab(tab);
          tab.focus();
        });
        tab.addEventListener("keydown", (event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            const next = $tabs[(index + 1) % $tabs.length];
            activateTab(next);
            next.focus();
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            const prev = $tabs[(index - 1 + $tabs.length) % $tabs.length];
            activateTab(prev);
            prev.focus();
          } else if (event.key === "Home") {
            event.preventDefault();
            activateTab($tabs[0]);
            $tabs[0].focus();
          } else if (event.key === "End") {
            event.preventDefault();
            const last = $tabs[$tabs.length - 1];
            activateTab(last);
            last.focus();
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activateTab(tab);
            tab.focus();
          }
        });
      });

      setTabindex();

      try {
        const saved = localStorage.getItem("weatherapp:v1:settings-tab");
        if (saved) {
          const tab = $panel.querySelector(`.settings__tab[data-tab="${saved}"]`);
          if (tab) {
            activateTab(tab);
          }
        }
      } catch {}

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
