
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode'; 
import { loginUser as apiLoginUser, registerUser as apiRegisterUser, logoutUser as apiLogoutUser, getUserPrivileges as apiGetUserPrivileges } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [privileges, setPrivileges] = useState(null); 

  
  const decodeUserFromToken = useCallback((token) => {
    try {
      const payload = jwtDecode(token);
      return {
        id: payload.user_id,
        username: payload.username,
        email: payload.email,
      };
    } catch (error) {
      console.error("AuthContext: Error decoding token:", error);
      return null;
    }
  }, []);

  
  const login = useCallback(async (email, password) => {
    try {
      const loginResult = await apiLoginUser(email, password);
      if (loginResult.success) {
        const { access } = loginResult.data.tokens;
        const userDataFromToken = decodeUserFromToken(access);
        if (userDataFromToken) {
          setUser({ data: userDataFromToken });
          
          setPrivileges(null);
          return { success: true };
        } else {
          return { success: false, error: "Failed to decode user data from token" };
        }
      } else {
        return { success: false, error: loginResult.error };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }, [decodeUserFromToken]);

  
  const register = useCallback(async (email, username, password, password2) => {
    try {
      await apiRegisterUser(email, username, password, password2);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }, []);

  
  const logout = useCallback(() => {
    apiLogoutUser();
    setUser(null);
    setPrivileges(null); 
  }, []);

  
  
  
  const fetchUserPrivileges = useCallback(async () => {
    if (!user || !user.data || !user.data.id) {
      const error = new Error("User is not authenticated or basic data is missing");
      throw error;
    }

    
    if (privileges) {
        return privileges;
    }

    try {
      const privilegesResponse = await apiGetUserPrivileges();
      const privData = privilegesResponse.data;
      
      setPrivileges(privData);
      
      return privData;
    } catch (error) {
      console.error("AuthContext: Failed to fetch privileges:", error);
      if (error.response?.status === 401) {
        logout();
      }
      throw error;
    }
  }, [user, privileges, logout]); 

  
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const userDataFromToken = decodeUserFromToken(token);
        if (userDataFromToken) {
          setUser({ data: userDataFromToken });
          
        } else {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
    } catch (error) {
      console.error("AuthContext: Auth check failed:", error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [decodeUserFromToken]);

  
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  
  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    fetchUserPrivileges,
    privileges, 
  }), [user, loading, login, register, logout, fetchUserPrivileges, privileges]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);