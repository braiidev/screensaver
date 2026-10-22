/**
 * verify.mjs - Comprobaciones de integridad del repositorio.
 *
 * Se ejecuta antes de cada commit: `npm run verify`. No necesita navegador
 * ni dependencias, asi que vale tanto en local como en un entorno limpio.
 *
 *   1. Todos los ficheros .js son modulos ES validos.
 *   2. Todos los imports relatives apuntan a un fichero que existe.
 *   3. Todas las variables CSS que se usan estan declaradas.
 *   4. No quedan numeros magicos ni URLs sueltas en el codigo.
 *   5. Los HTML no apuntan a ficheros que no existan.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
let failures = 0;

const ok = (msg) => console.log(`  ok    ${msg}`);
const bad = (msg) => {
  console.log(`  FALLA ${msg}`);
  failures++;
};

function walk(dir, filter) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules") continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p, filter));
    else if (!filter || filter(p)) out.push(p);
  }
  return out;
}

const rel = (p) => relative(ROOT, p);
const jsFiles = walk(ROOT, (p) => extname(p) === ".js" || extname(p) === ".mjs");
const cssFiles = walk(ROOT, (p) => extname(p) === ".css");
const htmlFiles = walk(ROOT, (p) => extname(p) === ".html");

/* ------------------------------------------------------- 1. Sintaxis ESM */

