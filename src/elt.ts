
type HTMLTagName = keyof HTMLElementTagNameMap;
type HTMLElementByTag<Tag extends HTMLTagName> = HTMLElementTagNameMap[Tag];

type SVGTagName = keyof SVGElementTagNameMap;
type SVGElementByTag<Tag extends SVGTagName> = SVGElementTagNameMap[Tag];

type ExcludedElemKeysForProps =
  | `on${string}`
  | `${'inner' | 'outer'}HTML`
  | `${'DOCUMENT' | 'ELEMENT' | 'ATTRIBUTE'}${string}`
  | `${string}NODE${string}`
  | `client${string}`
  | `offset${string}`
  | `scroll${string}`
  | `node${'Name' | 'Type'}`
  | `${string}${'slot' | 'Slot'}${string}`
  | `${string}${'child' | 'Child'}${string}`
  | `${string}${'sibling' | 'Sibling'}${string}`
  | `${string}${'parent' | 'Parent'}${string}`
  | `${string}${'document' | 'Document'}${string}`
  | `${string}children${string}`
  | `${string}URI`
  | 'outerText'
  | 'classList'
  | 'prefix'
  | 'shadowRoot'
  | 'attributes'
  | 'localName'
  | 'childElementCount'
  | 'currentCSSZoom'
  | 'isConnected'
  | 'tagName';

// type AllowedElemTypesForProps =
//   | string
//   | number
//   | boolean
//   ;

type AsNormAndArray<T> = T | Array<T>;

type EltNode = AsNormAndArray<Node | string | number | bigint | FC<any>>;

export interface BaseProps {
  children?: EltNode | Array<EltNode>;
}

export interface FC<T extends BaseProps = {}> {
  (props: T): EltNode;
}


type ElemProps<Elem extends Element> = {
  [Key in keyof Elem as Key extends ExcludedElemKeysForProps
  ? never
  : Key
  ]?: Key extends 'value' ? (string | number) : Elem[Key];
} & (Elem extends HTMLInputElement ? { value?: string | number } : {}) & (
    Elem extends HTMLElement
    ? {
      [K in keyof HTMLElementEventMap as `on${Capitalize<K>}`]?: (event: HTMLElementEventMap[K]) => void;
    }
    : {
      [K in keyof SVGElementEventMap as `on${Capitalize<K>}`]?: (event: SVGElementEventMap[K]) => void;
    }
  ) & {
    ref?: Elem;
  } & {
    children?: EltNode | Array<EltNode>
  };

type ElemPropEntries<T extends ElemProps<Element> = ElemProps<Element>> = {
  [K in keyof T]-?: [K, T[K]];
}[keyof T];

const startsWith = <Prefix extends string>(s: string, prefix: Prefix): s is `${Prefix}${string}` => s.startsWith(prefix);

const flatChildren = (children: Array<EltNode>): Array<Node> => {
  return children
    .flat(Infinity)
    .flatMap((v) => {
      let ev: EltNode | Node = v;
      while (typeof ev === 'function') {
        ev = ev({});
      }
      if (typeof ev === 'string') {
        ev = document.createTextNode(ev);
      }
      return typeof ev !== 'string' && !(ev instanceof Node) ? document.createTextNode(String(ev)) : ev;
    });
};


export function helt<Tag extends HTMLTagName, Elem extends HTMLElement = HTMLElementByTag<Tag>>(tag: Tag, attrs: ElemProps<Elem> = {} as any): Elem {
  const elem = document.createElement(tag) as any as Element;
  for (const [k, v] of (Object.entries(attrs) as Array<ElemPropEntries>)) {
    if (k === 'ref') {
      (attrs as any)['ref'] = elem;
      continue;
    }
    if (v == null) continue;
    if (k === 'children') {
      elem.append(...flatChildren(Array.isArray(v) ? v : [v]));
      continue;
    }
    if (startsWith(k, 'on')) {
      let eventName = k.substring(2);
      eventName = eventName[0].toLowerCase() + eventName.substring(1);
      elem.addEventListener(eventName, v as any);
      continue;
    }
    elem[k] = v as any;
  }
  return elem as any;
}



const SVG_TAG_NAMES = Object.freeze([
  // 'a',
  'animate',
  'animateMotion',
  'animateTransform',
  'circle',
  'clipPath',
  'defs',
  'desc',
  'ellipse',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feComposite',
  'feConvolveMatrix',
  'feDiffuseLighting',
  'feDisplacementMap',
  'feDistantLight',
  'feDropShadow',
  'feFlood',
  'feFuncA',
  'feFuncB',
  'feFuncG',
  'feFuncR',
  'feGaussianBlur',
  'feImage',
  'feMerge',
  'feMergeNode',
  'feMorphology',
  'feOffset',
  'fePointLight',
  'feSpecularLighting',
  'feSpotLight',
  'feTile',
  'feTurbulence',
  'filter',
  'foreignObject',
  'g',
  'image',
  'line',
  'linearGradient',
  'marker',
  'mask',
  'metadata',
  'mpath',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'script',
  'set',
  'stop',
  'style',
  'svg',
  'switch',
  'symbol',
  'text',
  'textPath',
  'title',
  'tspan',
  'use',
  'view',
] as const);

