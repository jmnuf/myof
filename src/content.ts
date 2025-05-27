import { clamp } from "./utils";

export type SlideInput = {
  kind: 'text';
  name: string;
  value: string;
} | {
  kind: 'number';
  name: string;
  value: number;
}

interface SlideData {
  title: string;
  text: string;
  inputs?: Array<SlideInput>;
  code: string;
}

interface DataSet {
  [x: string]: SlideInput;
}

type SlideBuilderFirst = Partial<SlideData> & { title: SlideData['title'] };

interface SlidesBuilder {
  changeText(new_text: string): SlidesBuilder;
  changeTitleAndText(new_title: string, new_text: string): SlidesBuilder;
  changeCode(new_code: string): SlidesBuilder;
  changeTextAndCode(new_text: string, new_code: string): SlidesBuilder;
  changeTextAndCodeWithInputs(new_text: string, new_code: string, ...inputs: Array<SlideInput>): SlidesBuilder;
  changeAll(slide: SlideData): SlidesBuilder;

  useData(fn: (data: DataSet, previous_slide: SlideData) => SlideData): SlidesBuilder;

  build(): SlidesManager;
}

type SlidesList = [SlideData, ...tail: Array<SlideData | ((data: DataSet, previous_slide: SlideData) => SlideData)>];

class SlideChangeEvent extends Event {
  static readonly NAME = 'slidechange';
  public readonly previous_slide: SlideData;
  public readonly new_slide: SlideData;

  constructor(previous_slide: SlideData, new_slide: SlideData) {
    super(SlideChangeEvent.NAME, {
      bubbles: false,
      cancelable: false,
      composed: false,
    });
    this.previous_slide = previous_slide;
    this.new_slide = new_slide;
  }
}

interface SlideChangeEventListener extends EventListener {
  (event: SlideChangeEvent): void;
}

interface SlideChangeEventListenerObject extends EventListenerObject {
  handleEvent(object: SlideChangeEvent): void;
}
type SlideChangeCallbackOrListenerObject = SlideChangeEventListener | SlideChangeEventListenerObject;


class SlidesManager extends EventTarget {
  private index: number;
  private slides: SlidesList;
  private current_slide: SlideData;
  public data: DataSet;

  constructor(slides: SlidesList) {
    super();
    this.slides = slides;
    this.data = {} as DataSet;
    this.index = 0;
    this.current_slide = slides[0];
    // while (this.index < this.length - 1) this.next_slide();
    console.log('Total Slides:', slides.length);
  }

  at<T extends number>(index: T): SlidesList[T];
  at(index: number) {
    return this.slides[index];
  }

  get active_index() {
    return this.index;
  }

  addEventListener(type: typeof SlideChangeEvent.NAME, callback: SlideChangeCallbackOrListenerObject | null, options?: AddEventListenerOptions | boolean): void {
    super.addEventListener(type, callback, options);
  }

  get length() {
    return this.slides.length;
  }

  change_to(slide_index: number) {
    slide_index = clamp(slide_index, 0, this.slides.length - 1);
    const idx = this.index = slide_index;
    const slide = this.slides[idx];
    const prev = { ...this.current_slide };
    delete prev.inputs;
    const next = this.current_slide = typeof slide === 'function' ? slide(this.data, prev) : slide;
    next.title = next.title.trim();
    next.text = next.text.trim();
    next.code = next.code.trim();
    const event = new SlideChangeEvent(prev, next);
    this.dispatchEvent(event);
    return this.current_slide;
  }

  next_slide() {
    if (this.index === this.slides.length - 1) return this.current_slide;
    const idx = ++this.index;
    const slide = this.slides[idx];
    const prev = { ...this.current_slide };
    delete prev.inputs;
    const next = this.current_slide = typeof slide === 'function' ? slide(this.data, prev) : slide;
    next.title = next.title.trim();
    next.text = next.text.trim();
    next.code = next.code.trim();
    const event = new SlideChangeEvent(prev, next);
    this.dispatchEvent(event);
    return this.current_slide;
  }

