
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMovieById } from '../services/api';


function MovieDetail() {
  const { id } = useParams();
  const { user, fetchUserPrivileges } = useAuth();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [imageError, setImageError] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasTrailer, setHasTrailer] = useState(false);

  
  const [isStaff, setIsStaff] = useState(false);
  const [checkingPrivileges, setCheckingPrivileges] = useState(true);

  
  useEffect(() => {
    const checkPrivileges = async () => {
      setCheckingPrivileges(true);
      if (user) {
        try {
          const privileges = await fetchUserPrivileges();
          setIsStaff(!!privileges.is_staff);
        } catch (err) {
          console.error("MovieDetail: Failed to fetch privileges:", err);
          setIsStaff(false);
        }
      } else {
        setIsStaff(false);
      }
      setCheckingPrivileges(false);
    };

    checkPrivileges();
  }, [user, fetchUserPrivileges]); 

  const fetchMovie = useCallback(async () => {
    try {
      setLoading(true);
      const movieData = await getMovieById(id);
      setMovie(movieData.data);

      
      
      const [posterExists, videoExists, trailerExists] = await Promise.all([
        fetch(`/api/getfile/movies/${id}/p.jpg`, { method: 'HEAD' })
          .then(res => res.ok)
          .catch(() => false),
        fetch(`/api/getfile/movies/${id}/transcoded/m_master.m3u8`, { method: 'HEAD' }) 
          .then(res => res.ok)
          .catch(() => false),
        fetch(`/api/getfile/movies/${id}/t.mp4`, { method: 'HEAD' }) 
          .then(res => res.ok)
          .catch(() => false)
      ]);

      setHasVideo(videoExists);
      setHasTrailer(trailerExists);
      
      setError(null);
    } catch (err) {
      console.error("Ошибка загрузки фильма:", err);
      setError('Не удалось загрузить информацию о фильме. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMovie();
  }, [fetchMovie]);

  const handleImageError = () => {
    setImageError(true);
  };

  const formatReleaseDate = (dateString) => {
    if (!dateString) return 'Не указана';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      return new Date(dateString).toLocaleDateString('ru-RU', options);
    } catch {
      return dateString;
    }
  };

  
  if (loading || checkingPrivileges) return <div className="loading">Загрузка информации о фильме...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!movie) return <div className="empty">Фильм не найден</div>;

  return (
    <div className="movie-detail-container">
      <div className="movie-header">
        <h1>{movie.title}</h1>
        
        {isStaff && (
          <div className="admin-actions">
            <Link to={`/movies/${id}/upload`} className="admin-button">
              Загрузить файлы
            </Link>
            <Link to={`/movies/${id}/edit`} className="admin-button">
              Редактировать фильм
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
            <p><strong>Жанры:</strong> {movie.genres && movie.genres.length > 0 ? movie.genres.map(g => g.name).join(', ') : 'Не указаны'}</p>
            <p>{movie.description}</p>
            {hasVideo && (
              <div className="watch-button-container">
                <Link to={`/player/${id}`} className="watch-button">
                  Смотреть фильм
                </Link>
              </div>
            )}
            {hasTrailer && (
              <div className="trailer-section-in-details">
                <h3>Трейлер</h3>
                <div className="trailer-container">
                  <video controls width="100%">
                    <source src={`/api/getfile/movies/${id}/transcoded/t.m3u8`} type="application/x-mpegURL" />
                    <source src={`/api/getfile/movies/${id}/t.mp4`} type="video/mp4" />
                    Ваш браузер не поддерживает видео.
                  </video>
                  {isStaff && (
                    <Link
                      to={`/movies/${id}/upload`}
                      state={{ fileType: 'trailer' }}
                      className="upload-trailer-button"
                    >
                      Загрузить другой трейлер
                    </Link>
                  )}
                </div>
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
                  <div className="file-icon">🖼️</div>
                  
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

            
            <div className="file-card">
              <h4>Трейлер</h4>
              {hasTrailer ? (
                <>
                  <div className="file-icon">🎥</div>
                  <a
                    href={`/api/getfile/movies/${id}/t.mp4`}
                    download={`${movie.title}-trailer.mp4`}
                    className="download-button"
                  >
                    Скачать
                  </a>
                </>
              ) : (
                <div className="file-placeholder">Трейлер отсутствует</div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default MovieDetail;