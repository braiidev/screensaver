# WeatherApp

Screensaver web que muestra el reloj y el clima de una ciudad sobre un fondo de
pantalla rotativo. Pensado para dejar un Chromecast en la pared.

- **Cero build.** Modulos ES nativos que el navegador carga directamente.
- **Cero dependencias.** Ni `node_modules`, ni paso de compilación.
- **Sitio estatico.** Se publica tal cual en Netlify.

## Arrancar

```sh
npm run dev          # servidor local en http://localhost:8080
npm run dev -- 3000  # en otro puerto
```

No hace falta instalar nada: `npm run dev` solo lanza `tools/serve.mjs`, que
usa `node:http`.

## Verificar

```sh
npm run verify
```

Comprueba, sin navegador y sin red, que:

1. Todos los modulos son ES validos.
2. Todos los imports relativos apuntan a un fichero que existe.
3. Toda variable CSS usada esta declarada.
4. No quedan numeros magicos ni URLs sueltas fuera de `src/config.js`.
5. Las referencias del HTML apuntan a ficheros que existen.
6. Los invariantes del config se cumplen (el indice del fondo coincide con
   el numero de imagenes, por ejemplo).

## Estructura

```
index.html          La pagina: solo el esqueleto del lienzo
assets/             Lo heredado del proyecto original, pendiente de migrar
src/                La aplicacion. El mapa esta en src/README.md
tools/              Servidor de desarrollo y verificador
```

El detalle de como se relacionan las capas esta en [`src/README.md`](src/README.md).

## Estado

El trabajo sigue el metodo de fases de Project Flow: cada fase se cierra con
un tag y el estado vive en [`TODO.md`](TODO.md) y en el historial de commits.
