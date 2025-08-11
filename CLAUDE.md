# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a full-stack YouTube gallery application with a **Next.js frontend** and **Django REST API backend**, orchestrated with Docker Compose. The application allows users to view and manage video collections with watch status tracking.

### Stack Components:
- **Frontend**: Next.js 15 with TypeScript, TailwindCSS, TanStack Query (React Query)
- **Backend**: Django with Django REST Framework, PostgreSQL database
- **Containerization**: Docker Compose for development and production environments

### Key Architecture Patterns:
- **API-First Design**: Frontend communicates with backend exclusively through REST API
- **State Management**: TanStack Query for server state, URL search params for filter state
- **Database**: PostgreSQL with Django ORM, UUID primary keys for all models
- **CORS**: Configured for development (localhost:3000 ↔ localhost:8000)

## Development Commands

### Frontend (Next.js)
```bash
npm run dev        # Start development server (port 3000)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

### Backend (Django)
```bash
cd backend
python manage.py runserver 0.0.0.0:8000  # Development server
python manage.py makemigrations           # Create migrations
python manage.py migrate                  # Apply migrations
python manage.py collectstatic           # Collect static files
```

### Docker Development
```bash
docker-compose up --build    # Start all services (recommended)
docker-compose down          # Stop all services
```

The Docker setup automatically handles migrations and static file collection on startup.

## Key API Endpoints

- `GET /api/videos/` - Fetch all videos (paginated)
- `GET /api/videos/watched/` - Fetch watched videos
- `GET /api/videos/unwatched/` - Fetch unwatched videos
- `GET /api/videos/stats/` - Get video statistics
- `PUT /api/videos/{id}/watch/` - Update watch status

## Database Models

### Video Model (backend/videos/models.py)
- **Primary Key**: UUID field (`uuid`)
- **External ID**: `video_id` (YouTube video ID)
- **Watch Status**: `is_watched` boolean field
- **Relationships**: Foreign key to `Channel` model
- **Custom Field**: `YouTubeDurationField` for video duration

### Frontend Types (types.ts)
- `Video` interface with id, title, url, thumbnail, watched fields
- `VideoResponse` for paginated API responses
- `VideoStats` for dashboard statistics

## Coding Standards & Conventions

### Frontend (.cursor/rules/frontend-rules.mdc)
- Use TypeScript with strict mode
- Prefer `const` arrow functions over `function` declarations
- Event handlers prefixed with "handle" (e.g., `handleClick`)
- Use TailwindCSS classes exclusively for styling
- Implement accessibility features (tabindex, aria-labels, keyboard handlers)
- Follow DRY principles and early returns for readability

### Backend (.cursor/rules/backend-rules.mdc)
- Follow Django MVT pattern strictly
- Use Django's built-in features (ORM, forms, auth) over custom solutions
- Implement proper error handling at view level
- Use class-based views for complex logic, function-based for simple operations
- Apply Django security best practices (CSRF, SQL injection prevention)

### Code Style (.cursor/rules/my-style-rules.mdc)
- Senior-level code quality expected
- No emojis in code or comments
- Thoughtful commenting only when function names aren't self-explanatory

## Environment Configuration

### Frontend Environment Variables
- `NEXT_PUBLIC_API_URL`: Backend API base URL (default: http://localhost:8000/api)

### Backend Environment Variables
- `DEBUG`: Django debug mode
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Database configuration
- `SECRET_KEY`: Django secret key
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts

## Testing & Quality Assurance

- **Frontend**: ESLint configured with Next.js TypeScript rules
- **Backend**: Django's built-in testing framework available
- **Type Checking**: TypeScript strict mode enabled
- Run `npm run lint` before committing frontend changes
- Ensure Docker Compose services start successfully before deployment

## File Structure Notes

- Components in `/components` use named exports
- API services centralized in `/services/api.ts`
- Type definitions in `/types.ts`
- Backend follows Django app structure with `videos` app
- Docker configurations separate for development and production