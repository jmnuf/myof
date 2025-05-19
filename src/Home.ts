import { elt } from './elt';
import { Navbar } from './Navbar';

export function Home({ root }: { root: HTMLElement }) {
  return elt(root, {
    children: [
      Navbar,
      'Hello, World!',
    ],
  });
}
