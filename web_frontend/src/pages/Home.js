import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMovies } from '../services/api';
import MovieList from '../components/MovieList';
import { Link } from 'react-router-dom';

function Home() {
  const [movies, setMovies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const [checkingPrivileges, setCheckingPrivileges] = useState(true);
  const { user, fetchUserPrivileges } = useAuth();
  
  
  useEffect(() => {
    const checkPrivileges = async () => {
      setCheckingPrivileges(true);
      if (user) {
        try {
          const privileges = await fetchUserPrivileges();
          setIsStaff(!!privileges?.is_staff);
        } catch (err) {
          console.error("Home: Failed to fetch privileges:", err);
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

    
    if (!checkingPrivileges) {
      fetchMovies();
    }
  }, [user, checkingPrivileges]); 

  
  if (checkingPrivileges || (loading && movies === null)) {
    return <div className="loading">Loading movies...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>Popular Movies</h1>
        {isStaff && ( 
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