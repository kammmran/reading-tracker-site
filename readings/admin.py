from django.contrib import admin
from .models import Author, Work, ReadingNote, ReadingProgress

# Register your models here.
@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ('name', 'period', 'genre', 'birth_year', 'death_year')
    list_filter = ('period', 'genre')
    search_fields = ('name',)

@admin.register(Work)
class WorkAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'year', 'genre')
    list_filter = ('genre', 'author__period')
    search_fields = ('title', 'author__name')

@admin.register(ReadingNote)
class ReadingNoteAdmin(admin.ModelAdmin):
    list_display = ('work', 'user', 'created_at', 'updated_at')
    list_filter = ('user', 'work__author')
    search_fields = ('work__title', 'user__username', 'notes')

@admin.register(ReadingProgress)
class ReadingProgressAdmin(admin.ModelAdmin):
    list_display = ('work', 'user', 'status', 'progress_percentage', 'start_date', 'completion_date')
    list_filter = ('status', 'user')
    search_fields = ('work__title', 'user__username')
