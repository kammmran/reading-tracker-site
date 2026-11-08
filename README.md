# Reading Tracker

A Django web app for tracking books you read and the notes you take on them.

## Features

- Track readings, authors and genres (`readings` app)
- Import existing reading data from XML: `python manage.py import_xml_data`
- Fill in author genres: `python manage.py populate_author_genres`
- Generate sample data for development: `python manage.py create_test_data`

## Run locally

```bash
git clone https://github.com/kammmran/reading-tracker-site.git
cd reading-tracker-site
python3 -m venv .venv && source .venv/bin/activate
pip install django
python manage.py migrate
python manage.py runserver   # open http://127.0.0.1:8000
```
