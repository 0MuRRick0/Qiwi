// src\pages\Home.js
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMovies, getAllGenres } from '../services/api';
import MovieList from '../components/MovieList';
import { Link, useSearchParams } from 'react-router-dom';
import './Home.css'; // Убедитесь, что стили подключены
// Константы
const SEARCH_DEBOUNCE_TIME = 500; // ms
const MAX_SEARCH_LENGTH = 100;
const DEFAULT_PAGE_SIZE = 20;
// --- Опции сортировки как константы ---
const SORT_OPTIONS = {
  RECOMMENDED: '', // По умолчанию
  LATEST: 'latest',
  UPCOMING: 'upcoming'
};

function Home() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const [checkingPrivileges, setCheckingPrivileges] = useState(true);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [totalMovies, setTotalMovies] = useState(0);
  const { user, fetchUserPrivileges } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // --- Состояние видимости фильтров ---
  const [areFiltersVisible, setAreFiltersVisible] = useState(true); // По умолчанию развернут
  // --- Ref для отслеживания, был ли первый рендер ---
  const isFirstRender = useRef(true);
  // --- Получаем параметры из URL ---
  const filtersFromUrl = useMemo(() => {
    return {
      search: searchParams.get('search') || '',
      genres: searchParams.getAll('genres'),
      year: searchParams.get('year') || '',
      sort: searchParams.get('sort') || SORT_OPTIONS.RECOMMENDED, // Используем константу
      page: parseInt(searchParams.get('page'), 10) || 1,
    };
  }, [searchParams]);
  // --- Состояние для локального ввода поиска ---
  const [localSearchQuery, setLocalSearchQuery] = useState(filtersFromUrl.search);
  // --- Загрузка списка жанров ---
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await getAllGenres();
        setAvailableGenres(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Failed to fetch genres for filter:', err);
        setAvailableGenres([]);
      }
    };
    fetchGenres();
  }, []);
  // --- Проверка прав пользователя ---
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
  // --- Функция для обновления URL с новыми параметрами ---
  const updateUrl = (newParams) => {
    const params = new URLSearchParams();
    if (newParams.search) params.set('search', newParams.search);
    newParams.genres?.forEach(genre => {
      if (genre) params.append('genres', genre);
    });
    if (newParams.year) params.set('year', newParams.year);
    if (newParams.sort && newParams.sort !== SORT_OPTIONS.RECOMMENDED) params.set('sort', newParams.sort); // Не добавляем 'sort' если он пустой (рекомендуемое)
    if (newParams.page && newParams.page > 1) params.set('page', newParams.page);
    setSearchParams(params);
  };
  // --- ОСНОВНОЙ useEffect: Загрузка фильмов ---
  useEffect(() => {
    setLocalSearchQuery(filtersFromUrl.search); // Синхронизация поиска
    const loadMovies = async () => {
      if (!user) {
        setLoading(false);
        setError('Please login to view movies');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await getMovies(
          filtersFromUrl.page,
          DEFAULT_PAGE_SIZE,
          filtersFromUrl.search,
          filtersFromUrl.genres,
          filtersFromUrl.year,
          filtersFromUrl.sort
        );
        if (response.data && Array.isArray(response.data.results)) {
          setMovies(response.data.results);
          setTotalMovies(response.data.count || 0);
        } else {
          const data = response.data || [];
          setMovies(Array.isArray(data) ? data : []);
          setTotalMovies(Array.isArray(data) ? data.length : 0);
        }
      } catch (err) {
        console.error('Failed to fetch movies:', err);
        const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to load movies';
        setError(errorMessage);
        setMovies([]);
        setTotalMovies(0);
      } finally {
        setLoading(false);
      }
    };
    loadMovies();
  }, [filtersFromUrl, user]);
  // --- Дебаунс для поиска ---
  useEffect(() => {
    // Пропускаем дебаунс при первом рендере
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (localSearchQuery === filtersFromUrl.search) {
      return;
    }
    const handler = setTimeout(() => {
      updateUrl({
        ...filtersFromUrl,
        search: localSearchQuery,
        page: 1
      });
    }, SEARCH_DEBOUNCE_TIME);
    return () => {
      clearTimeout(handler);
    };
  }, [localSearchQuery, filtersFromUrl]);
  // --- Обработчики изменений фильтров ---
  const handleGenreChange = (selectedGenres) => {
    updateUrl({ ...filtersFromUrl, genres: selectedGenres, page: 1 });
  };
  const handleYearChange = (e) => {
    const value = e.target.value;
    // Упрощаем валидацию года
    if (value === '' || (value >= 1888 && value <= new Date().getFullYear() + 10)) {
      updateUrl({ ...filtersFromUrl, year: value, page: 1 });
    }
  };
  // --- НОВЫЕ обработчики для кнопок сортировки ---
  const handleSortChange = (newSortOption) => {
    updateUrl({ ...filtersFromUrl, sort: newSortOption, page: 1 });
  };
  const handleResetFilters = () => {
    setSearchParams({});
    setLocalSearchQuery('');
  };
  const handlePageChange = (newPage) => {
    updateUrl({ ...filtersFromUrl, page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleSearchChange = (e) => {
    const value = e.target.value.slice(0, MAX_SEARCH_LENGTH);
    setLocalSearchQuery(value);
  };
  // --- Компонент для выбора жанров ---
  const GenreSelect = ({ genres, selectedGenres, onChange }) => {
    const handleChange = (genreName) => {
      const newSelectedGenres = selectedGenres.includes(genreName)
        ? selectedGenres.filter(g => g !== genreName)
        : [...selectedGenres, genreName];
      onChange(newSelectedGenres);
    };
    return (
      <div className="genre-select-container">
        {genres.map((genre) => (
          <button
            key={genre.id}
            type="button"
            className={`genre-tag ${selectedGenres.includes(genre.name) ? 'selected' : ''}`}
            onClick={() => handleChange(genre.name)}
            aria-pressed={selectedGenres.includes(genre.name)}
          >
            {genre.name}
          </button>
        ))}
      </div>
    );
  };
  // --- Компонент для выбора года из выпадающего списка ---
  const YearSelect = ({ value, onChange, availableYears }) => {
    return (
      <select
        id="year-select"
        value={value}
        onChange={onChange}
        className="year-select"
      >
        <option value="">Любой год</option>
        {availableYears.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    );
  };
  // --- Генерируем список доступных лет ---
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear + 10; i >= 1888; i--) {
      years.push(i);
    }
    return years;
  }, []);
  // --- Вычисляем общее количество страниц ---
  const totalPages = Math.ceil(totalMovies / DEFAULT_PAGE_SIZE);
  // --- Рендер ---
  if (checkingPrivileges) {
    return <div className="loading">Checking permissions...</div>;
  }
  if (error && !loading) {
    return <div className="error">{error}</div>;
  }
  return (
    <div className="home-page">
      {/* Заголовок страницы */}
      <div className="home-header">
        <h1 className="page-title">Фильмы</h1>
        {isStaff && (
          <Link to="/movies/add" className="add-movie-button">
            Добавить фильм
          </Link>
        )}
      </div>

      {/* --- УЛУЧШЕННЫЙ ПОИСК СВЕРХУ --- */}
      <div className="enhanced-search-container">
        <span className="enhanced-search-icon">🔍</span>
        <input
          type="text"
          id="enhanced-search-input"
          value={localSearchQuery}
          onChange={handleSearchChange}
          placeholder="Поиск фильмов..."
          maxLength={MAX_SEARCH_LENGTH}
          className="enhanced-search-input"
        />
        <span className="char-count-enhanced">{localSearchQuery.length}/{MAX_SEARCH_LENGTH}</span>
      </div>

      {/* --- КНОПКИ СОРТИРОВКИ --- */}
      <div className="sort-buttons-container">
        <button
          className={`sort-button ${filtersFromUrl.sort === SORT_OPTIONS.RECOMMENDED ? 'active' : ''}`}
          onClick={() => handleSortChange(SORT_OPTIONS.RECOMMENDED)}
        >
          Рекомендуемое
        </button>
        <button
          className={`sort-button ${filtersFromUrl.sort === SORT_OPTIONS.LATEST ? 'active' : ''}`}
          onClick={() => handleSortChange(SORT_OPTIONS.LATEST)}
        >
          Новинки
        </button>
        <button
          className={`sort-button ${filtersFromUrl.sort === SORT_OPTIONS.UPCOMING ? 'active' : ''}`}
          onClick={() => handleSortChange(SORT_OPTIONS.UPCOMING)}
        >
          Будущие премьеры
        </button>
      </div>

      {/* Секция фильтров с возможностью сворачивания */}
      <div className="filters-section">
        <div className="filters-header">
          <h2>Фильтры</h2>
          <button
            onClick={() => setAreFiltersVisible(!areFiltersVisible)}
            className="toggle-filters-button-header"
            aria-expanded={areFiltersVisible}
            aria-label={areFiltersVisible ? "Скрыть фильтры" : "Показать фильтры"}
          >
            {areFiltersVisible ? 'Скрыть ▲' : 'Показать ▼'}
          </button>
        </div>
        {areFiltersVisible && (
          <div className="filters">
            <div className="filter-group">
              <label>Жанры:</label>
              <GenreSelect
                genres={availableGenres}
                selectedGenres={filtersFromUrl.genres}
                onChange={handleGenreChange}
              />
              <small>Нажмите на жанр, чтобы выбрать или отменить выбор.</small>
            </div>
            <div className="filter-group">
              <label htmlFor="year-select">Год выпуска:</label>
              {/* Используем новый компонент выбора года */}
              <YearSelect
                value={filtersFromUrl.year}
                onChange={handleYearChange}
                availableYears={availableYears}
              />
            </div>
            <div className="filter-group filter-group-reset">
              <button
                onClick={handleResetFilters}
                className="reset-filters-button"
                aria-label="Сбросить все фильтры"
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Основной контент */}
      <div className="main-content">
        {/* Заголовок результатов */}
        <div className="results-header">
          <h2 className="results-title">
            {filtersFromUrl.search && `Результаты поиска для "${filtersFromUrl.search}"`}
            {filtersFromUrl.genres.length > 0 && `Жанры: ${filtersFromUrl.genres.join(', ')}`}
            {filtersFromUrl.year && `Год: ${filtersFromUrl.year}`}
            {filtersFromUrl.sort === SORT_OPTIONS.LATEST && 'Новинки'}
            {filtersFromUrl.sort === SORT_OPTIONS.UPCOMING && 'Будущие премьеры'}
            {
              !filtersFromUrl.search &&
              filtersFromUrl.genres.length === 0 &&
              !filtersFromUrl.year &&
              filtersFromUrl.sort === SORT_OPTIONS.RECOMMENDED &&
              'Рекомендуемые фильмы'
            }
          </h2>
        </div>

        {loading && <div className="loading">Загрузка фильмов...</div>}
        {!loading && <MovieList movies={movies} />}
        {!loading && totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => handlePageChange(filtersFromUrl.page - 1)}
              disabled={filtersFromUrl.page <= 1}
              aria-label="Предыдущая страница"
            >
              Назад
            </button>
            <span className="pagination-info">
              Страница {filtersFromUrl.page} из {totalPages} (Всего: {totalMovies})
            </span>
            <button
              onClick={() => handlePageChange(filtersFromUrl.page + 1)}
              disabled={filtersFromUrl.page >= totalPages}
              aria-label="Следующая страница"
            >
              Вперёд
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export default Home;