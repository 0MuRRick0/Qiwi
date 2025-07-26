import axios from 'axios';

const API_BASE = '/api';
const apiClient = axios.create({ baseURL: API_BASE });

// Interceptor для добавления токена
apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }, error => {
    return Promise.reject(error);
  });

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh: refreshToken });
        
        localStorage.setItem('accessToken', data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(originalRequest);
      } catch (e) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(e);
      }
    }
    
    return Promise.reject(error);
  }
);

export const loginUser = (email, password) => {
  return apiClient.post('/auth/login/', { email, password })
    .then(res => {
      localStorage.setItem('accessToken', res.data.access);
      localStorage.setItem('refreshToken', res.data.refresh);
      return res;
    });
};

export const registerUser = (email, username, password, password2) => {
  return apiClient.post('/auth/register/', { email, username, password, password2 });
};

export const getCurrentUser = () => {
  return apiClient.get('/auth/me/');
};

export const logoutUser = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

export const getMovies = (page = 1, limit = 20) => {
  return apiClient.get('/catalog/movies/', { params: { page, limit } })
    .then(res => Array.isArray(res.data) ? res.data : []);
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

