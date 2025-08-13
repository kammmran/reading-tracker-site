import os
import xml.etree.ElementTree as ET
from django.core.management.base import BaseCommand
from django.conf import settings
from readings.models import Author, Work


class Command(BaseCommand):
    help = 'Import all XML author and work data into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before importing',
        )

    def handle(self, *args, **options):
        self.stdout.write('Starting XML import process...')
        
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            Work.objects.all().delete()
            Author.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing data cleared.'))

        # Define the path to the data directory
        data_dir = os.path.join(settings.BASE_DIR, 'readings', 'static', 'data')
        self.stdout.write(f'Looking for data in: {data_dir}')
        
        # Define periods and their directories
        periods = ['ancient', 'medieval', 'renaissance', 'modern']
        
        total_authors = 0
        total_works = 0

        for period in periods:
            period_dir = os.path.join(data_dir, period)
            
            if not os.path.exists(period_dir):
                self.stdout.write(f'Directory {period_dir} does not exist, skipping...')
                continue
                
            self.stdout.write(f'Processing {period} period...')
            
            # Get all XML files in the period directory
            xml_files = [f for f in os.listdir(period_dir) if f.endswith('.xml')]
            self.stdout.write(f'Found {len(xml_files)} XML files in {period}: {xml_files}')
            
            for xml_file in xml_files:
                file_path = os.path.join(period_dir, xml_file)
                self.stdout.write(f'  Processing {xml_file}...')
                try:
                    author, works_count = self.import_xml_file(file_path, period)
                    if author:
                        total_authors += 1
                        total_works += works_count
                        self.stdout.write(f'  ✓ Imported {author.name} with {works_count} works')
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Error importing {xml_file}: {str(e)}')
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'Import completed! Total: {total_authors} authors, {total_works} works'
            )
        )

    def import_xml_file(self, file_path, period):
        """Import a single XML file and return the created author and work count"""
        
        try:
            # Read the file and clean up any problematic content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove or fix problematic content reference patterns
            import re
            content = re.sub(r':contentReference\[.*?\]\{.*?\}', '', content)
            
            # Parse the cleaned XML
            root = ET.fromstring(content)
        except (ET.ParseError, Exception) as e:
            raise Exception(f'XML parsing error: {e}')

        # Extract author information - check both 'n' and 'name' tags
        name = self.get_text_or_none(root.find('n'))
        if not name:
            name = self.get_text_or_none(root.find('name'))
        if not name:
            raise Exception('Author name not found in XML (checked both <n> and <name> tags)')

        birth_year = self.get_int_or_none(root.find('birth_year'))
        death_year = self.get_int_or_none(root.find('death_year'))
        bio = self.get_text_or_none(root.find('bio'), '')
        country = self.get_text_or_none(root.find('country'), '')

        # Create or get the author
        author, created = Author.objects.get_or_create(
            name=name,
            defaults={
                'birth_year': birth_year,
                'death_year': death_year,
                'bio': bio,
                'period': period,
                'country': country,
            }
        )

        if not created:
            # Update existing author with new information
            author.birth_year = birth_year or author.birth_year
            author.death_year = death_year or author.death_year
            author.bio = bio or author.bio
            author.country = country or author.country
            author.period = period
            author.save()

        # Import works
        works_count = 0
        books_element = root.find('books')
        
        if books_element is not None:
            for book_element in books_element.findall('book'):
                work = self.import_work(book_element, author)
                if work:
                    works_count += 1

        return author, works_count

    def import_work(self, book_element, author):
        """Import a single work from XML element"""
        
        title = self.get_text_or_none(book_element.find('title'))
        if not title:
            return None

        year = self.get_int_or_none(book_element.find('year'))
        description = self.get_text_or_none(book_element.find('description'), '')
        genre = self.get_text_or_none(book_element.find('genre'), '')

        # Extract main characters
        main_characters = []
        characters_element = book_element.find('main_characters')
        if characters_element is not None:
            for char_element in characters_element.findall('character'):
                char_text = self.get_text_or_none(char_element)
                if char_text:
                    main_characters.append(char_text)

        main_characters_str = ', '.join(main_characters)

        # Create or update the work
        work, created = Work.objects.get_or_create(
            title=title,
            author=author,
            defaults={
                'year': year,
                'genre': genre,
                'description': description,
                'main_characters': main_characters_str,
            }
        )

        if not created:
            # Update existing work
            work.year = year or work.year
            work.genre = genre or work.genre
            work.description = description or work.description
            work.main_characters = main_characters_str or work.main_characters
            work.save()

        return work

    def get_text_or_none(self, element, default=None):
        """Get text from XML element or return default"""
        if element is not None and element.text:
            return element.text.strip()
        return default

    def get_int_or_none(self, element):
        """Get integer from XML element or return None"""
        text = self.get_text_or_none(element)
        if text:
            try:
                return int(text)
            except ValueError:
                return None
        return None
