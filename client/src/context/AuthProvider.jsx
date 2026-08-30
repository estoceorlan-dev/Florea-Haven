import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api.js';
import { AuthContext } from './AuthContext.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    authApi
      .getMe()
      .then((payload) => {
        if (isCurrent) setUser(payload.data.user);
      })
      .catch((error) => {
        if (!isCurrent) return;
        setUser(null);
        if (error.status !== 401) setSessionError(error);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const register = useCallback(async (input) => {
    const payload = await authApi.register(input);
    setUser(payload.data.user);
    setSessionError(null);
    return payload.data.user;
  }, []);

  const login = useCallback(async (input) => {
    const payload = await authApi.login(input);
    setUser(payload.data.user);
    setSessionError(null);
    return payload.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setSessionError(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      sessionError,
      register,
      login,
      logout,
    }),
    [isLoading, login, logout, register, sessionError, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
