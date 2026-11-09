import { useEffect, useState } from 'react';

/** Minimal hash router: works on GitHub Pages without server rewrites. */
export type Route = { page: 'list' } | { page: 'project'; id: string; tab: string };

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'p' && parts[1]) return { page: 'project', id: decodeURIComponent(parts[1]), tab: parts[2] ?? 'request' };
  return { page: 'list' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const projectHref = (id: string, tab = 'request') => `#/p/${encodeURIComponent(id)}/${tab}`;

export function navigate(href: string) {
  window.location.hash = href.replace(/^#/, '');
}
