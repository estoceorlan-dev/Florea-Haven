export const liveStockOptions = {
  refetchInterval: (query) =>
    query.state.error?.status >= 400 && query.state.error?.status < 500
      ? false
      : 30_000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: 'always',
  refetchOnReconnect: 'always',
};