const is_svg_tag = (tag: string): tag is SVGTagName => SVG_TAG_NAMES.includes(tag as any);

export function selt<Tag extends SVGTagName, Elem extends SVGElement = SVGElementByTag<Tag>>(tag: Tag, attrs: ElemProps<Elem> = {} as any): Elem {
  const elem = document.createElementNS('http://www.w3.org/2000/svg', tag) as any;
  for (const [k, v] of Object.entries(attrs) as Array<ElemPropEntries<ElemProps<SVGElement>>>) {
    if (k === 'ref') {
      (attrs as any)[k] = elem;
      continue;
    }
    if (v == null) continue;
    if (k === 'children') {
      elem.append(...flatChildren(Array.isArray(v) ? v : [v]));
      continue;
    }
    if (k.startsWith('on')) {
      let eventName = k.substring(2);
      eventName = eventName[0].toLowerCase() + eventName.substring(1);
      elem.addEventListener(eventName, v);
      continue;
    }
    elem[k] = v;
  }
  return elem;
}

export function Frag(children: Array<EltNode> = []): DocumentFragment {
  const frag = document.createDocumentFragment();
  frag.append(...flatChildren(children as any[]));
  return frag;
}

export function elt<Elem extends HTMLElement>(elem: Elem, attrs?: ElemProps<Elem>): Elem;
export function elt<Tag extends SVGTagName, Elem extends SVGElement = SVGElementByTag<Tag>>(tag: Tag, attrs?: ElemProps<Elem>): Elem;
export function elt<Tag extends HTMLTagName, Elem extends HTMLElement = HTMLElementByTag<Tag>>(tag: Tag, attrs?: ElemProps<Elem>): Elem;
export function elt(tag: string | Element, props: any): any {
  if (props == null) props = {};
  if (tag instanceof Element) {
    const elem = tag;
    for (const [k, v] of Object.entries(props) as Array<ElemPropEntries>) {
      if (k === 'ref') {
        (props as any)[k] = elem;
        continue;
      }
      if (v == null) continue;
      if (k === 'children') {
        elem.append(...flatChildren(Array.isArray(v) ? v : [v]));
        continue;
      }
      if (k.startsWith('on')) {
        let eventName = k.substring(2);
        eventName = eventName[0].toLowerCase() + eventName.substring(1);
        elem.addEventListener(eventName, v as any);
        continue;
      }
      (elem as any)[k] = v;
    }
    return elem;
  }
  if (is_svg_tag(tag)) return selt(tag, props);
  return helt(tag as any, props);
}

export interface ValueState<T> {
  readonly value: T;
  setTo: (v: T) => T;
  update: (f: (v: T) => T) => T;
  sub: (fn: (v: T) => any, cfg?: { once: boolean }) => void;
}

export const useValue = <T>(init: T): ValueState<T> => {
  let value = init;
  const listeners: Array<{ fn: (nv: T) => any, once: boolean; }> = [];
  const run_listeners = (value: T) => {
    let to_remove: number[] = [];
    for (let i = 0; i < listeners.length; ++i) {
      const cfg = listeners[i];
      cfg.fn(value);
      if (cfg.once) to_remove.push(i);
    }
    for (let i = to_remove.length - 1; i >= 0; --i) {
      const idx = to_remove[i];
      listeners.splice(idx, 1);
    }
  };
  return {
    get value() {
      return value;
    },

    setTo(v: T) {
      if (value === v) return value;
      const nv = value = v;
      run_listeners(nv);
      return nv;
    },

    update(f: (v: T) => T) {
      const nv = f(value);
      if (value === nv) return value;
      value = nv;
      run_listeners(nv);
      return nv;
    },

    sub(fn: (v: T) => any, cfg?: { once: boolean }) {
      listeners.push({ fn, once: cfg ? cfg.once : false });
    },
  };
};

type PromiseState<T> = { status: 'loading' } | { status: 'failed'; error: Error; } | { status: 'success'; value: T; };

export function usePromise<T>(promise: Promise<T>): ValueState<PromiseState<T>>;
export function usePromise<T>(promise: Promise<T>, state: ValueState<PromiseState<T>>): ValueState<PromiseState<T>>;
export function usePromise<T>(promise: Promise<T>, state = useValue<PromiseState<T>>({ status: 'loading' })): ValueState<PromiseState<T>> {
  promise
    .then((pv) => state.setTo({ status: 'success', value: pv }))
    .catch((err) => state.setTo({ status: 'failed', error: err instanceof Error ? err : new Error(String(err)) }));
  return state;
};

export const render = <T>(rootSelector: string, Component: (props: { root: HTMLElement }) => T): T => {
  const root = document.querySelector<HTMLElement>(rootSelector)!;
  if (!root) {
    throw new Error('No root element was found with given selector `' + JSON.stringify(rootSelector) + '`');
  }
  root.innerHTML = '';
  const output = Component({ root });
  queueMicrotask(() => {
    if (!root.isConnected) return;
    root.dispatchEvent(new Event('load'));
  });
  return output;
}

