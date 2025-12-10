import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';

interface User {
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void; 
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


const TOKEN_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    
    verifyToken();
    
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const startTokenRefreshTimer = () => {
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    
    refreshIntervalRef.current = setInterval(() => {
      refreshTokenAutomatically();
    }, TOKEN_REFRESH_INTERVAL);
  };

  const refreshTokenAutomatically = async () => {
    try {
      const { authApi } = await import('../api/client');
      const data = await authApi.refreshToken();
      
      if (data.status === 'success') {
        console.log('Token refreshed successfully');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      logout();
    }
  };

  const verifyToken = async () => {
    try {
      
      const { authApi } = await import('../api/client');
      const data = await authApi.verifyToken();
      
      if (data.status === 'success') {
        setUser({
          email: data.user.email,
          name: data.user.name,
          picture: data.user.picture || '',
        });
        
        
        startTokenRefreshTimer();
      } else {
        
        setUser(null);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  
  const login = (userData: User) => {
    setUser(userData);
    
    startTokenRefreshTimer();
  };

  const logout = async () => {
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    try {
      
      const { authApi } = await import('../api/client');
      await authApi.logout();
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,  
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