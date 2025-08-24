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
- **Security**: reCAPTCHA v3 integration for authentication with score-based validation

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

### HTTP Status Code Guidelines
**CRITICAL**: Only return 401 Unauthorized for actual authentication/authorization failures. The frontend automatically triggers re-authentication on 401 responses.

**Correct 401 usage:**
- Invalid or expired authentication token
- Missing authentication credentials
- Failed login attempts
- Access denied due to insufficient permissions

**Use other status codes for:**
- 400 Bad Request: Invalid input data, validation errors, malformed requests
- 404 Not Found: Resource not found (channels, videos, etc.)
- 409 Conflict: Resource already exists, conflicting state
- 422 Unprocessable Entity: Valid request format but business logic errors
- 500 Internal Server Error: Unexpected server errors, external API failures

**Examples:**
- YouTube API quota exceeded → 429 Too Many Requests or 503 Service Unavailable
- Channel not found on YouTube → 404 Not Found
- Invalid video ID format → 400 Bad Request
- reCAPTCHA validation failure → 400 Bad Request (not 401)

### Code Style (.cursor/rules/my-style-rules.mdc)
- Senior-level code quality expected
- No emojis in code or comments
- Thoughtful commenting only when function names aren't self-explanatory
- Never use abbreviations for variables, unless they are globaly known (like "i" in for loops etc.)

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

## Chat Instructions

### Library Recommendations
When suggesting new libraries or dependencies:
- Include links to project pages (GitHub/documentation)
- Verify projects are actively maintained and widely adopted
- Explain why the library is needed and what alternatives exist
- Consider bundle size impact for frontend dependencies

### Communication Style
- Be direct and honest in assessments
- If code or approaches have issues, point them out constructively
- Provide balanced feedback - acknowledge both strengths and weaknesses
- Avoid excessive praise; focus on factual, actionable guidance
- When suggesting improvements, explain the reasoning behind changes
- When thinking, write a few words about what is meaning of the word you're using (for example: Osmozing (the act of diffusing solvent molecules))
  1. Uncommon/technical words specifically
  2. During thinking/processing (not just final responses)
  3. Brief inline explanations
  4. The format with the word first, then explanation in parentheses