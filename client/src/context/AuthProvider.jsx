import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api.js';
import { AuthContext } from './AuthContext.js';
import { useLocation } from 'react-router-dom';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [logoutLocationKey, setLogoutLocationKey] = useState(null);
  const location = useLocation();

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
    await authApi.logout();
    setLogoutLocationKey(location.key);
    setUser(null);
    setSessionError(null);
  }, [location.key]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      sessionError,
      register,
      login,
      logout,
      updateUser: setUser,
      logoutLocationKey,
    }),
    [isLoading, login, logout, register, sessionError, user, logoutLocationKey],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
