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
6. Los invariantes del config se cumplen (por ejemplo, que el ultimo indice
   del fondo se deduzca de la lista y no este escrito a mano).

## Estructura

```
index.html          La pagina: solo el esqueleto del lienzo
src/                La aplicacion. El mapa esta en src/README.md
assets/             Solo el icono de la pagina
tools/              Servidor de desarrollo y verificador
```

El detalle de como se relacionan las capas esta en [`src/README.md`](src/README.md).

## Editar los fondos

La lista esta en [`src/data/wallpapers.js`](src/data/wallpapers.js). Cada linea
es un fondo:

```js
  { id: 7373484, url: "https://cdn.pixabay.com/photo/2022/08/08/19/36/landscape-7373484_150.jpg" },
```

Para anadir uno, copia una linea al final del array. Para quitarlo, borra la
suya. El numero de fondos se deduce solo de la longitud del array.

## Estado

El trabajo sigue el metodo de fases de Project Flow: cada fase se cierra con
un tag y el estado vive en [`TODO.md`](TODO.md) y en el historial de commits.
