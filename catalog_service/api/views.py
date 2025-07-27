from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes
from django.utils.timezone import now
from datetime import date
from .models import Movie, Genre
from .serializers import MovieListSerializer, MovieDetailSerializer, MovieCreateSerializer, GenreSerializer
from catalog_service.auth_backends import ExternalJWTAuthentication
from catalog_service.permissions import IsAdminOrSuperUser

# GET /api/movies
class MovieListView(generics.ListAPIView):
    serializer_class = MovieListSerializer

    def get_queryset(self):
        queryset = Movie.objects.all().order_by('-created_at')

        # Пагинация
        page = self.request.query_params.get('page', 1)
        limit = self.request.query_params.get('limit', 20)

        start = (int(page) - 1) * int(limit)
        end = start + int(limit)

        return queryset[start:end]

# GET /api/movies/:id
class MovieDetailViewById(generics.RetrieveAPIView):
    serializer_class = MovieDetailSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return Movie.objects.all()

# GET /api/movies/search
class MovieSearchView(generics.ListAPIView):
    serializer_class = MovieListSerializer

    def get_queryset(self):
        query = self.request.query_params.get('query', '')
        return Movie.objects.filter(title__icontains=query)

# GET /api/movies/by-genre
class MovieByGenreView(generics.ListAPIView):
    serializer_class = MovieListSerializer

    def get_queryset(self):
        genre_name = self.request.query_params.get('genre')
        if not genre_name:
            return Movie.objects.none()

        try:
            genre = Genre.objects.get(name__iexact=genre_name)
            return Movie.objects.filter(genres=genre)
        except Genre.DoesNotExist:
            return Movie.objects.none()

# GET /api/movies/by-year
class MovieByYearView(generics.ListAPIView):
    serializer_class = MovieListSerializer

    def get_queryset(self):
        year = self.request.query_params.get('year')
        if not year or not year.isdigit():
            raise NotFound("Укажите корректный год.")
        return Movie.objects.filter(release_date__year=int(year))

# GET /api/movies/upcoming
class UpcomingMoviesView(generics.ListAPIView):
    serializer_class = MovieListSerializer

    def get_queryset(self):
        return Movie.objects.filter(release_date__gt=date.today())

# GET /api/movies/latest
class LatestMoviesView(generics.ListAPIView):
    serializer_class = MovieListSerializer

    def get_queryset(self):
        return Movie.objects.order_by('-created_at')[:10]

@permission_classes([IsAdminOrSuperUser])
class MovieCreateView(generics.CreateAPIView):
    serializer_class = MovieCreateSerializer
    queryset = Movie.objects.all()

@permission_classes([IsAdminOrSuperUser])
class GenreCreateView(generics.CreateAPIView):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer

# Получение списка жанров
class GenreListView(generics.ListAPIView):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer

# Получение внутреннего состояния па жанра
class GenreDetailView(generics.RetrieveAPIView):
    serializer_class = GenreSerializer
    lookup_field = 'name'

    def get_queryset(self):
        name = self.kwargs.get('name')
        return Genre.objects.filter(name__iexact=name)