
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createMovie, getAllGenres } from '../services/api'; 
import GenreManagement from '../components/GenreManagement';

function AddMoviePage() {
  const navigate = useNavigate();
  const { user, fetchUserPrivileges } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    
    release_date: '', 
    genres: [] 
  });
  
  
  const [availableGenres, setAvailableGenres] = useState([]); 
  const [loadingGenres, setLoadingGenres] = useState(false); 
  const [errorGenres, setErrorGenres] = useState(''); 

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [checkingPrivileges, setCheckingPrivileges] = useState(true);

  
  useEffect(() => {
    const checkPrivileges = async () => {
      setCheckingPrivileges(true);
      if (user) {
        try {
          const privileges = await fetchUserPrivileges();
          setIsStaff(!!privileges?.is_staff); 
        } catch (err) {
          console.error("AddMoviePage: Failed to fetch privileges:", err);
          setIsStaff(false);
        }
      } else {
        setIsStaff(false);
      }
      setCheckingPrivileges(false);
    };
    checkPrivileges();
  }, [user, fetchUserPrivileges]); 

  
  useEffect(() => {
    const loadGenres = async () => {
      if (!isStaff) return; 
      setLoadingGenres(true);
      setErrorGenres('');
      try {
        const response = await getAllGenres();
        
        setAvailableGenres(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Ошибка загрузки жанров:", err);
        setErrorGenres('Не удалось загрузить список жанров.');
        setAvailableGenres([]); 
      } finally {
        setLoadingGenres(false);
      }
    };

    loadGenres();
  }, [isStaff]); 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  
  const handleGenreChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value, 10));
    setFormData(prev => ({
      ...prev,
      genres: selectedOptions
    }));
  };

  
  const handleGenreAdded = (newGenre) => {
    
    setAvailableGenres(prevGenres => [...prevGenres, newGenre]);
    
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isStaff) {
      setError('У вас нет прав для добавления фильмов.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      
      
      let formattedDate = formData.release_date;
      if (formattedDate && formattedDate.includes('T')) {
         
         formattedDate = formData.release_date.split('T')[0];
      }
      
      const movieDataToSend = {
        title: formData.title,
        release_date: formattedDate, 
        genres: formData.genres 
      };

      await createMovie(movieDataToSend); 
      setSuccess(true);
      
      setFormData({ title: '', release_date: '', genres: [] }); 
    } catch (err) {
      console.error("Ошибка добавления фильма:", err);
      
      if (err.response) {
        
        if (err.response.data) {
            
            const fieldErrors = [];
            for (const [field, messages] of Object.entries(err.response.data)) {
                if (Array.isArray(messages)) {
                   fieldErrors.push(`${field}: ${messages.join(', ')}`);
                } else if (typeof messages === 'string') {
                   fieldErrors.push(`${field}: ${messages}`);
                }
            }
            if (fieldErrors.length > 0) {
                setError(fieldErrors.join('; '));
            } else {
                
                setError(err.response?.data?.detail || 'Ошибка при добавлении фильма');
            }
        } else {
            setError('Ошибка при добавлении фильма');
        }
      } else if (err.request) {
        
        setError('Нет ответа от сервера. Проверьте соединение.');
      } else {
        
        setError('Ошибка запроса: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingPrivileges) return <div className="loading">Проверка прав доступа...</div>;
  if (!user || !isStaff) {
    return (
      <div className="admin-error">
        <h2>Доступ запрещен</h2>
        <p>У вас нет прав для просмотра этой страницы.</p>
      </div>
    );
  }

  return (
    <div className="form-page">
      <h2>Добавить новый фильм</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Фильм успешно добавлен!</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="movie-title">Название:</label>
          <input
            id="movie-title"
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="movie-release-date">Дата выхода:</label>
          <input
            id="movie-release-date"
            type="date"
            name="release_date"
            value={formData.release_date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="movie-genres">Жанры:</label>
          {loadingGenres ? (
            <p>Загрузка жанров...</p>
          ) : errorGenres ? (
            <p className="error-message">{errorGenres}</p>
          ) : (
            <>
            <select
              id="movie-genres"
              multiple
              value={formData.genres.map(String)}
              onChange={handleGenreChange}
              className="genre-select"
            >
              {availableGenres.map(genre => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </select>
            <small>Удерживайте Ctrl (Cmd на Mac) для выбора нескольких жанров.</small>
            </>
          )}
        </div>

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Добавление...' : 'Добавить фильм'}
        </button>
      </form>

      {}
      <div className="admin-section">
        <h3>Управление жанрами</h3>
        <GenreManagement onGenreAdded={handleGenreAdded} />
      </div>
    </div>
  );
}

export default AddMoviePage;
