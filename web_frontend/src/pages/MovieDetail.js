import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMovieById } from '../services/api';
import styles from '../index.css';

function MovieDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [imageError, setImageError] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasTrailer, setHasTrailer] = useState(false);
  
  const fetchMovie = useCallback(async () => {
    try {
      setLoading(true);
      const movieData = await getMovieById(id);
      
      setMovie(movieData.data);

      const [videoExists, trailerExists] = await Promise.all([
        checkFileExists(`/api/getfile/movies/${id}/m.mp4`),
        checkFileExists(`/api/getfile/movies/${id}/t.mp4`)
      ]);
      
      setHasVideo(videoExists);
      setHasTrailer(trailerExists);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching movie:', err);
      setError(err.response?.data?.message || 'Failed to load movie');
      setMovie(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const checkFileExists = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('Error checking file:', url, error);
      return false;
    }
  };

  useEffect(() => {
    fetchMovie();
  }, [fetchMovie]);

  const handleImageError = () => {
    setImageError(true);
  };

  const formatReleaseDate = (dateString) => {
    if (!dateString) return 'Неизвестно';
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatAddedDate = (dateString) => {
    if (!dateString) return 'Неизвестно';
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) return <div className="loading">Загрузка информации о фильме...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!movie) return <div className="empty">Фильм не найден</div>;

  return (
    <div className="movie-detail-container">
      <div className="movie-header">
        <h1>{movie.title}</h1>
        {user?.data?.is_staff && (
          <div className="admin-actions">
            <Link to={`/movies/${id}/upload`} className="admin-button">
              Загрузить файлы
            </Link>
          </div>
        )}
      </div>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Информация
        </button>
        <button
          className={`tab-button ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          Файлы
        </button>
      </div>

      {activeTab === 'details' && (
        <div className="movie-details">
          <div className="movie-poster">
            <img
              src={imageError ? '/placeholder-movie.jpg' : `/api/getfile/movies/${id}/p.jpg`}
              alt={movie.title}
              onError={handleImageError}
              loading="lazy"
              width="300"
              height="450"
            />
          </div>
          <div className="movie-info">
            <p><strong>Дата выхода:</strong> {formatReleaseDate(movie.release_date)}</p>
            <p><strong>Дата добавления:</strong> {formatAddedDate(movie.created_at)}</p>
            <p><strong>Жанры:</strong>
              {movie.genres && movie.genres.length > 0 ? (
                <span> {movie.genres.map(g => g.name).join(', ')}</span>
              ) : (
                <span> Не указаны</span>
              )}
            </p>

            {hasVideo && (
              <div className="watch-button-container">
                <Link to={`/player/${id}`} className="watch-button">
                  Смотреть фильм
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="movie-files">
          <h3>Доступные файлы</h3>
          <div className="file-grid">
            <div className="file-card">
              <h4>Постер</h4>
              {imageError ? (
                <div className="file-placeholder">Постер отсутствует</div>
              ) : (
                <>
                  <img
                    src={`/api/getfile/movies/${id}/p.jpg`}
                    alt={`${movie.title} poster`}
                    className="file-preview"
                    onError={handleImageError}
                  />
                  <a
                    href={`/api/getfile/movies/${id}/p.jpg`}
                    download={`${movie.title}-poster.jpg`}
                    className="download-button"
                  >
                    Скачать
                  </a>
                </>
              )}
            </div>

            {!hasVideo ? (
              <div className="file-placeholder">Видео отсутствует</div>
            ) : (
              <div className="file-card">
                <h4>Основное видео</h4>
                <div className="file-icon">🎬</div>
                <a
                  href={`/api/getfile/movies/${id}/m.mp4`}
                  download={`${movie.title}-video.mp4`}
                  className="download-button"
                >
                  Скачать
                </a>
              </div>
            )}

            {!hasTrailer ? (
              <div className="file-placeholder">Трейлер отсутствует</div>
            ) : (
              <div className="file-card">
                <h4>Трейлер</h4>
                <div className="file-icon">🎥</div>
                <a
                  href={`/api/getfile/movies/${id}/t.mp4`}
                  download={`${movie.title}-trailer.mp4`}
                  className="download-button"
                >
                  Скачать
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="trailer-section">
        <h3>Трейлер</h3>
        {hasTrailer ? (
          <div className="trailer-container">
            <video
              controls
              width="100%"
              poster={imageError ? '/placeholder-movie.jpg' : `/api/getfile/movies/${id}/p.jpg`}
            >
              <source src={`/api/getfile/movies/${id}/t.mp4`} type="video/mp4" />
              Ваш браузер не поддерживает видео.
            </video>
          </div>
        ) : (
          <div className="no-trailer">
            <p>Трейлер отсутствует</p>
            {user?.data?.is_staff && (
              <Link
                to={`/movies/${id}/upload`}
                state={{ fileType: 'trailer' }}
                className="upload-trailer-button"
              >
                Загрузить трейлер
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MovieDetail;