
import axios from 'axios';

import { jwtDecode } from 'jwt-decode'; 

const API_BASE = '/api';


const apiClient = axios.create({
  baseURL: API_BASE,
});


apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          
             localStorage.removeItem('accessToken');
             localStorage.removeItem('refreshToken');
             window.location.href = '/login';
             return Promise.reject(error);
        }
        const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh: refreshToken });
        localStorage.setItem('accessToken', data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(originalRequest);
      } catch (e) {
        console.error("Token refresh failed:", e);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);



export const loginUser = async (email, password) => {
  try {
    console.log("API: Attempting to login user:", email); 
    const res = await apiClient.post('/auth/login/', { email, password });
    const { access, refresh } = res.data;
    console.log("API: Login successful, tokens received"); 
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);

    
    return {
      success: true,
      data: {
        tokens: { access, refresh }
        
      }
    };
  } catch (error) {
    console.error("API: Login failed:", error.response?.data || error.message); 
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
};

export const registerUser = (email, username, password, password2) => {
  return apiClient.post('/auth/register/', { email, username, password, password2 });
};

// Эта функция больше не используется для получения базовой инфы о пользователе
// export const getCurrentUser = () => {
//   return apiClient.get('/auth/me/'); 
// };


export const getUserPrivileges = () => {
  console.log("API: Fetching user privileges"); 
  return apiClient.get('/auth/priveleges/');
};

export const logoutUser = () => {
  console.log("API: Logging out user"); 
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

export const getMovies = (page = 1, limit = 20) => {
  return apiClient.get('/catalog/movies/', { params: { page, limit } }).then(res => Array.isArray(res.data) ? res.data : []);
};

export const getMovieById = (id) => {
  return apiClient.get(`/catalog/movies/${id}/`);
};


// Для работы с catalog-service
export const createMovie = (movieData) => {
  return apiClient.post('/catalog/movies/create/', movieData);
};

// Для работы с file-service
export const uploadMovieFile = (movieId, fileType, file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiClient.post(`/file/upload/${movieId}/${fileType}/`, formData, {
    onUploadProgress: onProgress,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const createGenre = (genreData) => {
  return apiClient.post('/catalog/genres/create/', genreData);
};

export const getAllGenres = () => {
  return apiClient.get('/catalog/genres/');
};

