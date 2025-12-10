import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import api from '../services/api';
import TokenManager from '../utils/tokenManager';

const AuthContext = createContext(null);

const LOGIN_PATH = '/api/users/login';
const TOKEN_PATH = '/api/users/getToken';

export function AuthProvider({children}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const token = await TokenManager.getToken();
        const storedUser = await TokenManager.getUserData();
        if (token && storedUser) {
          if (!(await TokenManager.isTokenExpired())) {
            if (mounted) {
              setIsAuthenticated(true);
              setUser(storedUser);
            }
          } else {
            await TokenManager.clearToken();
          }
        }
      } catch (error) {
        console.error('Auth bootstrap failed', error);
      } finally {
        if (mounted) {
          setInitialized(true);
        }
      }
    };
    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    if (!email || !password) {
      setAuthError('Email and password are required');
      return false;
    }

    setAuthLoading(true);
    setAuthError(null);
    try {
      const data = await api.post(LOGIN_PATH, {email, password});
      if (!data?.token) {
        throw new Error('Missing token in response');
      }

      const userPayload = {
        email,
        name: data.name || email.split('@')[0],
        role: data.role || 'user',
      };

      await TokenManager.setToken(data.token, data.expiresIn, data.refreshToken);
      await TokenManager.setUserData(userPayload);

      setIsAuthenticated(true);
      setUser(userPayload);
      return true;
    } catch (error) {
      console.error('Auth login failed', error);
      setAuthError('Invalid email or password');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await TokenManager.clearToken();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const getTokenForOrg = useCallback(async orgName => {
    try {
      const data = await api.post(TOKEN_PATH, {orgName});
      if (data?.token) {
        await TokenManager.setToken(data.token, data.expiresIn, data.refreshToken);
        return data.token;
      }
      return null;
    } catch (error) {
      console.error('getTokenForOrg failed', error);
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      initialized,
      user,
      authLoading,
      authError,
      login,
      logout,
      getTokenForOrg,
    }),
    [isAuthenticated, initialized, user, authLoading, authError, login, logout, getTokenForOrg],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}

