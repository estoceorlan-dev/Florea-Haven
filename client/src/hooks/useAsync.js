import { useCallback, useEffect, useState } from 'react';

export const useAsync = (load, dependencies = []) => {
  const [state, setState] = useState({
    data: null,
    error: null,
    isLoading: true,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    // Loading must reset when a request's inputs change; this is the effect's
    // synchronization point with the remote API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((current) => ({ ...current, error: null, isLoading: true }));

    load(controller.signal)
      .then((data) => {
        if (isCurrent) setState({ data, error: null, isLoading: false });
      })
      .catch((error) => {
        if (isCurrent && error.name !== 'AbortError') {
          setState({ data: null, error, isLoading: false });
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
    // The caller controls refresh behavior through the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, reloadKey]);

  return { ...state, retry };
};
