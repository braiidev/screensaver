/**
 * theme.js - Sistema de temas combinables A+B + alineación + color + Custom
 *
 * Un preset guarda, además del aspecto, qué bloques de información se ven. Así
 * cambiar de preset no deja media ficha con los ajustes del anterior. La
 * ciudad, las unidades, el formato de hora y el intervalo del fondo no viajan
 * dentro del preset: no son parte del aspecto.
 */

import { CONFIG } from "../config.js";
import { readJSON, writeJSON } from "./storage.js";

// `readJSON` y `writeJSON` ya ponen el prefijo `weatherapp:v1:`.
const THEME_KEY = CONFIG.storage.keys.themes;
// Hasta la v0.8.2 los presets se guardaron con el prefijo repetido.
const OLD_THEME_KEY = "weatherapp:v1:themes";
const LEGACY_KEY = "weatherapp:v1:theme";

/** Los ajustes de visibilidad que se guardan dentro de un preset. */
export const VISIBILITY_KEYS = ["forecast", "feelsLike", ...CONFIG.extrasKeys];

/** Los valores de fábrica de esa visibilidad. */
function defaultVisibility() {
  const out = { forecast: true, feelsLike: true };
  for (const key of CONFIG.extrasKeys) out[key] = CONFIG.extras[key] !== false;
  return out;
}

const DEFAULTS = {
  ...defaultVisibility(),
  themeA: "clasico",
  themeB: "clasico",
  align: "left",
  accent: "#4f9bff",
  name: "Clásico",
  id: "default-clasico",
};

const PRESETS_A = ["minimal", "clasico", "compacto", "tv"];
const PRESETS_B = ["elegante", "dev", "clasico", "arial"];
const ALIGNS = ["left", "center", "right"];

function uid() {
  return "th-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/**
 * Deja solo los booleanos conocidos. Lo que falta se toma de `fallback`, que
 * es lo que permite migrar presets viejos sin apagar cosas al azar.
 *
 * @param {*} raw
 * @param {Object} [fallback]
 */
function cleanVisibility(raw, fallback = defaultVisibility()) {
  const out = {};
  for (const key of VISIBILITY_KEYS) {
    out[key] = typeof raw?.[key] === "boolean" ? raw[key] : fallback[key];
  }
  return out;
}

/** Un preset con todos los campos de visibilidad. */
function normalizeSlot(slot, fallback) {
  return { ...slot, ...cleanVisibility(slot, fallback) };
}

/**
 * Lo guardado, ya con visibilidad.
 *
 * Los presets anteriores a la v0.8.3 no tienen estos campos. Se rellenan con
 * los ajustes que hay ahora y se vuelven a guardar, para que la migración no
 * dependa de acordarse de pasar el respaldo en cada lectura.
 *
 * @param {Object} [fallback] ajustes actuales, para los presets viejos
 */
function load(fallback = {}) {
  let data = readJSON(THEME_KEY);
  let fromOld = false;
  if (!data) {
    data = readJSON(OLD_THEME_KEY);
    fromOld = Boolean(data);
  }

  if (data?.slots?.length) {
    const base = { ...defaultVisibility(), ...fallback };
    let changed = false;
    const slots = data.slots.map((slot) => {
      if (VISIBILITY_KEYS.every((key) => typeof slot[key] === "boolean")) {
        return slot;
      }
      changed = true;
      return normalizeSlot(slot, base);
    });

    const normalized = { ...data, slots };
    if (changed || fromOld) save(normalized);
    if (fromOld) {
      try {
        globalThis.localStorage?.removeItem(CONFIG.storage.prefix + OLD_THEME_KEY);
      } catch {}
    }
    return normalized;
  }

  try {
    const raw = globalThis.localStorage?.getItem(LEGACY_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const slot = normalizeSlot(
        {
          id: "migrated",
          name: p.name || "Migrado",
          themeA: PRESETS_A.includes(p.themeA) ? p.themeA : "clasico",
          themeB: PRESETS_B.includes(p.themeB) ? p.themeB : "clasico",
          align: ALIGNS.includes(p.align) ? p.align : "left",
          accent: p.accent || "#4f9bff",
          custom: !!p.custom,
        },
        { ...defaultVisibility(), ...fallback },
      );
      const data = { activeId: slot.id, slots: [slot] };
      save(data);
      globalThis.localStorage.removeItem(LEGACY_KEY);
      return data;
    }
  } catch {}
  return null;
}

function save(data) {
  writeJSON(THEME_KEY, data);
}

function apply(state) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!root) return;
  root.setAttribute("data-theme-a", state.themeA);
  root.setAttribute("data-theme-b", state.themeB);
  root.setAttribute("data-align", state.align);
  root.style.setProperty("--color-accent", state.accent);
  document.body?.setAttribute("data-theme-a", state.themeA);
  document.body?.setAttribute("data-theme-b", state.themeB);
  document.body?.setAttribute("data-align", state.align);
}

