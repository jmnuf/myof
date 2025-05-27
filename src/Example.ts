import { Navbar } from './Navbar.js';
import type { RouteProps } from './router';

import { createElem as E, createSignal as S } from './toy.js';

interface ExampleProps extends RouteProps {
}

export function Example({ root }: ExampleProps) {
  for (let i = root.children.length - 1; i >= 0; --i) {
    const child = root.children.item(i);
    child?.remove()
  }

  const page = E('div', {
    children: Feed(),
  });

  root.append(Navbar({}), page);

  return root;
}

// Posts de ejemplo
const POSTS = [
  { id: crypto.randomUUID(), username: 'Meliodas', body: 'Visit the Hog Inn for great beer!' },
  { id: crypto.randomUUID(), username: 'Buefido', body: 'Mis musculos estan creciendo musculos!' },
  { id: crypto.randomUUID(), username: 'Mai', body: 'Sudoku esta bien' },
  { id: crypto.randomUUID(), username: 'jmnuf', body: 'El verano es la mejor temporada' },
];
const sleep = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1_000));
async function getPostIds(): Promise<string[]> {
  await sleep(5);
  return POSTS.map((post) => post.id);
}
async function getPost(id: string): Promise<typeof POSTS[number]> {
  await sleep(Math.floor(Math.random() * 3 + 3));
  return POSTS.find((post) => post.id == id)!;
}

function Feed() {
  const postIds = S(null);
  const content = postIds.computed((ids: null | string[]) => {
    if (ids == null) {
      return E('h2', { innerText: 'Obteniendo posts de nuestro algoritmo lineal...' });
    }
    const posts = ids.map((id) => Post({ id }));
    return E('div', {
      children: posts,
    })
  });
  getPostIds().then((ids) => postIds.value = ids);

  return E('main', {
    children: content,
  });
}

function Post({ id }: { id: string }) {
  const data = S(null);
  const post = data.computed((data: null | (typeof POSTS[number])) => {
    if (data == null) {
      return E('p', { innerText: 'Cargando post...' });
    }
    return E('article', {
      children: [
        E('p', { children: [data.username, ' dice: ', data.body] })
      ],
    });
  });

  getPost(id).then((postData) => { data.value = postData });

  return E('div', { children: post });
}

