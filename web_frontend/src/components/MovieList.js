import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from '../index.css';

const MovieList = ({ movies }) => {
  const [loadedImages, setLoadedImages] = useState({});

  const handleImageError = (movieId) => {
    setLoadedImages(prev => ({ ...prev, [movieId]: false }));
  };

  if (!movies || movies.length === 0) {
    return <div className="empty">No movies found</div>;
  }

  return (
    <div className="movie-grid">
      {movies.map(movie => {
        const movieId = movie.id || movie._id;
        const imageUrl = `/api/getfile/movies/${movieId}/p.jpg`;
        const hasImage = loadedImages[movieId] !== false;

        return (
          <div key={movieId} className="movie-card">
            <Link to={`/movies/${movieId}`}>
              {hasImage ? (
                <img
                  src={imageUrl}
                  alt={movie.title}
                  onError={() => handleImageError(movieId)}
                  onLoad={() => setLoadedImages(prev => ({ ...prev, [movieId]: true }))}
                />
              ) : (
                <div className="movie-poster-placeholder">
                  <span>{movie.title}</span>
                </div>
              )}
              <div className="movie-info">
                <h3>{movie.title}</h3>
                <p>{movie.release_date && new Date(movie.release_date).getFullYear()}</p>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
};

export default MovieList;