/**
 * Aplica el preset activo y devuelve su estado.
 *
 * @param {Object} [fallback] visibilidad para los presets que aún no la tienen
 */
export function initTheme(fallback = {}) {
  const saved = load(fallback);
  if (saved?.slots?.length && saved.activeId) {
    const slot = saved.slots.find((s) => s.id === saved.activeId) || saved.slots[0];
    apply(slot);
    return { state: slot, all: saved };
  }

  const slot = { ...DEFAULTS, ...cleanVisibility(fallback), custom: false };
  apply(slot);
  const init = {
    activeId: DEFAULTS.id,
    slots: [slot],
  };
  save(init);
  return { state: slot, all: init };
}

/** Guarda un preset nuevo, con el aspecto y la visibilidad que recibe. */
export function saveTheme(theme) {
  const saved = load() || { activeId: null, slots: [] };
  const slot = {
    ...theme,
    ...cleanVisibility(theme),
    id: theme.id || uid(),
    custom: true,
  };
  const idx = saved.slots.findIndex((s) => s.id === slot.id);
  if (idx >= 0) saved.slots[idx] = slot;
  else saved.slots.push(slot);
  saved.activeId = slot.id;
  save(saved);
  apply(slot);
  return { state: slot, all: saved };
}

/**
 * Cambia el aspecto y la visibilidad a la vez.
 *
 * Si el preset activo es de fábrica y algo cambia, nace un Custom con todo lo
 * que había: los presets de fábrica no se mutan. Si ya era Custom, se edita.
 *
 * @param {string} themeA
 * @param {string} themeB
 * @param {string} align
 * @param {string} accent
 * @param {Object} [visibility]
 */
export function setTheme(themeA, themeB, align, accent, visibility = {}) {
  const current = load() || { activeId: null, slots: [] };
  const base = current.slots.find((s) => s.id === current.activeId);
  const vis = cleanVisibility(visibility, base ?? DEFAULTS);
  const isPreset =
    base &&
    !base.custom &&
    base.themeA === themeA &&
    base.themeB === themeB &&
    base.align === align &&
    base.accent === accent &&
    VISIBILITY_KEYS.every((key) => base[key] === vis[key]);

  if (isPreset) {
    apply(base);
    return { state: base, all: current };
  }

  const slot = {
    id: base?.custom ? base.id : uid(),
    name: base?.custom ? base.name : "Custom",
    themeA,
    themeB,
    align,
    accent,
    ...vis,
    custom: true,
  };
  const idx = current.slots.findIndex((s) => s.id === slot.id);
  if (idx >= 0) current.slots[idx] = { ...current.slots[idx], ...slot };
  else current.slots.push(slot);
  current.activeId = slot.id;
  save(current);
  apply(slot);
  return { state: slot, all: current };
}

export function applySlot(id) {
  const saved = load();
  if (!saved) return null;
  const slot = saved.slots.find((s) => s.id === id);
  if (!slot) return null;
  saved.activeId = id;
  save(saved);
  apply(slot);
  return { state: slot, all: saved };
}

export function renameSlot(id, name) {
  const saved = load();
  if (!saved) return null;
  const slot = saved.slots.find((s) => s.id === id);
  if (!slot) return null;
  slot.name = name;
  save(saved);
  apply(slot);
  return { state: slot, all: saved };
}

export function duplicateSlot(id) {
  const saved = load();
  if (!saved) return null;
  const slot = saved.slots.find((s) => s.id === id);
  if (!slot) return null;
  const dup = { ...slot, id: uid(), name: slot.name + " (copia)", custom: true };
  saved.slots.push(dup);
  saved.activeId = dup.id;
  save(saved);
  apply(dup);
  return { state: dup, all: saved };
}

/**
 * Borra un preset. Si era el último, vuelve el de fábrica con la visibilidad
 * actual, no con la de hace meses.
 *
 * @param {string} id
 * @param {Object} [visibility]
 */
export function removeSlot(id, visibility = {}) {
  const saved = load();
  if (!saved) return null;
  saved.slots = saved.slots.filter((s) => s.id !== id);
  if (saved.activeId === id && saved.slots.length) saved.activeId = saved.slots[0].id;
  else if (!saved.slots.length) {
    const slot = { ...DEFAULTS, ...cleanVisibility(visibility), custom: false };
    saved.activeId = slot.id;
    saved.slots = [slot];
  }
  save(saved);
  const active = saved.slots.find((s) => s.id === saved.activeId) || saved.slots[0];
  apply(active);
  return { state: active, all: saved };
}

export { PRESETS_A, PRESETS_B, ALIGNS, DEFAULTS };
