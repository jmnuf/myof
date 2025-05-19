import { elt } from './elt';
import { router } from './router';
import type { Routes, HistoryState } from './router';

const emptyState = (): HistoryState => ({ params: {}, query: {} });

function NavItem(props: { name: string; route: Routes, historyState: HistoryState }) {
  return elt('li', {
    className: 'flex',
    children: elt('a', {
      className: 'px-4 py-2 cursor-pointer',
      children: props.name,
      onClick(event) {
        event.preventDefault();
        router.push(props.route, props.historyState);
      },
    }),
  });
}

interface NavbarProps {
  talkSlide?: number;
}

export function Navbar({ talkSlide }: NavbarProps) {
  const talkState = emptyState();
  if (talkSlide) {
    talkState.query.slide = '' + talkSlide;
  }
  return elt('nav', {
    className: 'w-full flex bg-slate-600 text-red-100',
    children: elt('ul', {
      className: 'w-full flex gap-1 justify-end px-4',
      children: [
        NavItem({ name: 'Home', route: '/', historyState: emptyState(), }),
        NavItem({ name: 'Talk', route: '/talk', historyState: talkState, }),
        NavItem({ name: 'Feed', route: '/feed', historyState: emptyState(), }),
      ],
    }),
  });
}

