from django.urls import path
from . import views

urlpatterns = [
    path("movies/", views.MovieListView.as_view(), name="movie-list"),
    path("movies/create/", views.MovieCreateView.as_view(), name="movie-create"),
    path("movies/<int:id>/", views.MovieDetailViewById.as_view(), name="movie-detail"),
    path("movies/<int:id>/update/", views.MovieUpdateView.as_view(), name="movie-update"),
    path("movies/<int:id>/delete/", views.MovieDeleteView.as_view(), name="movie-delete"),
    path("genres/", views.GenreListView.as_view(), name="genre-list"),
    path("genres/create/", views.GenreCreateView.as_view(), name="genre-create"),
    path("genres/<int:pk>/", views.GenreDetailView.as_view(), name="genre-detail"),
    path("genres/delete/<int:pk>/", views.GenreDeleteView.as_view(), name="genre-delete"),
]
