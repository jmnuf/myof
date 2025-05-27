class SignalValueUpdateEvent extends Event {
    constructor(previous, current) {
        super('signals:update');
        this.previousValue = previous;
        this.currentValue = current;
    }
}

class MySignal {
  #target; #value;
  constructor(init) {
    this.#target = new EventTarget();
    this.#value = init;
  }
  listen(listener, options = undefined) {
    this.#target.addEventListener('signals:update', listener, options);
  }
  get value() { return this.#value; }
  set value(val) {
    if (val === this.#value) return; // Ignoramos cuando el valor es igual
    const prv = this.#value;
    this.#value = val;
    const event = new SignalValueUpdateEvent(prv, this.#value); // Creamos nueva instancia de nuestro evento
    this.#target.dispatchEvent(event); // Disparamos evento
  }
  update(fn) { this.value = fn(this.#value); }
  computed(fn) {
    const comp = new MySignal(fn(this.#value));
    this.listen((event) => { comp.value = fn(event.currentValue); });
    return comp;
  }
}

export function createSignal(init) {
  const signal = new MySignal(init);
  return signal;
}

export function createElem(tag, props = {}) {
  const elem = document.createElement(tag);
  handleAttributes(elem, props);
  const children = (props.children != null ? [props.children] : []).flat(Infinity).filter((x) => x != null);
  handleChildren(elem, children);
  return elem;
}

function handleAttributes(elem, attrs) {
  for (const attrName of Object.keys(attrs)) {
    if (attrName === 'children') {
      continue;
    }
    const attr = attrs[attrName];
    if (attr instanceof MySignal) {
      elem[attrName] = attr.value;
      attr.listen((event) => {
        elem[attrName] = event.currentValue;
      });
      continue;
    }
    elem[attrName] = attr;
  }
}

function handleChildren(elem, children) {
  for (const child of children) {
    if (child instanceof MySignal) {
      // Element es una clase dada por el DOM API que simboliza un elemento de la pagina como un div
      if (child.value instanceof Element) {
        elem.append(child.value); // Agregamos el elemento al DOM, sin problema
        child.listen((event) => {
          if (event.currentValue != null) { // Si el valor actual no es nullo lo agregamos al padre
            elem.insertBefore(event.currentValue, event.previousValue);
          }
          if (event.previousValue != null) { // Si existia un valor anterior lo quitamos del padre
            event.previousValue.remove();
          }
        });
        continue;
      }
      // Creamos un nodo de texto, ya que ocupamos poder actualizar este pedazo de texto exactamente
      const node = document.createTextNode(String(child.value));
      elem.append(node); // El nodo de texto puede ser agregado de una al DOM
      child.listen((event) => {
        // Cuando el valor de la señal cambie actualizamos el valor que tiene el nodo de texto
        node.data = String(event.currentValue);
      });
      continue;
    }
    elem.append(child);
  }
}

