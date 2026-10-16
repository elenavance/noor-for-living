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

## Ask Noor AI learning assistant

Ask Noor is an authenticated, source-cited educational assistant powered by the OpenAI Responses API and web search. It does not save submitted questions or answers to the application database. It filters displayed source links to a small allowlist of established Quran, hadith, and educational domains, and limits each account to five questions per minute.

To enable it, set these server-side environment variables in your deployment (never put the API key in browser JavaScript or commit it to Git):

- `OPENAI_API_KEY`: an OpenAI API key with API billing enabled.
- `OPENAI_MODEL`: optional; defaults to `gpt-4.1-mini`.

Without `OPENAI_API_KEY`, the page remains available to signed-in users but displays a setup message instead of generating answers. API usage can incur charges. The assistant is for general learning, not fatwas or professional advice; citations and generated answers should still be checked.

## Important
This project must keep its own repository, environment variables, database, deployment, and domain. Do not copy or connect it to Spiritual Wisdom infrastructure.
