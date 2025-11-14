import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
    
    // Check for OAuth callback
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get('session_token');
    const authSuccess = params.get('auth');
    
    if (sessionToken && authSuccess === 'success') {
      // Store session token
      localStorage.setItem('twitch_session', sessionToken);
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Reload auth status
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/auth/status`);
      setIsAuthenticated(response.data.authenticated);
      
      if (response.data.authenticated) {
        // Get full user info
        const userResponse = await axios.get(`${BACKEND_URL}/api/auth/user`);
        setUser(userResponse.data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/auth/login`);
      window.location.href = response.data.authorization_url;
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`);
      localStorage.removeItem('twitch_session');
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        login,
        logout,
        checkAuthStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
