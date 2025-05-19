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

type SlideBuilderFirst = Partial<SlideData> & { title: SlideData['title'] };

interface SlidesBuilder {
  changeText(new_text: string): SlidesBuilder;
  changeTitleAndText(new_title: string, new_text: string): SlidesBuilder;
  changeCode(new_code: string): SlidesBuilder;
  changeTextAndCode(new_text: string, new_code: string): SlidesBuilder;
  changeTextAndCodeWithInputs(new_text: string, new_code: string, ...inputs: Array<SlideInput>): SlidesBuilder;
  changeAll(slide: SlideData): SlidesBuilder;

  useData(fn: (data: Record<string, SlideInput>, previous_slide: SlideData) => SlideData): SlidesBuilder;

  build(): SlidesManager;
}

type SlidesList = [SlideData, ...tail: Array<SlideData | ((data: Record<string, SlideInput>, previous_slide: SlideData) => SlideData)>];

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
  public data: Record<string, SlideInput>;

  constructor(slides: SlidesList) {
    super();
    this.slides = slides;
    this.data = {} as Record<string, SlideInput>;
    this.index = 0;
    this.current_slide = slides[0];
    while (this.index < 7 && this.index < this.length - 1) this.next_slide();
    this.addEventListener;
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

function ensureData(data: Record<string, SlideInput>, defaults: SlideInput) {
  if (!(defaults.name in data) || data[defaults.name].kind !== defaults.kind) {
    data[defaults.name] = {
      name: defaults.name,
      kind: defaults.kind,
      value: defaults.value as any,
    };
  }
  return data[defaults.name];
}

export const slides = slidesBuilder()
  .first({ title: '¿Por qué un Framework?' })
  .changeText('Interfazes modernas son complicadas')
  // TODO: Rewrite this slide
  .changeTitleAndText('', `
Dejamos interfaces sencillas de implementar hace mucho.
Cuando algo se actualiza pero ocupas demostrarlo en multiples lugares.
Cuando hay muchas maneras en que un usuario puede interactuar.
Al interactuar siempre intentamos demostrar alguna reaccion preferiblemente dentro de 100ms.
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
    ensureData(data, {
      name: 'createElement',
      kind: 'text',
      value: 'createElement',
    });
    const createElement = data.createElement.value as string;

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
        { name: 'createElement', kind: 'text', value: createElement },
      ],
    };
    return slide;
  })
  .useData((data) => {
    ensureData(data, {
      name: 'createSignal',
      kind: 'text',
      value: 'createSignal',
    });

    const createElement = data.createElement.value;
    const createSignal = data.createSignal
      ? (data.createSignal.kind === 'text' && data.createSignal.value)
      || 'createSignal'
      : 'createSignal';

    const slide: SlideData = {
      title: 'Estructura',
      text: 'De hecho estamos agarrando el formato de llamado de funcion que se usa en el JSX más o menos. Vamos a tambien utilizar "señales" para guardar estados reactivos y que nuestro framework actualize la interfaz basado en el valor que tengan. Esto va a diferencia de React que llama tu funcion multiples veces para "pintar" virtualmente y luego solo enseña los cambios.',
      code: `
// Ejemplo codigo de lo que queremos poder escribir en nuestro framework
function Counter() {
    const [count, setCount] = ${createSignal}(0);

    return ${createElement}('button', {
        children: ['Apretado ', count, ' veces'],
        onClick: () => setCount((c) => c + 1),
    });
}
`,
      inputs: [
        { name: 'createSignal', kind: 'text', value: createSignal },
      ],
    };
    return slide;
  })
  .build();
