import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createGenre } from '../services/api';

function GenreManagement() {
  const { user } = useAuth();
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
      setGenreName('');
    } catch (err) {
      console.error('Error creating genre:', err);
      setError(err.response?.data?.name?.[0] || 
               err.response?.data?.detail || 
               'Ошибка при добавлении жанра');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user?.data?.is_staff) {
    return (
      <div className="error">
        <p>Только администраторы могут добавлять жанры</p>
      </div>
    );
  }

  return (
    <div className="form-page">
      <h2>Добавить новый жанр</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Название жанра:</label>
          <input
            type="text"
            value={genreName}
            onChange={(e) => setGenreName(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting || !genreName.trim()}
        >
          {isSubmitting ? 'Добавляем...' : 'Добавить жанр'}
        </button>
      </form>
    </div>
  );
}

export default GenreManagement;