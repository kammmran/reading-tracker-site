from django.urls import path
from . import views

app_name = 'readings'

urlpatterns = [
    path('', views.home, name='home'),
    path('api/load-xml-data/', views.load_xml_data, name='load_xml_data'),
    path('api/genre-statistics/', views.get_genre_statistics, name='get_genre_statistics'),
    path('api/notes/', views.get_notes, name='get_notes'),
    path('api/notes/create/', views.create_note, name='create_note'),
    path('api/notes/update/<int:note_id>/', views.update_note, name='update_note'),
    path('api/notes/delete/<int:note_id>/', views.delete_note, name='delete_note'),
    path('api/reading-list/', views.get_reading_list, name='get_reading_list'),
    path('api/reading-list/add/', views.add_to_reading_list, name='add_to_reading_list'),
    path('api/reading-list/update/', views.update_reading_status, name='update_reading_status'),
    path('api/reading-list/remove/', views.remove_from_reading_list, name='remove_from_reading_list'),
    path('api/books/search/', views.search_books, name='search_books'),
    path('api/auth/login/', views.login_user, name='login_user'),
    path('api/auth/signup/', views.signup_user, name='signup_user'),
    path('api/auth/logout/', views.logout_user, name='logout_user'),
    path('api/auth/status/', views.check_auth_status, name='check_auth_status'),
]
