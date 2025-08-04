
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







export const getUserPrivileges = () => {
  console.log("API: Fetching user privileges");
  return apiClient.get('/auth/privileges/');
};

export const logoutUser = () => {
  console.log("API: Logging out user");
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

export const getMovies = (page = 1, limit = 20, search = '', genres = [], year = '', sort = '') => {
  const params = new URLSearchParams();
  
  if (page > 1) params.append('page', page);
  if (limit !== 20) params.append('limit', limit);
  if (search) params.append('search', search);
  genres.forEach(genre => {
    if (genre) params.append('genres', genre);
  });
  if (year) params.append('year', year);
  if (sort) params.append('sort', sort);

  const url = `/catalog/movies/?${params.toString()}`;
  console.log("API: Fetching movies with URL:", url);
  
  return apiClient.get(url);
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



export const deleteMovie = (movieId) => {
  return apiClient.delete(`/catalog/movies/${movieId}/delete/`);
};

export const updateMovie = (movieId, movieData) => {
  let formattedData = { ...movieData };
  if (formattedData.release_date && typeof formattedData.release_date === 'string' && formattedData.release_date.includes('T')) {
    formattedData.release_date = formattedData.release_date.split('T')[0];
  }
  return apiClient.put(`/catalog/movies/${movieId}/update/`, formattedData);
};

export const deleteFile = (movieId, fileType) => {
  return apiClient.delete(`/file/delete/${movieId}/${fileType}/`);
};

export const deleteAllFiles = (movieId) => {
  return apiClient.delete(`/file/delete/${movieId}/`);
};

export const deleteGenre = async (genreId) => {
  try {
    const response = await apiClient.delete(`/catalog/genres/delete/${genreId}/`);
    return response.data || { message: 'Жанр успешно удален' };
  } catch (error) {
    let errorMsg = 'Ошибка при удалении жанра';
    if (error.response?.data?.detail) {
      errorMsg = error.response.data.detail;
    } else if (error.response?.data?.message) {
      errorMsg = error.response.data.message;
    }
    throw new Error(errorMsg);
  }
};