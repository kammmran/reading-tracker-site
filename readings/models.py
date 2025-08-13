from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Author(models.Model):
    name = models.CharField(max_length=255)
    birth_year = models.IntegerField(null=True, blank=True)
    death_year = models.IntegerField(null=True, blank=True)
    bio = models.TextField(blank=True)
    period = models.CharField(max_length=50, choices=[
        ('ancient', 'Ancient'),
        ('medieval', 'Medieval'),
        ('renaissance', 'Renaissance'),
        ('modern', 'Modern'),
    ])
    country = models.CharField(max_length=100, blank=True)
    genre = models.CharField(max_length=50, choices=[
        ('tragedy', 'Tragedy'),
        ('comedy', 'Comedy'),
        ('poetry', 'Poetry'),
        ('history', 'History'),
        ('philosophy', 'Philosophy'),
        ('drama', 'Drama'),
        ('novel', 'Novel'),
    ], blank=True)
    image = models.ImageField(upload_to='images/authors/', null=True, blank=True)
    
    def __str__(self):
        return self.name

class Work(models.Model):
    title = models.CharField(max_length=255)
    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name='works')
    year = models.IntegerField(null=True, blank=True)
    genre = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    main_characters = models.TextField(blank=True)  # Store as comma-separated values
    
    def __str__(self):
        return self.title

class ReadingNote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    work = models.ForeignKey(Work, on_delete=models.CASCADE)
    notes = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Notes on {self.work.title} by {self.user.username}"

class ReadingProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    work = models.ForeignKey(Work, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=[
        ('to_read', 'To Read'),
        ('reading', 'Currently Reading'),
        ('completed', 'Completed'),
    ])
    progress_percentage = models.IntegerField(default=0)
    start_date = models.DateField(null=True, blank=True)
    completion_date = models.DateField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user', 'work']
    
    def __str__(self):
        return f"{self.work.title} - {self.status}"
