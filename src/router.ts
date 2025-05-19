import { render, elt } from './elt';
import type { BaseProps } from './elt';
import { Talk } from './Talk';
import { Home } from './Home';
import { List } from './utils';
import { Feed } from './Feed';

export interface RouteProps extends BaseProps {
  root: HTMLElement;
  historyState: HistoryState;
}

type RouterRoutesConfigElement = ((props: RouteProps) => Element) | HTMLElement;
type RouterRoutesConfig = {
  [K in Routes]: RouterRoutesConfigElement;
};

type ReverseListRec<List extends any[], Result extends any[]> = List extends []
  ? Result
  : List extends [infer Head extends any, ...infer Tail extends any[]]
  ? ReverseListRec<Tail, [Head, ...Result]>
  : never
  ;
type ReverseList<List extends any[]> = ReverseListRec<List, []>;

type SplitPathRec<Path extends string, Pieces extends string[]> = Path extends '' | '/'
  ? ReverseList<Pieces>
  : Path extends `/${infer Part extends string}/${infer Tail extends string}`
  ? SplitPathRec<`/${Tail}`, [Part, ...Pieces]>
  : Path extends `/${infer Part extends string}`
  ? SplitPathRec<'', [Part, ...Pieces]>
  : never
  ;
type SplitPath<FullPath extends `/${string}`> = SplitPathRec<FullPath, []>;

type FindParamsRec<PathParts extends string[], Params extends string[]> = PathParts extends []
  ? Params
  : PathParts extends [infer Head extends string, ...infer Tail extends string[]]
  ? Head extends `:${infer ParamName extends string}`
  ? FindParamsRec<Tail, [ParamName, ...Params]>
  : FindParamsRec<Tail, Params>
  : never
  ;
type FindParams<FullPath extends `/${string}`> = FindParamsRec<SplitPath<FullPath>, []>[number];

type InferPathData<Path extends string> = Path extends `/${string}/:${string}` | `/:${string}` ? {
  params: {
    [Param in FindParams<Path>]: string;
  },
  query: Record<string, string | string[]>,
} : {
  params: {},
  query: Record<string, string | string[]>,
};

interface Router<Routes extends RouterRoutesConfig> {
  push<Path extends keyof Routes & `/${string}` | (string & {})>(path: Path, data: InferPathData<Path>): void;
  load<Path extends keyof Routes & `/${string}` | (string & {})>(path: Path, data: InferPathData<Path>): void;
  back(): void;
}
interface RouterConfig<Routes extends RouterRoutesConfig> {
  root: HTMLElement;
  routes: Routes;
}

function parsePathParams(route: string, href: string) {
  const params = {} as Record<string, string>;
  const routeSplit = route.split('/');
  const hrefSplit = href.split('/');
  if (routeSplit.length !== hrefSplit.length) return null;
  for (const [a, b] of List.zip(routeSplit, hrefSplit)) {
    if (!a.startsWith(':')) {
      if (a !== b) return null;
      continue;
    }
    const paramName = a.substring(1);
    params[paramName] = b;
  }
  return params;
}

function findRoute(routes: RouterRoutesConfig, pathname: string) {
  for (const route of Object.keys(routes) as unknown as keyof typeof routes) {
    if (!route.includes('/:')) {
      if (route === pathname) return [route, {}] as const;
      continue;
    }
    const params = parsePathParams(route, pathname);
    if (params == null) continue;
    return [route, params] as const;
  }
  return null;
}

function readQueryParams(queryString: string) {
  const query = {} as Record<string, string | string[]>;
  const urlParams = new URLSearchParams(queryString);
  for (const key of urlParams.keys()) {
    const values = urlParams.getAll(key);
    if (values.length == 1) {
      query[key] = values[0];
      continue;
    }
    query[key] = values;
  }
  return query;
}
function craftQueryString(query: Record<string, string | string[]>) {
  const urlParams = new URLSearchParams();
  for (const key of Object.keys(query)) {
    const qs = query[key];
    if (!Array.isArray(qs)) {
      urlParams.set(key, qs);
      continue;
    }
    for (const value of qs) {
      urlParams.append(key, value);
    }
  }
  const search = urlParams.toString();
  return search.length === 0 ? search : `?${search}`;
}
function craftPathString(route: string, params: Record<string, string>, query: Record<string, string | string[]>) {
  let path = '';
  for (const piece of route.split('/').filter(Boolean)) {
    path += '/';
    if (!piece.startsWith(':')) {
      path += piece;
      continue;
    }
    path += params[piece.substring(1)];
  }
  return path + craftQueryString(query);
}

export type HistoryState = { params: Record<string, string>; query: Record<string, string | string[]> };

function createRouter<TRoutes extends RouterRoutesConfig>(cfg: RouterConfig<TRoutes>): Router<TRoutes> {
  console.log(cfg);
  const routes = cfg.routes;
  let current_state = {} as HistoryState;
  const router: Router<TRoutes> = {
    back: () => history.back(),
    push(route, state) {
      const path = craftPathString(route, state.params, state.query);
      history.pushState(current_state, '', path);
      router.load(route, state);
    },
    load(route, state) {
      const Page = (routes as any)[route] as RouterRoutesConfigElement | undefined;
      current_state = state as HistoryState;
      if (!Page) {
        cfg.root.innerHTML = `<main><h1>ERROR 404</h1><h2>Page was not found</h2><a href="/">Home</a></main>`;
        return;
      }
      cfg.root.innerHTML = '';
      if (!cfg.root.id) cfg.root.id = 'router-root';
      if (typeof Page === 'function') {
        render('#' + cfg.root.id, ({ root }) => Page({ root, historyState: current_state, }));
      } else {
        render('#' + cfg.root.id, ({ root }) => elt(root, { children: Page, }));
      }
    },
  };
  window.addEventListener('popstate', (event) => {
    router.load(location.pathname as Routes, event.state);
  });

  const query = readQueryParams(location.search);
  const start = findRoute(cfg.routes, location.pathname);
  queueMicrotask(() => {
    if (start == null) {
      router.load(location.pathname as any, { query, params: {} });
      return;
    }
    const [path, params] = start;
    router.load(path as any, { params, query, });
  });
  return router;
}

export const router = createRouter({
  root: document.querySelector('div#app')!,
  routes: {
    '/': Home,
    '/talk': Talk,
    '/feed': Feed,
  },
});
export type Routes = '/' | '/talk' | '/feed' // typeof router extends Router<infer Routes> ? keyof Routes : never;

