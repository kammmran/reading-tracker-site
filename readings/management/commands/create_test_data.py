from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from readings.models import Author, Work, ReadingNote

class Command(BaseCommand):
    help = 'Create test data for the reading tracker'

    def handle(self, *args, **options):
        # Create or get admin user
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@example.com',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin_user.set_password('admin')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created admin user'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Admin user already exists'))

        # Create some test authors and works
        authors_data = [
            {
                'name': 'Homer',
                'period': 'ancient',
                'birth_year': -800,
                'death_year': -750,
                'bio': 'Ancient Greek epic poet',
                'works': [
                    {'title': 'The Iliad', 'year': -750, 'genre': 'Epic Poetry'},
                    {'title': 'The Odyssey', 'year': -750, 'genre': 'Epic Poetry'},
                ]
            },
            {
                'name': 'Sophocles',
                'period': 'ancient',
                'birth_year': -496,
                'death_year': -406,
                'bio': 'Ancient Greek tragedian',
                'works': [
                    {'title': 'Oedipus Rex', 'year': -429, 'genre': 'Tragedy'},
                    {'title': 'Antigone', 'year': -441, 'genre': 'Tragedy'},
                ]
            },
            {
                'name': 'William Shakespeare',
                'period': 'renaissance',
                'birth_year': 1564,
                'death_year': 1616,
                'bio': 'English playwright and poet',
                'works': [
                    {'title': 'Hamlet', 'year': 1600, 'genre': 'Tragedy'},
                    {'title': 'Romeo and Juliet', 'year': 1597, 'genre': 'Tragedy'},
                ]
            },
        ]

        for author_data in authors_data:
            works_data = author_data.pop('works', [])
            
            author, created = Author.objects.get_or_create(
                name=author_data['name'],
                defaults=author_data
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created author: {author.name}'))
            else:
                self.stdout.write(self.style.SUCCESS(f'Author already exists: {author.name}'))

            for work_data in works_data:
                work, created = Work.objects.get_or_create(
                    title=work_data['title'],
                    author=author,
                    defaults=work_data
                )
                
                if created:
                    self.stdout.write(self.style.SUCCESS(f'  Created work: {work.title}'))

        # Create some sample notes
        notes_data = [
            {
                'work_title': 'The Iliad',
                'author_name': 'Homer',
                'notes': 'The Iliad is an epic poem about the Trojan War. Key themes include honor, glory, and the consequences of rage. The character of Achilles embodies the heroic ideal but also shows the destructive nature of unchecked anger.'
            },
            {
                'work_title': 'Hamlet',
                'author_name': 'William Shakespeare',
                'notes': 'Hamlet explores themes of revenge, madness, and moral corruption. The famous "To be or not to be" soliloquy represents the central philosophical question of existence versus non-existence.'
            },
        ]

        for note_data in notes_data:
            try:
                work = Work.objects.get(
                    title=note_data['work_title'],
                    author__name=note_data['author_name']
                )
                
                note, created = ReadingNote.objects.get_or_create(
                    user=admin_user,
                    work=work,
                    defaults={'notes': note_data['notes']}
                )
                
                if created:
                    self.stdout.write(self.style.SUCCESS(f'Created note for: {work.title}'))
                
            except Work.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'Work not found: {note_data["work_title"]}'))

        self.stdout.write(self.style.SUCCESS('Test data creation completed!'))
