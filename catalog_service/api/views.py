# api\views.py
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes
from django.utils.timezone import now
from datetime import date
from django.db.models import Q
from rest_framework.pagination import PageNumberPagination

from .models import Movie, Genre
from .serializers import (
    MovieListSerializer,
    MovieDetailSerializer,
    MovieCreateSerializer,
    GenreSerializer,
)
from catalog_service.auth_backends import ExternalJWTAuthentication
from catalog_service.permissions import IsAdminOrSuperUser


class MoviePagination(PageNumberPagination):
    page_size_query_param = 'limit'
    max_page_size = 100
    page_size = 20

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data
        })

class MovieListView(generics.ListAPIView):
    serializer_class = MovieListSerializer
    pagination_class = MoviePagination
    queryset = Movie.objects.all()
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by("-created_at")
        
        search_query = self.request.query_params.get("search", None)
        genre_names = self.request.query_params.getlist("genres", [])
        year = self.request.query_params.get("year", None)
        sort_by = self.request.query_params.get("sort", None)

        if search_query:
            queryset = queryset.filter(title__icontains=search_query)

        if genre_names:
            genre_filter = Q()
            for genre_name in genre_names:
                genre_filter |= Q(genres__name__iexact=genre_name)
            queryset = queryset.filter(genre_filter).distinct()

        if year and year.isdigit():
             queryset = queryset.filter(release_date__year=int(year))

        if sort_by == 'latest':
            queryset = queryset.order_by('-created_at')
        elif sort_by == 'upcoming':
            queryset = queryset.filter(release_date__gt=date.today()).order_by('release_date')
        elif sort_by == 'title':
            queryset = queryset.order_by('title')
        elif sort_by == 'release_date':
             queryset = queryset.order_by('-release_date')
        
        return queryset

class MovieDetailViewById(generics.RetrieveAPIView):
    serializer_class = MovieDetailSerializer
    lookup_field = "id"

    def get_queryset(self):
        return Movie.objects.all()


@permission_classes([IsAdminOrSuperUser])
class MovieCreateView(generics.CreateAPIView):
    serializer_class = MovieCreateSerializer
    queryset = Movie.objects.all()


@permission_classes([IsAdminOrSuperUser])
class GenreCreateView(generics.CreateAPIView):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer

@permission_classes([IsAdminOrSuperUser])
class GenreDeleteView(generics.DestroyAPIView):
    queryset = Genre.objects.all()
    lookup_field = "pk"

class GenreListView(generics.ListAPIView):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer


class GenreDetailView(generics.RetrieveAPIView):
    serializer_class = GenreSerializer
    lookup_field = "name"

    def get_queryset(self):
        name = self.kwargs.get("name")
        return Genre.objects.filter(name__iexact=name)


@permission_classes([IsAdminOrSuperUser])
class MovieDeleteView(generics.DestroyAPIView):
    queryset = Movie.objects.all()
    lookup_field = "id"


@permission_classes([IsAdminOrSuperUser])
class MovieUpdateView(generics.UpdateAPIView):
    queryset = Movie.objects.all()
    serializer_class = MovieCreateSerializer
    lookup_field = "id"