  prev_slide() {
    if (this.index === 0) return this.current_slide;
    const idx = --this.index;
    const slide = this.slides[idx];
    const prev = { ...this.current_slide };
    delete prev.inputs;
    const next = this.current_slide = typeof slide === 'function' ? slide(this.data, this.current_slide) : slide;
    next.title = next.title.trim();
    next.text = next.text.trim();
    next.code = next.code.trim();
    const event = new SlideChangeEvent(prev, next);
    this.dispatchEvent(event);
    return this.current_slide;
  }

  reload_slide() {
    const slide = this.slides[this.index];
    const prev = { ...this.current_slide };
    delete prev.inputs;
    const next = this.current_slide = typeof slide === 'function' ? slide(this.data, prev) : slide;
    next.title = next.title.trim();
    next.text = next.text.trim();
    next.code = next.code.trim();
    const event = new SlideChangeEvent(prev, next);
    this.dispatchEvent(event);
    return this.current_slide;
  }

  get current() {
    return this.current_slide;
  }
}

function last<T>(list: Array<T>): T {
  if (list.length === 0) {
    throw new Error('Attempting to get last element from empty list');
  }
  return list[list.length - 1];
}

function slidesBuilder(): { first: (first: SlideBuilderFirst) => SlidesBuilder; } {
  const slides: SlidesList = [] as any;

  const builder: SlidesBuilder = {
    changeText: (text) => {
      const prev = last(slides);
      if (typeof prev === 'function') {
        slides.push((_data, prev) => ({ ...prev, text }));
      } else {
        slides.push({ ...prev, text });
      }
      return builder;
    },
    changeTitleAndText: (title, text) => {
      const prev = last(slides);
      if (typeof prev === 'function') {
        slides.push((_data, prev) => ({ ...prev, title, text }));
      } else {
        slides.push({ ...prev, title, text });
      }
      return builder;
    },
    changeTextAndCode: (text, code) => {
      const prev = last(slides);
      if (typeof prev === 'function') {
        slides.push((_data, prev) => ({ ...prev, text, code }));
      } else {
        slides.push({ ...prev, text, code });
      }
      return builder;
    },
    changeTextAndCodeWithInputs: (text, code, ...inputs) => {
      const prev = last(slides);
      if (typeof prev === 'function') {
        slides.push((_data, prev) => ({ ...prev, text, code, inputs }));
      } else {
        slides.push({ ...prev, text, code, inputs });
      }
      return builder;
    },
    changeCode: (code) => {
      const prev = last(slides);
      if (typeof prev === 'function') {
        slides.push((_data, prev) => ({ ...prev, code }));
      } else {
        slides.push({ ...prev, code });
      }
      return builder;
    },
    changeAll: (slide) => {
      slides.push(slide);
      return builder;
    },

    useData: (fn) => {
      slides.push(fn);
      return builder;
    },

    build: () => {
      const ss = slides.map(s => (typeof s === 'function' ? s : {
        ...s,
        title: s.title.trim(),
        text: s.text.trim(),
        code: s.code.trim(),
      })) as SlidesList;
      return new SlidesManager(ss);
    },
  };

  return {
    first: (first) => {
      slides.push(Object.assign({ title: '', text: '', code: '' } satisfies SlideData, first));
      return builder;
    },
  };
}

function ensureData<T extends string | number>(data: DataSet, defaults: SlideInput): T {
  if (!(defaults.name in data) || data[defaults.name].kind !== defaults.kind) {
    data[defaults.name] = {
      name: defaults.name,
      kind: defaults.kind,
      value: defaults.value as any,
    };
  }
  return data[defaults.name].value as T;
}

function requireData<T extends string | number>(data: DataSet, name: string): T {
  if (!(name in data)) {
    throw new Error('Data of name `' + name + '` is missing');
  }
  return data[name].value as T;
}

