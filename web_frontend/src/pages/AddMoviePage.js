import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createMovie, getAllGenres } from '../services/api';
import GenreManagement from '../components/GenreManagement';
import styles from '../index.css';

function AddMoviePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    release_date: '',
    genres: []
  });
  const [availableGenres, setAvailableGenres] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);

 
  const isAdmin = user?.is_staff || user?.data?.is_staff;

 
  useEffect(() => {
    if (!isAdmin) return;

    const loadGenres = async () => {
      try {
        const response = await getAllGenres();
        console.log('Raw genres response:', response);
        
       
        const genresData = Array.isArray(response) ? response : (response.data || []);
        
       
        const validGenres = genresData.filter(genre => 
          genre && genre.name && genre.name.trim() !== ''
        );
        
        console.log('Filtered genres:', validGenres);
        setAvailableGenres(validGenres);
      } catch (error) {
        console.error('Failed to load genres:', error);
        setError('Failed to load genres. Please try again later.');
        setAvailableGenres([]);
      } finally {
        setIsLoadingGenres(false);
      }
    };
    
    loadGenres();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="error">
        <p>Only admin users can add movies</p>
        <button onClick={() => navigate('/')}>Return to Home</button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isLoadingGenres) return;
    
    setError('');
    setIsSubmitting(true);

    try {
      const genreIds = formData.genres
        .map(genreName => {
          const genre = availableGenres.find(g => g.name === genreName);
          return genre?.id;
        })
        .filter(id => id !== undefined);

      if (genreIds.length === 0) {
        throw new Error('Please select at least one genre');
      }

      await createMovie({
        title: formData.title,
        release_date: formData.release_date,
        genres: genreIds
      });

      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Failed to create movie');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenreChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions);
    setFormData({
      ...formData,
      genres: selectedOptions.map(option => option.value)
    });
  };

  if (isLoadingGenres) {
    return <div className="loading">Loading genres...</div>;
  }

  return (
    <div className="form-page">
      <h2>Add New Movie</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Movie created successfully!</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label>Release Date</label>
          <input
            type="date"
            value={formData.release_date}
            onChange={(e) => setFormData({...formData, release_date: e.target.value})}
          />
        </div>
        
        <div className="form-group">
          <label>Genres*</label>
          {availableGenres.length > 0 ? (
            <>
              <select
                multiple
                value={formData.genres}
                onChange={handleGenreChange}
                required
                size={Math.min(availableGenres.length, 5)}
                disabled={isSubmitting}
              >
                {availableGenres.map(genre => (
                  <option key={genre.id} value={genre.name}>
                    {genre.name}
                  </option>
                ))}
              </select>
              <small>Hold CTRL/CMD to select multiple genres</small>
            </>
          ) : (
            <p className="error">No genres available. Please contact administrator.</p>
          )}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting || availableGenres.length === 0}
        >
          {isSubmitting ? 'Creating...' : 'Create Movie'}
        </button>
      </form>

      {user?.data?.is_staff && (
        <div className="admin-section">
          <h3>Admin Tools</h3>
          <GenreManagement />
        </div>
      )}
    </div>
  );
}

export default AddMoviePage;