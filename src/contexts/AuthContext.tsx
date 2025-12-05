import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      verifyToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      // Token is already set in localStorage, axios interceptor will use it
      const { authApi } = await import('../api/client');
      const data = await authApi.verifyToken();
      
      if (data.status === 'success') {
        setUser({
          email: data.user.email,
          name: data.user.name,
          picture: data.user.picture || '',
        });
        setToken(token);
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newToken: string) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);

    // Decode token to get user info
    try {
      const decoded: any = jwtDecode(newToken);
      setUser({
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture || '',
      });
    } catch (error) {
      console.error('Failed to decode token:', error);
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }
    
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        isLoading,
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