const data_refs = {
  createElement: {
    ensure: (data: DataSet) => ensureData<string>(data, { name: 'createElement', kind: 'text', value: 'createElement', }),
    require: (data: DataSet) => requireData<string>(data, 'createElement'),
    input_data: (value: string): SlideInput => ({ name: 'createElement', kind: 'text', value }),
  },
  createSignal: {
    ensure: (data: DataSet) => ensureData<string>(data, { name: 'createSignal', kind: 'text', value: 'createSignal', }),
    require: (data: DataSet) => requireData<string>(data, 'createSignal'),
    input_data: (value: string): SlideInput => ({ name: 'createSignal', kind: 'text', value }),
  },
};

export const slides = slidesBuilder()
  .first({ title: '¿Por qué un Framework?' })
  .changeText('Interfazes modernas son complicadas')
  .changeTitleAndText('', `
Dejamos interfaces sencillas de implementar hace mucho. Cosas que complican la interfaz:
- Cuando algo cambia de valor pero ocupas demostrarlo en multiples lugares de la interfaz con estan cerca una a la otra.
- Alta interactivada y manejo de inputs del usuario.
- Al interactuar siempre intentamos demostrar alguna reaccion preferiblemente dentro de 100ms, para que se sienta instantanea.
- Muchas partes distintas de la pagina o paginas utilizan la misma logica del lado del cliente.
`)
  .changeText('Por esto es que tenemos soluciones para hacer estas acciones más sencillas de hacer a escala\ni.e. React, Svelte, Solid, JQuery, etc.')
  .changeAll({
    title: 'Composicion',
    text: 'Facilitar el re-uso de codigo es uno de los objetivos de estos frameworks modernos',
    code: `
// Contador.js - React JS
function Contador() {
    const [cantidad, setCantidad] = useState(0);
    return <button onClick={() => setCantidad(cantidad + 1)}>Apretado {cantidad} veces</button>;
}
const raiz = createRoot(elementoRaiz);
raiz.render(<Contador />);

// contador.js - Vanilla JS
function crearContador() {
    const elemento = document.createElement('button');
    let contador = 0;
    elemento.innerText = 'Apretado ' + contador + ' veces';
    elemento.addEventListener('click', () => {
        contador += 1;
        elemento.innerText = 'Apretado ' + contador + ' veces';
    });
    return elemento;
}
elementoRaiz.appendChild(crearContador());
`
  })
  .changeTextAndCode('Pero si todos proponen composicion, ¿Qué los diferencia?\nAdemas de syntaxis, tiene que haber una razon semantica de porque son como son', `
// Contador.js - Solid JS
function Contador() {
    const [cantidad, setCantidad] = useSignal(0);
    const incrementar = () => setCantidad(num => num + 1);
    return <button onClick={incrementar}>Apretado {cantidad()} veces</button>;
}
render(() => <Contador />, elementoRaize);

// Contador.svelte - Svelte JS
<script>
    let contador = $state(0);
</script>
<button onclick={() => contador++}>Apretado {contador} veces</button>

`)
  .changeAll({
    title: 'Framework En Casa',
    text: `
Para de verdad entender las decisiones tomadas por estos vamos a dar vuelta a crear nuestro propio framework.
Vamos a ir en construir algo sencillo y funcional, pero que aun nos sirva en re-crear un frontend donde se listan posts y podamos agregar posts nuevos.
Es de decir esto es más educacional que practico pero te enseñara los fundamentos.
`,
    code: '',
  })
  .useData((data) => {
    const createElement = data_refs.createElement.ensure(data);

    const slide: SlideData = {
      title: 'Estructura',
      text: `
La primera decision que se puede tomar es decidir si nos basamos en el servidor o en el cliente.
Para nuestro caso vamos a mantenernos desde el cliente y haremos todo desde el cliente.
Pero ten en cuenta que frameworks como Svelte Kit y React moderno con Componentes de Servidor (Server Components) se basan en el servidor y encima de ello agregan interactividad en el cliente.
`,
      code: `
// Ejemplo codigo de lo que queremos poder escribir en nuestro framework
function Hola() {
    return ${createElement}('h1', {
        children: ['Hola, ma!'],
        onClick: () => console.log('Apretado en elemento'),
    });
}
`,
      inputs: [
        data_refs.createElement.input_data(createElement),
      ],
    };
    return slide;
  })
  .useData((data) => {
    const createElement = data_refs.createElement.require(data);
    const createSignal = data_refs.createSignal.ensure(data);

    const slide: SlideData = {
      title: 'Estructura',
      text: 'De hecho estamos agarrando el formato de llamado de funcion que se usa en el JSX más o menos. Vamos a tambien utilizar "señales" (explicado más adelante) para guardar estados reactivos y que nuestro framework actualize la interfaz basado en el valor que tengan. Esto va a diferencia de React que llama tu funcion multiples veces para "pintar" virtualmente y luego solo enseña los cambios.',
      code: `
// Ejemplo codigo de lo que queremos poder escribir en nuestro framework
function Counter() {
    const count = ${createSignal}(0);

    return ${createElement}('button', {
        children: ['Apretado ', count, ' veces'],
        onClick: () => {
            count.set((c) => c + 1);
            console.log('Contador: ', count.get());
        },
    });
}
`,
      inputs: [
        data_refs.createSignal.input_data(createSignal),
      ],
    };
    return slide;
  })
  .changeAll({
    title: 'Que No Manejaremos',
    text: `
Hay varias cosas que un framework para frontend te pudiera dar, pero nosotros no tocaremos.
- Facilitación de renderizado de listas
- Manejo de sub-espacios: ie. elementos de SVG, elementos de MathML
- Propio manejo de attributos y eventos
- Utilidades para manejo de navegación
- Utilidades para manejo de cosas asíncronas
- Soporté para TypeScript para tener autocompletado
- Cualquier soporté para ejecución/renderizado en servidor
`,
    code: '',
  })
  .useData((data) => {
    const jsx = data.createElement.value as string;
    const slide: SlideData = {
      title: 'Paso 1: Creación de Elementos Sencillos',
      text: `
Lo primero que ocupamos ver es si hacemos representación intermedia o los elementos de una.
Para nuestro caso crearemos los elementos de una usando \`document.createElement\` en nuestra función \`${jsx}\`.
Tambien vamos a solo agregar propiedades que ya existen dentro del elemento iterando por las propiedades dadas en el objeto de propiedades. Por un segundo ignoremos la necesidad de renderizar hijos y el uso de señales.
El codigo así es super sencillo para empezar:
`,
      code: `
function ${jsx}(tag, propiedades = {}) {
    const elemento = document.createElement(tag);
    // Conseguimos los hijos a parte y le ponemos por defecto un array vacío si no estan definidos
    let children = [propiedades.children];
    for (const nombrePropiedad of Object.keys(propiedades)) {
        // Ignoramos los hijos mientras ponemos las propiedades
        if (nombrePropiedad === 'children') {
            continue;
        }
        elemento[nombrePropiedad] = propiedades[nombrePropiedad];
    }
    // Aplasta el array si tiene arrays dentro a un solo array de una dimension
    // Filtra todo los valores que sean null o undefined
    children = children.flat(Infinity).filter((x) => x != null);
    createChildren(elemento, children);
    return elemento;
}

// Recreacion del contador:
function Counter {
    let count = 0;
    const btn = ${jsx}('button', {
        innerText: 'Apretado 0 veces',
        onclick: () => {
            btn.innerText = \`Apretado \${++count} veces\`;
        },
    });
    return btn;
}
`,
    };
    return slide;
  })
  .useData((data) => {
    const jsx = requireData<string>(data, 'createElement');

    return {
      title: 'Representación Intermedia',
      text: `
En nuestro caso creamos los elementos del DOM directamente pero para poder renderizar la pagina desde el servidor con el mismo codigo, ocupariamos algo generico que no dependa en el DOM. En ese caso creariamos alguna representacion arbitraria de estos elementos y sus atributos que es independiente del ambiente en el que se ejecuta. Esto puede ser un objeto sencillo o una clase.
Aquí dejo un ejemplo super simplificado.
`,
      code: `
class MiElemento {
    constructor(tag, children, attrs) {
        this.tag = tag;
        this.attrs = attrs;
        this.children = children.flat(Infinity).filter((c) => c != null); // Aplastamos el array y quitamos cosas nullas
    }
}

function render(ir) {
    const elem = document.createElement(ir.tag);
    for (const key of Object.keys(elem.attrs)) { elem[key] = elem.attrs[key]; }
    for (const child of ir.children) {
        if (child instanceof MiElemento) {
            elem.append(render(child));
            continue;
        }
        elem.append(child);
    }
    return elem;
}

function ${jsx}(tag, props = {}) {
    if ('children' in props) {
        props = { ...props }; // Copia superficial, no queremos tocar el objeto del usuario directamente
        const children = [props.children];
        delete props.children;
        return new IR_Element(tag, children, props);
    }
    return new IR_Element(tag, [], props);
}
`,
    }
  })
  .changeAll({
    title: '¿Que son Señales?',
    text: 'Señales son un modelo donde se basa en disparar eventos para indicar algun cambio o efecto causado por alguna accion o inaccion. En nuestro caso, cuando cambiamos un valor queremos saber internamente para actualizar el valor demostrado al usuario en el DOM al instante. En varios casos tambien existe algo conocido como un valor "computado" que en relacion a señales significa que el valor depende del valor contenido en la señal y caundo el valor de la señal cambia este cambia tambien',
    code: `
interface Signal<T> {
    // Pasar funcion que contiene el nuevo valor y en ciertos casos tiene el valor anterior
    listen(on_change_callback: (event: { previous: T; current: T }) => void);
    // Regresa el valor usualmente no tiene efecto secundario
    getValue(): T;
    // Dispara el evento si el valor es distinto al valor actual
    setValue(new_value: T): void;
    // Crea una nueva señal que tiene su valor dependiente a lo que se regrese por la funcion pasada
    computed<C>(funcion_para_declarar_valor: (value: T) => C) : ComputedSignal<C>;
}
interface ComputedSignal<T> {
    listen(on_change_callback: (event: { previous: T; current: T }) => void);
    getValue(): T;
}
`,
  })
  .changeAll({
    title: '¿Que hace React?',
    text: `
React utiliza una representacion intermedia y usa algo similar a señales dentro de su implementacion para volver a re-llamar los componentes.
De manera sencilla y no completamente correcta, React crea y maneja una cola de "trabajos" cuando se cambian los valores de un \`useState\` u otros hooks y luego vuelve a crear todo el árbol de elementos en memoria y cuando no queda nada más en la cola hace "reconciliación" con el verdadero árbol de elementos para actualizar una cantidad mínima de cosas si tu código esta bien hecho. No es super complicado de hacer, pero no es muy simple de entender a la primera para algunos.
Creo que había un video en YT de recrear React en como 5 minutos que estaba bueno tambien.
`,
    code: '',
  })
  .changeAll({
    title: '¿Como Utilizaremos Señales?',
    text: `
Para nuestro caso los valores dinamicos iran dentro de señales que causaran cambios en el DOM directamente. Pasaremos las señales como el attributo o como un hijo directamente. Tambien podremos escuchar por cambios a ellas individualmente. Utilidad para uso que quieras con ellas.
`,
    code: '',
  })
  .changeAll({
    title: 'Paso 2: Nuestras Propias Señales',
    text: 'Vamos usar las clases `EventTarget` y `Event` parte de web standards. Las puedes buscar en MDN.\nPrimero vamos a crear nuestra propia clase para enseñar dentro del evento el estado previo y el estado actual del valor que contiene la señal al momento que se dispara la señal. Si hay alguna otra información que se ocupe dar cuando cambia el valor, habriera que incluirlo en esta clase.',
    code: `
class SignalValueUpdateEvent extends Event {
    constructor(previous, current) {
        super('signals:update');
        this.previousValue = previous;
        this.currentValue = current;
    }
}
`
  })
  .changeTextAndCode(
    'Ahora se haria la clase que manejara la señalización. Tambien se debe poder ver el valor actual y cuando el valor se cambie dispare nuestro evento que definimos anteriormente. De paso tambien agregaremos la forma de hacer una señal basada en otra, señales computadas.',
    `class MySignal {
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
}`
  )
  .useData((data, prev) => {
    const csignal = requireData<string>(data, 'createSignal');

    return {
      title: prev.title,
      text: 'Cuando el usuario use nuestras señales no queremos que tenga accesso directo a nuestra clase por simplificar el uso de nuestro framework de juguete, así que solo exportaremos una funcion para crear señales al usuario. Estoy imaginando las señales y la creacion de elementos existiendo en un solo archivo pero eso a gusto de usted ver como prefiere pero ahorita es suficientemente corto para dejarlo en un solor archivo.',
      code: `
export function ${csignal}(init) {
    const signal = new MySignal(init);
    return signal;
}
`
    };
  })
  .changeAll({
    title: 'Paso 3: Señales como Attributos',
    text: 'Ahora podemos integrar la señales como un atributo de un elemento. Cuando una señal es asignada a un atributo le ponemos el valor que contiene la señal y luego escuchamos la señal para que cuando cambie el valor de la señal cambiamos el valor que tiene el atributo en el DOM. Ya que esta logica se esta complicando no esta mal separar en una funcion aparte solo si piensas en expandir en el proyecto o preferencia. En este caso solo hace que mis slides sean más cortos xd',
    code: `
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
`
  })
  .useData((data, prev) => {
    const celem = data_refs.createElement.require(data);
    const csignal = data_refs.createSignal.require(data);

    return {
      title: prev.title,
      text: `Nuestra funcion \`${celem}\` ahora usaria esta funcion \`handleAttributes\` para poder usar señales en los attributos. Tambien incluire el ejemplo de un contador aunque no podamos ver`,
      code: `
export function ${celem}(tag, props = {}) {
    const elem = document.createElement(tag);
    handleAttributes(elem, props);
    const children = [props.children].flat(Infinity).filter((x) => x != null);
    for (const child of children) {
        elem.append(child);
    }
    return elem;
}

function Counter() {
    const count = ${csignal}(0);
    return ${celem}('input', {
        value: count,
        type: 'button',
        onclick: () => count.update((x) => x + 1),
    });
}
`,
    };
  })
  .changeAll({
    title: 'Paso 4: Señales como Hijo',
    text: 'Señales como hijo sigue la misma logica mientras tanto solo sean valores primitivos como "string", "boolean" y "number".',
    code: `
function handleChildren(elem, children) {
    for (const child of children) {
        if (child instanceof MySignal) {
            // Creamos un nodo de texto, ya que ocupamos poder actualizar este pedazo de texto exactamente
            const node = document.createTextNode(String(child));
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
`,
  })
  .changeAll({
    title: 'Paso 4.2: Elementos dentro de señales',
    text: 'Hay momentos donde de hecho quieres cambiar todo un elemento por alguna razon y pues metiendolo en una señal es una solucion relativamente simple. Esa señal que tiene el elemento probablemente es una señal con un valor computado, demostrando tal vez en un momento un div que dice "cargando" pero despues de recibir alguna informacion demuestra un div con la informacion. Aunque no voy agregar suporte de nullo a algo, ya que nos perdemos el salsa si nos ponemos a pensar en todo.',
    code: `
// Quito el resto del codigo solo para enfocar en el cambio
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
    // etc...
}
// etc...
`
  })
  .changeAll({
    title: 'Paso: 5: ???, Paso 6: Profit',
    text: 'De verdad hay mucho más que se pudiera agregar y mejorar pero con esto ya es suficiente para poder crear y manejar algo completamente local.\nLo recomiendo? No.\nCreó que lo deberias intentar? Sí.',
    code: '',
  })
  .changeAll({
    title: 'Ejercicio',
    text: 'Maquetamos algo sencillo, como una serie de posts demostrados de manera lineal. Nada especial solo una lista de ellos. Proporciono los metodos con los que sacamos los posts. No hacemos nada especial pero pudieras cambiar las implementaciones para que se connecten con una API de algun servidor o algo así. Pero yo quiero que este ejemplo funcione sin internet.',
    code: `
// Posts de ejemplo
const POSTS = [
  { id: crypto.randomUUID(), username: 'Meliodas', body: 'Visit the Hog Inn for great beer!' },
  { id: crypto.randomUUID(), username: 'Buefido', body: 'Mis musculos estan creciendo musculos!' },
  { id: crypto.randomUUID(), username: 'Mai', body: 'Sudoku esta bien' },
  { id: crypto.randomUUID(), username: 'jmnuf', body: 'El verano es la mejor temporada' },
];
const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1_000));
// Consigue todos los IDs de los posts con algo de espera para simular baja conectividad
async function getPostIds() {
  await sleep(5);
  return POSTS.map((post) => post.id);
}
// Consigue los datos de un post utilizando el ID del post como referencia
async function getPost(id) {
  await sleep(Math.floor(Math.random() * 3 + 3));
  return POSTS.find((post) => post.id == id);
}
`
  })
  .useData((data, prev) => {
    const celem = data_refs.createElement.require(data)
    const csign = data_refs.createSignal.require(data)

    return {
      title: prev.title,
      text: 'Podemos empezar con como mostraremos un solo post. Podemos hacer una funcion llama "Post" que recibira un objeto donde solo se esperara la llave "id" con el id del post. En este tenemos que tener en cuenta que el post no lo recibimos de una pero llegara de manera asincrona a nosotros. Podemos manejar esto con nuestras señales de manera sencilla. Podemos tener una señal que recibira los datos y otra señal computada que creara la interfaz requerida para demostrar los datos. Finalmente regresamos un div que tiene como unico hijo nuestra señal computada.\nNo nos preocupamos de ocupar escapar ningun string porque el DOM lo hace por nosotros, ¡magico!',
      code: `// Importar nuestro framework de juguete
import { ${celem}, ${csign} } from './toy.js';

function Post({ id }) {
  const data = ${csign}(null);
  const post = data.computed((data) => {
    if (data == null) {
      return ${celem}('p', { innerText: 'Cargando post...' });
    }
    return ${celem}('article', {
      children: [
        ${celem}('p', { children: [data.username, ' dice: ', data.body] })
      ],
    });
  });

  getPost(id).then((postData) => { data.value = postData });

  return ${celem}('div', { children: post });
}
  `
    }
  })
  .useData((data, prev) => {
    const celem = data_refs.createElement.require(data)
    const csign = data_refs.createSignal.require(data)

    return {
      title: prev.title,
      text: 'Ahora creariamos la funcion o componente para demostrar todo el listado de posts. En este caso tambien conseguimos los IDs de los posts de manera asincrona y recolectamos todo con una señal. Creamos una lista de posts dentro de un div en una señal computada igual pero regresando el mensaje de cargando cuando no tenemos nada.\nEl codigo aquí tambien es un poco más limpio que cuando se hace todo a mano en mi opinion.',
      code: `// Importar nuestro framework de juguete
import { ${celem}, ${csign} } from './toy.js';

function Feed() {
  const postIds = ${csign}(null);
  const content = postIds.computed((ids) => {
    if (ids == null) {
      return ${celem}('h2', { innerText: 'Obteniendo posts de nuestro algoritmo lineal...' });
    }
    const posts = ids.map((id) => Post({ id }));
    return ${celem}('div', {
      children: posts,
    })
  });
  getPostIds().then((ids) => postIds.value = ids);

  return ${celem}('main', {
    children: content,
  });
}
`
    };
  })
  .changeAll({
    title: '¡Hasta Luego!',
    text: 'Encima de esto puedes intentar agregar la creación de posts. Te invito a que busques como hacer una applicacion de tu interes con estos conocimientos. La mejor manera de aprender es hacer, el camino más largo al mejoramiento personal son los atajos!',
    code: '',
  })
  .build();
