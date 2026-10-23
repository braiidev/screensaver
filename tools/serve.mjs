/**
 * serve.mjs - Servidor estatico para desarrollo.
 *
 * Sin dependencias: solo node:http. La idea es que la app se pueda abrir en
 * local con el mismo reparto de rutas que en Netlify, que publica la raiz
 * del repositorio.
 *
 *   node tools/serve.mjs [puerto] [host]
 *
 * El host por defecto es 127.0.0.1, asi que el servidor no sale a la red local
 * salvo que se pida con `node tools/serve.mjs 8080 0.0.0.0`.
 */

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8080);
const HOST = process.argv[3] ?? process.env.HOST ?? "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let path = join(ROOT, normalize(url));

  // Nunca se sale de la raiz del repositorio.
  if (!path.startsWith(ROOT + sep) && path !== ROOT) {
    res.writeHead(403).end("403");
    return;
  }

  try {
    if (statSync(path).isDirectory()) path = join(path, "index.html");
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("404");
    return;
  }

  let stats;
  try {
    stats = statSync(path);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("404");
    return;
  }

  const type = MIME[extname(path).toLowerCase()] ?? "application/octet-stream";
  res.writeHead(200, {
    "content-type": type,
    "content-length": stats.size,
    "cache-control": "no-store",
  });
  createReadStream(path).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`WeatherApp en http://${HOST}:${PORT}`);
  console.log(`Sirviendo ${ROOT}`);
});
