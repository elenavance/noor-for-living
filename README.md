# NOOR FOR LIVING

**Your Daily Islamic Companion**

A standalone, Indonesia-first Islamic companion Progressive Web App (PWA), built with Django. This repository is intentionally independent from the Spiritual Wisdom project.

## Planned foundation
- Django web application with PostgreSQL in production and SQLite for local development
- Mobile-first responsive PWA
- Indonesian, English, and Chinese language support planned
- Separate authentication, user profiles, prayer tools, Quran resources, duas and dhikr, learning content, and personal worship journey
- Careful sourcing and clear references for Islamic educational content

## Development
1. Create and activate a Python virtual environment.
2. Install dependencies: `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and set a unique secret key.
4. Run `python manage.py migrate`
5. Run `python manage.py runserver`

## Important
This project must keep its own repository, environment variables, database, deployment, and domain. Do not copy or connect it to Spiritual Wisdom infrastructure.
