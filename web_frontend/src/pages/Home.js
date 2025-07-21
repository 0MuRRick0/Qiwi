import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMovies } from '../services/api';
import MovieList from '../components/MovieList';
import { Link } from 'react-router-dom';
import styles from '../index.css';

function Home() {
  const [movies, setMovies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  useEffect(() => {
    const fetchMovies = async () => {
      if (!user) {
        setLoading(false);
        setError('Please login to view movies');
        return;
      }

      try {
        setLoading(true);
        const moviesData = await getMovies();
        setMovies(moviesData);
        setError(null);
      } catch (error) {
        console.error('Failed to fetch movies:', error);
        setError(error.response?.data?.message || 'Failed to load movies');
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [user]);

  if (loading && movies === null) {
    return <div className="loading">Loading movies...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>Popular Movies</h1>
        {user?.data?.is_staff && (
          <Link to="/movies/add" className="add-movie-button">
            Add Movie
          </Link>
        )}
      </div>
      <MovieList movies={movies || []} />
    </div>
  );
}

export default Home;