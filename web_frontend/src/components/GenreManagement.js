import React, { useState } from 'react';
import { createGenre, deleteGenre } from '../services/api';
import './GenreManagement.css';

function GenreManagement({ onGenreAdded, genres = [], onGenreDeleted }) {
  const [genreName, setGenreName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const response = await createGenre({ name: genreName });
      console.log('Genre created:', response.data);
      setSuccess(`Жанр "${genreName}" успешно добавлен!`);
      
      if (onGenreAdded) {
        onGenreAdded(response.data); 
      }
      
      setGenreName(''); 
    } catch (err) {
      console.error('Error creating genre:', err);
      
      if (err.response) {
        setError(err.response?.data?.name?.[0] || 
                 err.response?.data?.detail || 
                 'Ошибка при добавлении жанра');
      } else if (err.request) {
        setError('Нет ответа от сервера. Проверьте соединение.');
      } else {
        setError('Ошибка запроса: ' + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (genreId, genreName) => {
    if (!window.confirm(`Вы уверены, что хотите удалить жанр "${genreName}"?`)) {
      return;
    }

    setError('');
    setSuccess('');
    setDeletingId(genreId);

    try {
      await deleteGenre(genreId);
      setSuccess(`Жанр "${genreName}" успешно удален!`);
      
      if (onGenreDeleted) {
        onGenreDeleted(genreId);
      }
    } catch (err) {
      console.error('Error deleting genre:', err);
      setError(err.message || 'Ошибка при удалении жанра');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="genre-management">
      <h2>Добавить новый жанр</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="genre-name">Название жанра:</label>
          <input
            id="genre-name"
            type="text"
            value={genreName}
            onChange={(e) => setGenreName(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        <button 
          type="submit" 
          className="submit-button"
          disabled={isSubmitting || !genreName.trim()}
        >
          {isSubmitting ? 'Добавляем...' : 'Добавить жанр'}
        </button>
      </form>

      {/* Список существующих жанров с возможностью удаления */}
      {genres.length > 0 && (
        <div className="existing-genres">
          <h3>Существующие жанры</h3>
          <ul className="genres-list">
            {genres.map((genre) => (
              <li key={genre.id} className="genre-item">
                <span className="genre-name">{genre.name}</span>
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => handleDelete(genre.id, genre.name)}
                  disabled={deletingId === genre.id}
                >
                  {deletingId === genre.id ? 'Удаление...' : 'Удалить'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default GenreManagement;