// src\pages\AddMoviePage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createMovie, getAllGenres, createGenre } from '../services/api';
import GenreManagement from '../components/GenreManagement';

function AddMoviePage() {
  const navigate = useNavigate();
  const { user, fetchUserPrivileges } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    release_date: '',
    genres: []
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Локальное состояние для привилегий
  const [isStaff, setIsStaff] = useState(false);
  const [checkingPrivileges, setCheckingPrivileges] = useState(true);

  // Эффект для проверки привилегий
  useEffect(() => {
    // console.log("AddMoviePage: Privileges useEffect triggered", { user }); // Для отладки
    const checkPrivileges = async () => {
      setCheckingPrivileges(true);
      if (user) {
        try {
          // console.log("AddMoviePage: Fetching privileges..."); // Для отладки
          const privileges = await fetchUserPrivileges();
          // console.log("AddMoviePage: Privileges fetched:", privileges); // Для отладки
          setIsStaff(!!privileges.is_staff);
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
    // Зависимости должны быть стабильны
  }, [user, fetchUserPrivileges]); // <-- Эти зависимости теперь стабильны

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      await createMovie(formData);
      setSuccess(true);
      setFormData({ title: '', description: '', release_date: '', genres: [] });
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при добавлении фильма');
    } finally {
      setLoading(false);
    }
  };

  // Показываем индикатор загрузки, если проверяются привилегии
  if (checkingPrivileges) return <div className="loading">Проверка прав доступа...</div>;

  // Если пользователь не аутентифицирован или не админ, показываем ошибку
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
          <label htmlFor="title">Название:</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Описание:</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="release_date">Дата выхода:</label>
          <input
            type="datetime-local"
            id="release_date"
            name="release_date"
            value={formData.release_date}
            onChange={handleChange}
            required
          />
        </div>
        
        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Добавление...' : 'Добавить фильм'}
        </button>
      </form>

      {/* Используем локальное состояние isStaff для условного рендеринга GenreManagement */}
      {isStaff && <GenreManagement />}
    </div>
  );
}

export default AddMoviePage;