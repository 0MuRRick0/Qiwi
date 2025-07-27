from django.urls import path
from . import views

urlpatterns = [
    path('movies/', views.MovieListView.as_view(), name='movie-list'),

    path('movies/create/', views.MovieCreateView.as_view(), name='movie-create'),
    path('genres/create/', views.GenreCreateView.as_view(), name='genre-create'),

    path('genres/<int:pk>/', views.GenreDetailView.as_view(), name='genre-detail'),
    path('genres/', views.GenreListView.as_view(), name='genre-list'),

    path('movies/<int:id>/', views.MovieDetailViewById.as_view(), name='movie-detail'),
    
    path('movies/search/', views.MovieSearchView.as_view(), name='movie-search'),
    path('movies/by-genre/', views.MovieByGenreView.as_view(), name='movie-by-genre'),
    path('movies/by-year/', views.MovieByYearView.as_view(), name='movie-by-year'),
    path('movies/upcoming/', views.UpcomingMoviesView.as_view(), name='upcoming-movies'),
    path('movies/latest/', views.LatestMoviesView.as_view(), name='latest-movies'),
]