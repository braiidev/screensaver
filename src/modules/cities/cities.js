/**
 * cities.js - La fila de ciudades.
 *
 * Arriba del todo, encima de la ficha: un chip por ciudad guardada. El activo
 * se pinta claro, como una pastilla encendida.
 *
 * Se maneja con el mando y con el raton. Con flechas se mueve el foco y, al
 * mismo tiempo, se elige la ciudad: en un televisor no hay "Enter" comodo, y
 * pedir dos pulsaciones para ver el tiempo de al lado sobra.
 *
 * Al cambiar de ciudad no se vuelve a construir la fila, solo se repintan las
 * clases: si se reconstruyera, el boton que tiene el foco desapareceria y el
 * mando dejaria de responder.
 */

/**
 * @param {Object} elements
 * @param {HTMLElement} elements.$cities la caja de la fila
 * @param {HTMLElement} elements.$list la lista donde van los chips
 * @param {Object} deps
 * @param {import("../../core/store.js")} deps.store
 */
export function createCities({ $cities, $list }, { store }) {
  /** Un boton por ciudad, por id. */
  let buttons = new Map();

  function list() {
    return store.get("cities") ?? [];
  }

  /** Elige una ciudad. El clima escucha y se pone a ello. */
  function choose(id) {
    store.set("activeCityId", id);
  }

  /**
   * Pinta el chip activo sin tocar el DOM de la lista.
   */
  function paint() {
    const activeId = store.get("activeCityId");
    for (const [id, $button] of buttons) {
      const active = id === activeId;
      $button.classList.toggle("is-active", active);
      // Solo el activo entra en el orden de tabulacion: con el mando se llega
      // a la fila una vez y las flechas hacen el resto.
      $button.tabIndex = active ? 0 : -1;
      if (active) $button.setAttribute("aria-current", "true");
      else $button.removeAttribute("aria-current");
    }
  }

  /** Reconstruye la fila entera, que solo cambia al anadir o quitar ciudades. */
  function render() {
    const cities = list();

    $list.textContent = "";
    buttons = new Map();

    for (const city of cities) {
      const $item = document.createElement("li");
      const $button = document.createElement("button");

      $button.type = "button";
      $button.className = "chip";
      $button.textContent = city.city || city.country;
      $button.addEventListener("click", () => choose(city.id));

      $item.append($button);
      $list.append($item);
      buttons.set(city.id, $button);
    }

    // Con una sola ciudad la fila sobra: el nombre ya esta en la ficha.
    $cities.hidden = cities.length < 2;
    paint();
  }

  function move(event) {
    const entries = [...buttons.entries()];
    if (entries.length === 0) return;

    const index = entries.findIndex(([, $button]) => $button === document.activeElement);

    let next;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % entries.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + entries.length) % entries.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = entries.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const [id, $button] = entries[next];
    $button.focus();
    $button.scrollIntoView({ block: "nearest", inline: "nearest" });
    choose(id);
  }

  const offCities = store.subscribe("cities", render);
  const offActive = store.subscribe("activeCityId", paint);

  return {
    start() {
      render();
      $list.addEventListener("keydown", move);
    },

    stop() {
      $list.removeEventListener("keydown", move);
      offCities();
      offActive();
      $list.textContent = "";
      buttons = new Map();
    },
  };
}
