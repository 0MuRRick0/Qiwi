import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  loginUser, 
  registerUser, 
  getCurrentUser, 
  logoutUser 
} from '../services/api';
import styles from '../index.css'

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email, password) => {
    try {
      await loginUser(email, password);
      const response = await getCurrentUser(); 
      setUser(response);
      console.log("HEY IM HERE (auth provider)" + response.data)
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };

  const register = async (email, username, password, password2) => {
    try {
      await registerUser(email, username, password, password2);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const userData = await getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      checkAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);