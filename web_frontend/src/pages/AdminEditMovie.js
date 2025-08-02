import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMovieById, updateMovie, getAllGenres, deleteFile, deleteMovie, deleteAllFiles } from '../services/api'; import GenreManagement from '../components/GenreManagement';
function AdminEditMovie() {
  const { movieId: id } = useParams(); const navigate = useNavigate();
  const { user, fetchUserPrivileges } = useAuth();

  const [movie, setMovie] = useState(null);
  const [loadingMovie, setLoadingMovie] = useState(false);
  const [movieError, setMovieError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    release_date: '',
    genres: []
  });

  const [availableGenres, setAvailableGenres] = useState([]);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [errorGenres, setErrorGenres] = useState('');

  const [error, setError] = useState(''); const [success, setSuccess] = useState('');

  const [deletingFiles, setDeletingFiles] = useState({
    poster: false,
    trailer: false,
    video: false,
  });

  const [updating, setUpdating] = useState(false);

  const [deletingMovie, setDeletingMovie] = useState(false);

  const [isStaff, setIsStaff] = useState(false);
  const [checkingPrivileges, setCheckingPrivileges] = useState(true);
  const [privilegesError, setPrivilegesError] = useState('');
  useEffect(() => {
    const checkPrivileges = async () => {
      setCheckingPrivileges(true);
      setMovieError(''); setError(''); setPrivilegesError('');
      if (user) {
        try {
          const privileges = await fetchUserPrivileges();
          const staffStatus = !!(privileges?.is_staff || privileges?.is_superuser);
          setIsStaff(staffStatus);

          if (!staffStatus) {
            setPrivilegesError('Доступ запрещен. Недостаточно прав.');
          }
        } catch (err) {
          console.error("AdminEditMovie: Failed to fetch privileges:", err);
          setIsStaff(false);
          setPrivilegesError('Ошибка проверки прав доступа.');
        }
      } else {
        setIsStaff(false);
      }

      setCheckingPrivileges(false);
    };

    checkPrivileges();
  }, [user, fetchUserPrivileges]);
  useEffect(() => {
    const fetchMovieData = async () => {
      setMovie(null);
      setLoadingMovie(true);
      setMovieError('');
      setError('');
      setSuccess('');

      try {
        if (!id) {
          setMovieError('ID фильма не указан.');
          return;
        }

        if (!isStaff) {
          return;
        }

        console.log(`Fetching movie data for ID: ${id}`);
        const movieResponse = await getMovieById(id);

        if (movieResponse.data) {
          const movieData = movieResponse.data;
          setMovie(movieData);

          setFormData({
            title: movieData.title || '',
            release_date: movieData.release_date ? movieData.release_date.split('T')[0] : '',
            genres: movieData.genres ? movieData.genres.map(g => g.id) : []
          });

          if (availableGenres.length === 0) {
            setLoadingGenres(true);
            setErrorGenres('');
            try {
              const genresResponse = await getAllGenres();
              setAvailableGenres(genresResponse.data || []);
            } catch (err) {
              console.error("Error fetching genres:", err);
              setErrorGenres('Не удалось загрузить список жанров.');
              setAvailableGenres([]);
            } finally {
              setLoadingGenres(false);
            }
          }

        } else {
          console.warn("Movie data not found in response or is invalid:", movieResponse);
          setMovieError('Фильм не найден или данные повреждены.');
        }
      } catch (err) {
        console.error("AdminEditMovie: Failed to fetch movie:", err);
        if (err.response) {
          if (err.response.status === 404) {
            setMovieError('Фильм с таким ID не найден.');
          } else if (err.response.status === 403 || err.response.status === 401) {
            setMovieError('Доступ к фильму запрещен.');
          } else {
            setMovieError(`Ошибка загрузки фильма: ${err.response.status} ${err.response.statusText || ''}`);
          }
        } else if (err.request) {
          setMovieError('Ошибка сети. Не удалось получить данные фильма.');
        } else {
          setMovieError('Неизвестная ошибка при загрузке фильма.');
        }
      } finally {
        setLoadingMovie(false);
      }
    };

    if (!checkingPrivileges && isStaff && id) {
      fetchMovieData();
    } else if (!checkingPrivileges && !isStaff && id) {
      setLoadingMovie(false);
    } else if (!id) {
      setMovieError('ID фильма не указан.');
      setLoadingMovie(false);
    }

  }, [id, isStaff, checkingPrivileges, availableGenres.length]);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenreChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value, 10));
    setFormData(prev => ({ ...prev, genres: selectedOptions }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isStaff || !movie) {
      setError('Недостаточно прав или фильм не загружен.');
      return;
    }

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      let formattedDate = formData.release_date;
      if (formattedDate && formattedDate.includes('T')) {
        formattedDate = formData.release_date.split('T')[0];
      }

      const movieDataToSend = {
        title: formData.title,
        release_date: formattedDate,
        genres: formData.genres
      };

      const updatedMovieResponse = await updateMovie(movie.id, movieDataToSend);
      const updatedMovieData = updatedMovieResponse.data || updatedMovieResponse;

      setSuccess('Фильм успешно обновлен!');

      setMovie(updatedMovieData);
      setFormData({
        title: updatedMovieData.title || '',
        release_date: updatedMovieData.release_date ? updatedMovieData.release_date.split('T')[0] : '',
        genres: updatedMovieData.genres ? updatedMovieData.genres.map(g => g.id) : []
      });
    } catch (err) {
      console.error("Ошибка обновления фильма:", err);
      if (err.response) {
        if (err.response.data) {
          const fieldErrors = [];
          for (const [field, messages] of Object.entries(err.response.data)) {
            if (Array.isArray(messages)) {
              fieldErrors.push(`${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'string') {
              fieldErrors.push(`${field}: ${messages}`);
            }
          }
          if (fieldErrors.length > 0) {
            setError(`Ошибка обновления: ${fieldErrors.join('; ')}`);
          } else {
            setError(`Ошибка сервера: ${JSON.stringify(err.response.data)}`);
          }
        } else {
          setError(`Ошибка сервера: ${err.response.status} ${err.response.statusText}`);
        }
      } else if (err.request) {
        setError('Ошибка сети при обновлении фильма.');
      } else {
        setError(`Неизвестная ошибка: ${err.message}`);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteFile = async (fileType) => {
    if (!movie || !isStaff) return;

    const fileTypeNames = { 'p': 'постер', 't': 'трейлер', 'm': 'видео' };
    const fileTypeName = fileTypeNames[fileType] || fileType;

    const confirmed = window.confirm(`Вы уверены, что хотите удалить ${fileTypeName} фильма "${movie.title}"? Это действие нельзя отменить.`);
    if (confirmed) {
      setDeletingFiles(prev => ({ ...prev, [fileType === 'p' ? 'poster' : fileType === 't' ? 'trailer' : 'video']: true }));
      setError('');
      setSuccess('');

      try {
        await deleteFile(movie.id, fileType);
        setSuccess(`Файл ${fileTypeName} успешно удален.`);
      } catch (err) {
        console.error(`Ошибка удаления файла ${fileType}:`, err);
        if (err.message && err.message.includes('No access token found')) {
          setError('Ошибка авторизации. Пожалуйста, войдите снова.');
        } else if (err.response) {
          setError(`Ошибка удаления файла: ${err.response.status} ${err.response.statusText || ''}`);
        } else if (err.request) {
          setError('Ошибка сети при удалении файла.');
        } else {
          setError(`Неизвестная ошибка при удалении файла: ${err.message}`);
        }
      } finally {
        setDeletingFiles(prev => ({ ...prev, [fileType === 'p' ? 'poster' : fileType === 't' ? 'trailer' : 'video']: false }));
      }
    }
  };

  const handleDeleteMovie = async () => {
    if (!movie || !isStaff) return;

    const confirmed = window.confirm(`Вы уверены, что хотите УДАЛИТЬ фильм "${movie.title}"? Это действие нельзя отменить. Все данные и файлы будут потеряны.`);
    if (confirmed) {
      setDeletingMovie(true);
      setError('');
      setSuccess('');

      try {
        await deleteAllFiles(movie.id);
        await deleteMovie(movie.id);
        setSuccess('Фильм успешно удален.');
        setTimeout(() => navigate('/'), 1500);
      } catch (err) {
        console.error("Ошибка удаления фильма:", err);
        if (err.message && err.message.includes('No access token found')) {
          setError('Ошибка авторизации. Пожалуйста, войдите снова.');
        } else if (err.response) {
          setError(`Ошибка удаления фильма: ${err.response.status} ${err.response.statusText || ''}`);
        } else if (err.request) {
          setError('Ошибка сети при удалении фильма.');
        } else {
          setError(`Неизвестная ошибка при удалении фильма: ${err.message}`);
        }
      } finally {
        setDeletingMovie(false);
      }
    }
  };

  const handleGenreAdded = (newGenre) => {
    setAvailableGenres(prevGenres => {
      if (!prevGenres.some(g => g.id === newGenre.id)) {
        return [...prevGenres, newGenre];
      }
      return prevGenres;
    });
  };

  if (checkingPrivileges) {
    return <div className="loading">Проверка прав доступа...</div>;
  }

  if (privilegesError) {
    return (
      <div className="admin-error">
        <h2>Ошибка прав доступа</h2>
        <p>{privilegesError}</p>
        <Link to="/">← Вернуться на главную</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-error">
        <h2>Требуется авторизация</h2>
        <p>Пожалуйста, войдите в систему как администратор.</p>
        <Link to="/login">Перейти к странице входа</Link>
      </div>
    );
  }

  if (loadingMovie) {
    return <div className="loading">Загрузка данных фильма...</div>;
  }

  if (movieError) {
    return (
      <div className="error">
        <h2>Ошибка</h2>
        <p>{movieError}</p>
        <Link to="/">← Вернуться на главную</Link>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="empty">
        <h2>Фильм не найден</h2>
        <p>Запрашиваемый фильм не существует.</p>
        <Link to="/">← Вернуться на главную</Link>
      </div>
    );
  }

  return (
    <div className="admin-edit-movie-page">
      <div className="admin-edit-header">
        <h1>Редактировать фильм: {movie.title}</h1>
        <Link to={`/movies/${id}`} className="back-button">← Назад к фильму</Link>
      </div>

      {/* Сообщения об ошибках и успехе */}
      {privilegesError && <div className="error-message">{privilegesError}</div>}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      {errorGenres && <div className="error-message">{errorGenres}</div>} {/* Сообщение об ошибке загрузки жанров */}

      <div className="admin-edit-content">
        {/* Форма редактирования данных */}
        <div className="edit-section">
          <h2>Данные фильма</h2>
          <form onSubmit={handleSubmit} className="edit-form">
            <div className="form-group">
              <label htmlFor="title">Название:</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="release_date">Дата выхода:</label>
              <input
                type="date"
                id="release_date"
                name="release_date"
                value={formData.release_date}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="genres">Жанры:</label>
              {loadingGenres ? (
                <p>Загрузка жанров...</p>
              ) : errorGenres ? (
                <p className="error-message">{errorGenres}</p>
              ) : (
                <>
                  <select
                    id="genres"
                    name="genres"
                    multiple
                    value={formData.genres.map(String)} onChange={handleGenreChange}
                    className="genre-select"
                  >
                    {availableGenres.map(genre => (
                      <option key={genre.id} value={genre.id}>
                        {genre.name}
                      </option>
                    ))}
                  </select>
                  <small>Удерживайте Ctrl (Cmd на Mac) для выбора нескольких жанров.</small>
                </>
              )}
            </div>

            <button type="submit" disabled={updating}>
              {updating ? 'Обновление...' : 'Сохранить изменения'}
            </button>
          </form>
        </div>

        {/* Управление файлами */}
        <div className="files-section">
          <h2>Управление файлами</h2>
          <div className="file-management-grid">
            <div className="file-card">
              <div className="file-icon">🖼️</div>
              <p>Постер (p.jpg)</p>
              <div className="file-actions">
                <Link to={`/movies/${id}/upload`} className="button" state={{ fileType: 'p' }}>
                  Загрузить
                </Link>
                <button
                  onClick={() => handleDeleteFile('p')}
                  disabled={deletingFiles.poster}
                  className="delete-button"
                >
                  {deletingFiles.poster ? 'Удаление...' : 'Удалить'}
                </button>
              </div>
            </div>

            <div className="file-card">
              <div className="file-icon">🎬</div>
              <p>Трейлер (t.mp4)</p>
              <div className="file-actions">
                <Link to={`/movies/${id}/upload`} className="button" state={{ fileType: 't' }}>
                  Загрузить
                </Link>
                <button
                  onClick={() => handleDeleteFile('t')}
                  disabled={deletingFiles.trailer}
                  className="delete-button"
                >
                  {deletingFiles.trailer ? 'Удаление...' : 'Удалить'}
                </button>
              </div>
            </div>

            <div className="file-card">
              <div className="file-icon">🎥</div>
              <p>Видео (m.mp4, m_master.m3u8)</p>
              <div className="file-actions">
                <Link to={`/movies/${id}/upload`} className="button" state={{ fileType: 'm' }}>
                  Загрузить
                </Link>
                <button
                  onClick={() => handleDeleteFile('m')}
                  disabled={deletingFiles.video}
                  className="delete-button"
                >
                  {deletingFiles.video ? 'Удаление...' : 'Удалить'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Управление жанрами (новый блок) */}
        {isStaff && (
          <div className="genre-management-section">
            <h2>Управление жанрами</h2>
            <GenreManagement onGenreAdded={handleGenreAdded} />
          </div>
        )}

        {/* Опасная зона */}
        <div className="danger-zone">
          <h2>Опасная зона</h2>
          <p>Удаление фильма приведет к безвозвратной потере всех данных и файлов.</p>
          <button
            onClick={handleDeleteMovie}
            disabled={deletingMovie}
            className="delete-movie-button"
          >
            {deletingMovie ? 'Удаление фильма...' : 'Удалить фильм'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminEditMovie;