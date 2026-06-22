import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import api from '../api/axiosConfig';
import type { AuthUser, LoginRequest, LoginResponse } from '../types';
import { authStorage } from '../utils/authStorage';
import { AuthContext } from './authContextValue';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => authStorage.getToken());
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    authStorage.clearToken();
    setToken(null);
    setUser(null);
  }, []);

  const loadUser = useCallback(async () => {
    const storedToken = authStorage.getToken();

    if (!storedToken) {
      setIsLoading(false);
      setUser(null);
      return;
    }

    try {
      setIsLoading(true);
      const { data } = await api.get<AuthUser>('/auth/me');
      setUser(data);
      setToken(storedToken);
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const { data } = await api.post<LoginResponse>('/auth/login', credentials);

      authStorage.setToken(data.access_token);
      setToken(data.access_token);

      const meResponse = await api.get<AuthUser>('/auth/me');
      setUser(meResponse.data);
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
    window.location.href = '/login';
  }, [clearSession]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isLoading,
      login,
      logout,
      loadUser,
    }),
    [isLoading, loadUser, login, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
