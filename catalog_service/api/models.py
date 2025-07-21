from django.db import models

class Genre(models.Model):
    name = models.CharField("Название жанра", max_length=100, unique=True)

    def __str__(self):
        return self.name

class Movie(models.Model):
    title = models.CharField("Название фильма", max_length=255)
    release_date = models.DateField("Дата выпуска")
    genres = models.ManyToManyField(Genre, related_name='movies', verbose_name='Жанры')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title