from django.shortcuts import render
import os
import xml.etree.ElementTree as ET
from django.conf import settings
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from .models import ReadingNote, ReadingProgress, Work, Author
import json

# Create your views here.
def home(request):
    """
    View for the home page with the literature timeline
    """
    # You can add context data here if needed for your templates
    context = {}
    return render(request, 'home.html', context)

def load_xml_data(request):
    """
    API view to load author and work data from the database for the timeline
    """
    try:
        # Get all authors with their works from the database
        authors = Author.objects.prefetch_related('works').all()
        
        all_authors = []
        
        for author in authors:
            # Convert database author to the format expected by the frontend
            author_data = {
                'name': author.name,
                'birthYear': author.birth_year,
                'deathYear': author.death_year,
                'bio': author.bio,
                'country': author.country,
                'period': author.period,
                'genre': author.genre,  # Add genre from database
                'works': []
            }
            
            # Add all works for this author
            for work in author.works.all():
                work_data = {
                    'id': work.id,
                    'title': work.title,
                    'year': work.year,
                    'genre': work.genre,
                    'description': work.description,
                    'main_characters': work.main_characters.split(', ') if work.main_characters else []
                }
                author_data['works'].append(work_data)
            
            all_authors.append(author_data)
        
        print(f"Loaded {len(all_authors)} authors from database with {sum(len(a['works']) for a in all_authors)} total works")
        
        return JsonResponse({'authors': all_authors})
        
    except Exception as e:
        print(f"Error loading data from database: {e}")
        return JsonResponse({'error': str(e), 'authors': []}, status=500)

