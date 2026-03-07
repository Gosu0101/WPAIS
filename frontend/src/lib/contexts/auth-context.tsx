'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { apiClient, setAccessToken as setClientAccessToken } from '../api/client';

export interface User {
  id: string;
  email: string;
  name: string;
  systemRole: 'ADMIN' | 'USER';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!accessToken;

  // accessToken 변경 시 client.ts에도 동기화
  const updateAccessToken = useCallback((token: string | null) => {
    setAccessToken(token);
    setClientAccessToken(token);
  }, []);

  // 토큰 갱신
  const refreshToken = useCallback(async () => {
    try {
      const response = await apiClient.auth.refresh();
      updateAccessToken(response.accessToken);
      setUser(response.user as User);
    } catch (error) {
      // 갱신 실패 시 로그아웃 상태로
      updateAccessToken(null);
      setUser(null);
      throw error;
    }
  }, [updateAccessToken]);

  // 로그인
  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.auth.login(email, password);
    updateAccessToken(response.accessToken);
    setUser(response.user as User);
  }, [updateAccessToken]);

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      await apiClient.auth.logout();
    } catch (error) {
      // 로그아웃 API 실패해도 로컬 상태는 초기화
      console.error('Logout API error:', error);
    } finally {
      updateAccessToken(null);
      setUser(null);
    }
  }, [updateAccessToken]);

  // 초기 로드 시 토큰 갱신 시도
  useEffect(() => {
    if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
      setIsLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        await refreshToken();
      } catch {
        // 토큰 갱신 실패는 정상 (로그인 안 된 상태)
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [pathname, refreshToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        accessToken,
        login,
        logout,
        refreshToken,
        setAccessToken: updateAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
