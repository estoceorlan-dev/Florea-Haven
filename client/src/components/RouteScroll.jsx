import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function RouteScroll() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  useLayoutEffect(() => {
    if (navigationType !== 'POP')
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, navigationType]);
  return null;
}
