from django.core.management.base import BaseCommand
from readings.models import Author
import json
import os
from django.conf import settings

class Command(BaseCommand):
    help = 'Populate author genres from authors-config.js file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        # Author categories mapping from the JS config
        author_categories = {
            # Ancient Authors
            'Sophocles': 'tragedy',
            'Aeschylus': 'tragedy', 
            'Euripides': 'tragedy',
            'Aristophanes': 'comedy',
            'Herodotus': 'history',
            'Thucydides': 'history',
            'Plato': 'philosophy',
            'Aristotle': 'philosophy',
            'Homer': 'poetry',
            'Phrynichus': 'tragedy',
            'Thespis': 'tragedy',
            
            # Renaissance Authors
            'Molière': 'comedy',
            'Carlo Goldoni': 'comedy',
            'Pierre‑Augustin Caron de Beaumarchais': 'comedy',
            'François Rabelais': 'comedy',
        }

        updated_count = 0
        not_found_count = 0
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        for author_name, genre in author_categories.items():
            try:
                # Try to find the author by exact name match first
                try:
                    author = Author.objects.get(name=author_name)
                except Author.DoesNotExist:
                    # Try case-insensitive search
                    author = Author.objects.get(name__iexact=author_name)
                
                if author.genre != genre:
                    if dry_run:
                        self.stdout.write(
                            f'Would update {author.name}: "{author.genre}" -> "{genre}"'
                        )
                    else:
                        old_genre = author.genre
                        author.genre = genre
                        author.save()
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Updated {author.name}: "{old_genre}" -> "{genre}"'
                            )
                        )
                    updated_count += 1
                else:
                    self.stdout.write(f'{author.name} already has correct genre: {genre}')
                    
            except Author.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f'Author not found in database: {author_name}')
                )
                not_found_count += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error updating {author_name}: {e}')
                )

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN COMPLETE: Would update {updated_count} authors, '
                    f'{not_found_count} authors not found in database'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Genre update complete: {updated_count} authors updated, '
                    f'{not_found_count} authors not found in database'
                )
            )

        # Show all authors and their current genres
        self.stdout.write('\nCurrent authors and genres in database:')
        for author in Author.objects.all().order_by('name'):
            genre_display = author.genre if author.genre else 'No genre'
            self.stdout.write(f'  {author.name}: {genre_display}')
