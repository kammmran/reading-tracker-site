#!/usr/bin/env python
import os
import sys
import django

# Setup Django environment
sys.path.append('/home/narmak/Music/website to track readings')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'readings_tracker.settings')
django.setup()

from readings.models import Author, Work

print(f'Authors: {Author.objects.count()}')
print(f'Works: {Work.objects.count()}')
print('\nAuthors by period:')
for period in ['ancient', 'medieval', 'renaissance', 'modern']:
    count = Author.objects.filter(period=period).count()
    print(f'  {period}: {count} authors')

print('\nSample authors:')
for author in Author.objects.all()[:5]:
    works_count = author.works.count()
    print(f'  {author.name} ({author.period}): {works_count} works')