console.log("\n1. Sintaxis de los modulos");
for (const file of jsFiles) {
  const tmp = join(tmpdir(), `verify-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  try {
    execFileSync("node", ["--check", file], { stdio: "pipe" });
    ok(rel(file));
  } catch (e) {
    // `node --check` trata .js como CommonJS: se reintenta como modulo.
    try {
      execFileSync("sh", ["-c", `cp "$1" "$2" && node --check "$2"`, "sh", file, tmp], { stdio: "pipe" });
      ok(rel(file));
    } catch (e2) {
      bad(`${rel(file)}\n${(e2.stderr ?? e.stderr ?? Buffer.alloc(0)).toString().split("\n").slice(0, 4).join("\n")}`);
    }
  }
}

/* ------------------------------------------------- 2. Grafo de imports */

console.log("\n2. Imports relativos");
const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]/g;
for (const file of jsFiles) {
  const src = readFileSync(file, "utf8");
  for (const [, spec] of src.matchAll(IMPORT_RE)) {
    if (!spec.startsWith(".")) continue;
    const target = resolve(dirname(file), spec);
    if (existsSync(target)) ok(`${rel(file)} -> ${spec}`);
    else bad(`${rel(file)} -> ${spec}  (no existe: ${rel(target)})`);
  }
}

/* --------------------------------------------- 3. Variables CSS defined */

console.log("\n3. Variables CSS");
const declared = new Set();
for (const file of cssFiles) {
  for (const m of readFileSync(file, "utf8").matchAll(/(--[\w-]+)\s*:/g)) declared.add(m[1]);
}
const used = new Map();
for (const file of cssFiles) {
  for (const m of readFileSync(file, "utf8").matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (!used.has(m[1])) used.set(m[1], new Set());
    used.get(m[1]).add(rel(file));
  }
}
for (const [name, files] of used) {
  if (declared.has(name)) ok(`${name} esta declarada`);
  else bad(`${name} se usa en ${[...files].join(", ")} pero no esta declarada`);
}
for (const name of declared) {
  if (!used.has(name)) console.log(`  nota  ${name} esta declarada pero no se usa`);
}

/* --------------------------------------------- 4. Numeros magicos y URLs */

console.log("\n4. Constantes sueltas en el codigo");
// Ficheros donde los literales son legitimos: el config es el unico sitio
// donde deben estar las URLs y los intervalos.
const ALLOW_CONSTANTS = new Set(["src/config.js"]);
// Listas de datos que se editan a mano: no son codigo.
const ALLOW_DATA = new Set([
  "src/data/wallpapers.js",
  "src/data/wno.js",
]);
const MAGIC = [
  { re: /set(?:Interval|Timeout)\([^)]*?,\s*\d+\s*\)/g, what: "intervalo con numero literal" },
  { re: /["'`]https?:\/\/[^"'`]+["'`]/g, what: "URL literal" },
  { re: /\b(?:maxIndex|minIndex|refreshInterval|tickInterval)\s*=\s*\d+/g, what: "indice o intervalo asignado a un numero" },
];
for (const file of jsFiles) {
  const r = rel(file);
  if (ALLOW_CONSTANTS.has(r) || ALLOW_DATA.has(r)) continue;
  const src = readFileSync(file, "utf8");
  const hits = MAGIC.flatMap(({ re, what }) =>
    [...src.matchAll(re)].map((m) => `${what}: ${m[0]}`),
  );
  if (hits.length === 0) ok(r);
  else bad(`${r}\n        ${hits.join("\n        ")}`);
}

/* ------------------------------------------------- 5. Referencias del HTML */

console.log("\n5. Referencias del HTML");
for (const file of htmlFiles) {
  const src = readFileSync(file, "utf8");
  const refs = [
    ...src.matchAll(/<link[^>]+href=["']([^"']+)["']/g),
    ...src.matchAll(/<script[^>]+src=["']([^"']+)["']/g),
    ...src.matchAll(/<img[^>]+src=["']([^"']+)["']/g),
  ].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:)?\/\//.test(ref) || ref.startsWith("data:")) {
      ok(`${rel(file)} -> ${ref}  (externo)`);
      continue;
    }
    const target = resolve(dirname(file), ref.split(/[?#]/)[0]);
    if (existsSync(target)) ok(`${rel(file)} -> ${ref}`);
    else bad(`${rel(file)} -> ${ref}  (no existe: ${rel(target)})`);
  }
}

/* ------------------------------------- 6. Invariantes entre config y datos */

console.log("\n6. Invariantes del config");
try {
  const { CONFIG } = await import(join(ROOT, "src/config.js"));
  const { wallpapers } = await import(join(ROOT, "src/data/wallpapers.js"));

  if (wallpapers.length > 0) ok(`la lista de fondos tiene ${wallpapers.length} entradas`);
  else bad("la lista de fondos esta vacia");

  if (CONFIG.wallpaper.maxIndex === undefined)
    ok("el ultimo indice se deduce de la lista, no esta escrito a mano");
  else
    bad(`el config tiene maxIndex (${CONFIG.wallpaper.maxIndex}): el indice se deduce de la lista`);

  const everyImageHasUrl = wallpapers.every((i) => typeof i?.url === "string" && i.url.startsWith("https://"));
  if (everyImageHasUrl) ok(`los ${wallpapers.length} fondos tienen URL`);
  else bad("hay fondos sin URL valida");

  const ids = new Set(wallpapers.map((i) => i.id));
  if (ids.size === wallpapers.length) ok("no hay ids repetidos");
  else bad(`hay ${wallpapers.length - ids.size} ids repetidos`);

  const wmo = readFileSync(join(ROOT, "src/data/wno.js"), "utf8");
  const codes = [...wmo.matchAll(/^\s{4}"?(\d+)"?:\s*\{/gm)].map((m) => m[1]);
  const WMO = ["0","1","2","3","45","48","51","53","55","56","57","61","63","65","66","67","71","73","75","77","80","81","82","85","86","95","96","99"];
  const missing = WMO.filter((c) => !codes.includes(c));
  if (missing.length === 0) ok(`wno.js cubre los ${WMO.length} codigos WMO sin huecos`);
  else bad(`wno.js no cubre los codigos: ${missing.join(", ")}`);
} catch (e) {
  bad(`no se pudieron comprobar los invariantes: ${e.message}`);
}

/* -------------------------------- 7. Constantes del config sin usar */

console.log("\n7. Constantes del config sin usar");
// Reservado para una fase que aun no ha llegado. Cada entrada de aqui deberia
// desaparecer en cuanto la constante empiece a usarse.
const RESERVED = new Set(["storage", "endpoints.geocoding"]);
{
  const configSource = readFileSync(join(ROOT, "src/config.js"), "utf8");
  const codeSource = jsFiles
    .filter((f) => rel(f) !== "src/config.js")
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");

  // Recorre el objeto literal y saca las hojas con su ruta: "weather.retries".
  const leaves = [];
  const stack = [];
  for (const line of configSource.split("\n")) {
    if (/^\s*(?:\*|\/\*|\/\/)/.test(line)) continue;
    const m = line.match(/^(\s+)(\w+):\s*(.*)$/);
    if (!m) continue;
    const indent = m[1].length;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    if (m[3].startsWith("{")) {
      stack.push({ key: m[2], indent });
    } else {
      leaves.push([...stack.map((s) => s.key), m[2]].join("."));
    }
  }

  const unused = leaves.filter(
    (path) =>
      !RESERVED.has(path) &&
      ![...RESERVED].some((r) => path.startsWith(`${r}.`)) &&
      !new RegExp(`CONFIG\\.${path.replace(/\./g, "\\.")}\\b`).test(codeSource),
  );

  if (unused.length === 0) ok(`las ${leaves.length} constantes del config se leen en algun sitio`);
  else bad(`nadie lee: ${unused.join(", ")}`);
}

/* ------------------------------------------------------------- Resultado */

console.log(
  failures === 0
    ? "\nTODO CORRECTO: el repositorio es coherente.\n"
    : `\n${failures} COMPROBACIONES FALLIDAS.\n`,
);
process.exit(failures === 0 ? 0 : 1);