def get_genre_statistics(request):
    """
    API view to get genre statistics and lists from the database
    """
    try:
        # Get all authors with their genres
        authors = Author.objects.all()
        
        # Count authors by genre
        genre_counts = {}
        authors_by_genre = {}
        
        for author in authors:
            genre = author.genre or 'unknown'
            genre_counts[genre] = genre_counts.get(genre, 0) + 1
            
            if genre not in authors_by_genre:
                authors_by_genre[genre] = []
            
            authors_by_genre[genre].append({
                'name': author.name,
                'birth_year': author.birth_year,
                'death_year': author.death_year,
                'period': author.period,
                'country': author.country,
                'works_count': author.works.count()
            })
        
        # Get unique genres
        available_genres = list(genre_counts.keys())
        
        # Get period statistics
        period_counts = {}
        for author in authors:
            period = author.period or 'unknown'
            period_counts[period] = period_counts.get(period, 0) + 1
        
        return JsonResponse({
            'genre_counts': genre_counts,
            'authors_by_genre': authors_by_genre,
            'available_genres': available_genres,
            'period_counts': period_counts,
            'total_authors': authors.count()
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def get_notes(request):
    """
    API view to get reading notes from the database
    """
    try:
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return JsonResponse({
                'authenticated': False,
                'message': 'Please log in to access your notes'
            }, status=401)
        
        # Get user's notes
        notes = ReadingNote.objects.filter(user=request.user).select_related('work', 'work__author')
        
        notes_data = []
        for note in notes:
            notes_data.append({
                'id': note.id,
                'title': f"Notes on {note.work.title}",
                'content': note.notes,
                'work_title': note.work.title,
                'author_name': note.work.author.name,
                'created_at': note.created_at.isoformat(),
                'updated_at': note.updated_at.isoformat(),
            })
        
        return JsonResponse({
            'authenticated': True,
            'notes': notes_data
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def create_note(request):
    """
    API view to create a new reading note
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    # Check authentication
    if not request.user.is_authenticated:
        return JsonResponse({
            'authenticated': False,
            'error': 'Please log in to create notes'
        }, status=401)
    
    try:
        data = json.loads(request.body)
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        work_id = data.get('work_id')
        author_name = data.get('author_name', '').strip()
        work_title = data.get('work_title', '').strip()
        
        if not title or not content:
            return JsonResponse({'error': 'Title and content are required'}, status=400)
        
        # Use authenticated user
        user = request.user
        
        # If work_id is provided, use existing work, otherwise create new author/work
        if work_id:
            try:
                work = Work.objects.get(id=work_id)
            except Work.DoesNotExist:
                return JsonResponse({'error': 'Work not found'}, status=404)
        else:
            # Create or get author and work if not provided
            if author_name and work_title:
                author, created = Author.objects.get_or_create(
                    name=author_name,
                    defaults={'period': 'modern', 'bio': ''}
                )
                work, created = Work.objects.get_or_create(
                    title=work_title,
                    author=author,
                    defaults={'genre': '', 'year': None}
                )
            else:
                # Create a general note without specific work
                author, created = Author.objects.get_or_create(
                    name='General',
                    defaults={'period': 'modern', 'bio': 'General notes'}
                )
                work, created = Work.objects.get_or_create(
                    title='General Notes',
                    author=author,
                    defaults={'genre': 'Note', 'year': None}
                )
        
        # Create the note
        note = ReadingNote.objects.create(
            user=user,
            work=work,
            notes=content
        )
        
        # Return the created note data
        return JsonResponse({
            'success': True,
            'note': {
                'id': note.id,
                'title': f"Notes on {note.work.title}",
                'content': note.notes,
                'work_title': note.work.title,
                'author_name': note.work.author.name,
                'created_at': note.created_at.isoformat(),
                'updated_at': note.updated_at.isoformat(),
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def update_note(request, note_id):
    """
    API view to update an existing reading note
    """
    if request.method != 'PUT':
        return JsonResponse({'error': 'Only PUT method allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        content = data.get('content', '').strip()
        
        if not content:
            return JsonResponse({'error': 'Content is required'}, status=400)
        
        # Get the note
        user = request.user if request.user.is_authenticated else User.objects.get_or_create(username='admin')[0]
        
        try:
            note = ReadingNote.objects.get(id=note_id, user=user)
        except ReadingNote.DoesNotExist:
            return JsonResponse({'error': 'Note not found'}, status=404)
        
        # Update the note
        note.notes = content
        note.save()
        
        # Return the updated note data
        return JsonResponse({
            'success': True,
            'note': {
                'id': note.id,
                'title': f"Notes on {note.work.title}",
                'content': note.notes,
                'work_title': note.work.title,
                'author_name': note.work.author.name,
                'created_at': note.created_at.isoformat(),
                'updated_at': note.updated_at.isoformat(),
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def delete_note(request, note_id):
    """
    API view to delete a reading note
    """
    if request.method != 'DELETE':
        return JsonResponse({'error': 'Only DELETE method allowed'}, status=405)
    
    try:
        # Get the note
        user = request.user if request.user.is_authenticated else User.objects.get_or_create(username='admin')[0]
        
        try:
            note = ReadingNote.objects.get(id=note_id, user=user)
        except ReadingNote.DoesNotExist:
            return JsonResponse({'error': 'Note not found'}, status=404)
        
        # Delete the note
        note.delete()
        
        return JsonResponse({'success': True, 'message': 'Note deleted successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def get_reading_list(request):
    """
    API view to get reading progress/list from the database
    """
    try:
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return JsonResponse({
                'authenticated': False,
                'message': 'Please log in to access your reading list'
            }, status=401)
        
        # Get user's reading progress
        readings = ReadingProgress.objects.filter(user=request.user).select_related('work', 'work__author')
        
        readings_data = []
        for reading in readings:
            readings_data.append({
                'id': reading.id,
                'title': reading.work.title,
                'author': reading.work.author.name,
                'status': reading.get_status_display(),
                'status_code': reading.status,
                'progress_percentage': reading.progress_percentage,
                'start_date': reading.start_date.isoformat() if reading.start_date else None,
                'completion_date': reading.completion_date.isoformat() if reading.completion_date else None,
                'genre': reading.work.genre,
                'year': reading.work.year,
                'description': f"{reading.work.author.name} - {reading.work.genre}" if reading.work.genre else reading.work.author.name,
                'date_added': reading.start_date.isoformat() if reading.start_date else None,
            })
        
        return JsonResponse({
            'authenticated': True,
            'readings': readings_data,
            'user': {
                'username': request.user.username,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def login_user(request):
    """
    API view to authenticate user login
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return JsonResponse({'error': 'Username and password are required'}, status=400)
        
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({
                'success': True,
                'message': 'Login successful',
                'user': {
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name
                }
            })
        else:
            return JsonResponse({'error': 'Invalid username or password'}, status=401)
            
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def signup_user(request):
    """
    API view to register a new user
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        
        if not username or not email or not password:
            return JsonResponse({'error': 'Username, email, and password are required'}, status=400)
        
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            return JsonResponse({'error': 'Username already exists'}, status=400)
        
        if User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Email already exists'}, status=400)
        
        # Create new user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        # Log the user in
        login(request, user)
        
        return JsonResponse({
            'success': True,
            'message': 'Account created successfully',
            'user': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def logout_user(request):
    """
    API view to logout user
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    logout(request)
    return JsonResponse({'success': True, 'message': 'Logged out successfully'})

def check_auth_status(request):
    """
    API view to check current authentication status
    """
    if request.user.is_authenticated:
        return JsonResponse({
            'authenticated': True,
            'user': {
                'username': request.user.username,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name
            }
        })
    else:
        return JsonResponse({
            'authenticated': False,
            'message': 'User is not authenticated'
        })

@csrf_exempt
def add_to_reading_list(request):
    """
    API view to add a book to user's reading list
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    try:
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return JsonResponse({
                'authenticated': False,
                'message': 'Please log in to manage your reading list'
            }, status=401)
        
        data = json.loads(request.body)
        work_id = data.get('work_id')
        status = data.get('status', 'to_read')  # Default to 'to_read'
        
        if not work_id:
            return JsonResponse({'error': 'work_id is required'}, status=400)
        
        # Get the work
        try:
            work = Work.objects.get(id=work_id)
        except Work.DoesNotExist:
            return JsonResponse({'error': 'Work not found'}, status=404)
        
        # Create or update reading progress
        reading_progress, created = ReadingProgress.objects.get_or_create(
            user=request.user,
            work=work,
            defaults={'status': status}
        )
        
        if not created:
            # Update existing record
            reading_progress.status = status
            reading_progress.save()
        
        action = 'added' if created else 'updated'
        
        return JsonResponse({
            'success': True,
            'message': f'Book {action} to reading list successfully',
            'reading_progress_id': reading_progress.id
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def update_reading_status(request):
    """
    API view to update reading status of a book
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    try:
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return JsonResponse({
                'authenticated': False,
                'message': 'Please log in to manage your reading list'
            }, status=401)
        
        data = json.loads(request.body)
        reading_progress_id = data.get('reading_progress_id')
        new_status = data.get('status')
        
        if not reading_progress_id or not new_status:
            return JsonResponse({'error': 'reading_progress_id and status are required'}, status=400)
        
        # Get the reading progress record
        try:
            reading_progress = ReadingProgress.objects.get(
                id=reading_progress_id,
                user=request.user
            )
        except ReadingProgress.DoesNotExist:
            return JsonResponse({'error': 'Reading progress record not found'}, status=404)
        
        # Update status
        reading_progress.status = new_status
        reading_progress.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Reading status updated successfully'
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def remove_from_reading_list(request):
    """
    API view to remove a book from user's reading list
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    try:
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return JsonResponse({
                'authenticated': False,
                'message': 'Please log in to manage your reading list'
            }, status=401)
        
        data = json.loads(request.body)
        reading_progress_id = data.get('reading_progress_id')
        
        if not reading_progress_id:
            return JsonResponse({'error': 'reading_progress_id is required'}, status=400)
        
        # Get and delete the reading progress record
        try:
            reading_progress = ReadingProgress.objects.get(
                id=reading_progress_id,
                user=request.user
            )
            reading_progress.delete()
        except ReadingProgress.DoesNotExist:
            return JsonResponse({'error': 'Reading progress record not found'}, status=404)
        
        return JsonResponse({
            'success': True,
            'message': 'Book removed from reading list successfully'
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def search_books(request):
    """
    API view to search for books/works
    """
    try:
        query = request.GET.get('q', '').strip()
        
        if not query:
            return JsonResponse({'books': []})
        
        # Search in both title and author name
        from django.db import models
        works = Work.objects.select_related('author').filter(
            models.Q(title__icontains=query) |
            models.Q(author__name__icontains=query)
        )[:20]  # Limit to 20 results
        
        books_data = []
        for work in works:
            books_data.append({
                'id': work.id,
                'title': work.title,
                'author': work.author.name,
                'year': work.year,
                'genre': work.genre,
                'description': work.description,
                'author_period': work.author.period,
                'author_country': work.author.country
            })
        
        return JsonResponse({'books': books_data})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
