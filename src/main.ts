import { elt, render, useValue } from './elt';
import { Navbar } from './Navbar';
import { router } from './router';

export function plurality(count: number, single: string, many: string): string {
  return count === 1 ? single : many;
}

function App({ root }: { root: HTMLElement }) {
  const route = useValue(location.pathname);
  route;
  router;

  return elt(root, {
    children: Navbar({ talkSlide: 10 })
  });
}

render('div#app', App);

