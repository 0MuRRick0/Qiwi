
import React, { useState } from 'react';

import { createGenre } from '../services/api';

function GenreManagement({ onGenreAdded }) {
  const [genreName, setGenreName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    </div>
  );
}

export default GenreManagement;
