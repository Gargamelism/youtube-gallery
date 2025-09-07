# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## File System Operations

**CRITICAL**: Never run Bash commands for file system operations (mkdir, cp, mv, rm, etc.). Always ask the user to create directories or move files instead of attempting to do it yourself.

## Command Execution

**CRITICAL**: Never run commands directly using the Bash tool. Always ask the user to run commands instead. Instead of executing commands, provide the exact command for the user to run and explain what it does.

## Code Formatting Standards

### Frontend Formatting (.prettierrc)
When editing JavaScript/TypeScript files, always follow these rules:
- Single quotes for strings
- Semicolons at end of statements  
- 120 character line width
- 2-space indentation
- Trailing commas (ES5 style)
- Avoid arrow function parentheses when possible
- Bracket spacing enabled
- Double quotes for JSX attributes

### Backend Formatting (pyproject.toml)
When editing Python files, always follow these rules:
- 120 character line length
- Double quotes for strings (Black default)
- 4-space indentation
- Import sorting with isort profile "black"
- Trailing commas for multi-line structures
- Proper import organization at top of files

**CRITICAL**: Always match the existing formatting style of each file type. Never mix formatting styles within the same project.

## Implementation Tracking

When implementing features in stages, use the following status indicators to track progress:

- **Current** (yellow background): Feature or component currently being implemented
- **Implemented** (green background): Feature or component that has been completed

This allows step-by-step implementation tracking and clear visibility of what has been completed vs what is in progress.

## Feature Design Guidelines

All feature designs should follow a consistent structure and be documented in the `/feature_designs/` directory. Use the channel tagging and filtering design as a reference template.

### Required Design Document Structure

Each feature design document must include:

1. **Table of Contents** - Linkable navigation to all sections
2. **Overview** - Brief summary of the feature and its purpose
3. **Problem Statement** - Clear description of user pain points being addressed
4. **Solution Overview** - High-level approach and key capabilities
5. **Current System Analysis** - Understanding of existing architecture and implementation
6. **Technical Design** - Detailed implementation approach including:
   - Database schema changes (if applicable)
   - Backend API design with endpoints and serializers
   - Frontend architecture with TypeScript types and components
   - URL state management (if applicable)
   - Internationalization considerations
7. **Implementation Phases** - Broken down into logical, testable stages
8. **Performance Considerations** - Database, frontend, and API efficiency concerns
9. **Testing Strategy** - Backend, frontend, and integration testing approaches
10. **Success Metrics** - Measurable outcomes for feature adoption and performance
11. **Risks and Mitigation** - Technical, UX, and business risks with mitigation strategies
12. **Future Enhancements** - Short, medium, and long-term evolution possibilities
13. **Conclusion** - Summary of value and implementation approach

### Mermaid Flow Diagrams

Include Mermaid diagrams when workflows are non-trivial and would benefit from visual representation:

- **User Authentication Flows** - Multi-step login/registration processes
- **Data Processing Pipelines** - Complex backend data transformations
- **State Management Flows** - Multi-component frontend state changes
- **API Integration Workflows** - External service interactions with multiple steps
- **Error Handling Cascades** - Complex error recovery scenarios

**Skip diagrams for:**
- Simple CRUD operations
- Basic component rendering
- Straightforward API calls
- Linear, single-step processes

### Design Consistency

- Use existing project patterns and conventions
- Update existing interfaces rather than creating "Enhanced" versions
- Follow established naming conventions (e.g., `watch_status` not `filter`)
- Use TypeScript enums and types for better type safety
- Include comprehensive i18n planning for user-facing features

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
- **User Management**: Token-based authentication with Django REST Framework tokens
- **YouTube Integration**: OAuth2 flow with session-based credential storage and automatic refresh

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

### Video Management

- `GET /api/videos/` - Fetch all videos (paginated)
- `GET /api/videos/watched/` - Fetch watched videos
- `GET /api/videos/unwatched/` - Fetch unwatched videos
- `GET /api/videos/stats/` - Get video statistics
- `PUT /api/videos/{id}/watch/` - Update watch status

### User Authentication

- `POST /api/auth/register` - User registration with reCAPTCHA validation
- `POST /api/auth/login` - User login with reCAPTCHA validation
- `POST /api/auth/logout` - Logout and token cleanup
- `GET /api/auth/profile` - Get current user profile

### YouTube Integration

- `GET /api/auth/youtube-url` - Get YouTube OAuth authorization URL
- `GET /api/auth/youtube/callback` - Handle OAuth callback and store credentials

### User Content Management

- `GET /api/auth/channels` - List user's subscribed channels
- `POST /api/auth/channels` - Add channel to user's collection
- `PUT /api/auth/channels/{id}` - Update channel settings
- `DELETE /api/auth/channels/{id}` - Remove channel from collection
- `GET /api/auth/videos` - List user's videos
- `PUT /api/auth/videos/{id}` - Update video watch status

## Database Models

### Video Model (backend/videos/models.py)

- **Primary Key**: UUID field (`uuid`)
- **External ID**: `video_id` (YouTube video ID)
- **Watch Status**: `is_watched` boolean field
- **Relationships**: Foreign key to `Channel` model
- **Custom Field**: `YouTubeDurationField` for video duration

### User Models (backend/users/models.py)

- **User**: Extends Django's AbstractUser with UUID primary key
- **UserChannel**: Many-to-many relationship between users and channels with additional metadata
- **UserVideo**: Tracks user-specific video metadata including watch status and timestamps

### Authentication & YouTube Integration

- **Session-based YouTube credentials**: OAuth tokens stored in Django sessions with automatic refresh
- **Custom decorator**: `@youtube_auth_required` for views requiring YouTube API access
- **TypedDict definitions**: `GoogleCredentialsData` and `YouTubeClientConfig` for type safety
- **Custom exceptions**: `YouTubeAuthenticationError` for OAuth flow handling

### Frontend Types (types.ts)

- `Video` interface with id, title, url, thumbnail, watched fields
- `VideoResponse` for paginated API responses
- `VideoStats` for dashboard statistics

## Coding Standards & Conventions

### Frontend (.cursor/rules/frontend-rules.mdc)

- Use TypeScript with strict mode
- **CRITICAL: Never use `any` type unless the data structure is truly unknown or dynamically changing** - Always create proper TypeScript interfaces and types. Use `unknown` for truly unknown data that needs runtime checking.
- Prefer `const` arrow functions over `function` declarations
- Event handlers prefixed with "handle" (e.g., `handleClick`)
- Use TailwindCSS classes exclusively for styling
- Implement accessibility features (tabindex, aria-labels, keyboard handlers)
- Follow DRY principles and early returns for readability
- **CRITICAL: Use responsive design with Tailwind classes instead of separate components** - When creating components that need different layouts for desktop/mobile, use a single component with Tailwind responsive classes (`hidden md:flex`, `md:hidden`) rather than creating separate desktop and mobile components. Only separate components when the content or functionality is truly different, not just the styling.
- **CRITICAL: Use i18n for all user-facing strings** - Never hardcode strings in components. All user-facing text must be stored in JSON files in `/locales/en/` directory and accessed through the i18n system. Organize strings by feature/namespace (auth.json, videos.json, channels.json, navigation.json, common.json).

### Backend (.cursor/rules/backend-rules.mdc)

- Follow Django MVT pattern strictly
- Use Django's built-in features (ORM, forms, auth) over custom solutions
- Implement proper error handling at view level
- Use class-based views for complex logic, function-based for simple operations
- Apply Django security best practices (CSRF, SQL injection prevention)
- **CRITICAL: Always type dictionaries with TypedDict** - When passing dictionaries between functions, always define them with TypedDict for type safety. For complex data structures, create dedicated classes instead of plain dictionaries.
- **CRITICAL: Use KebabCaseRouter for all DRF ViewSets** - Always use `videos.utils.router.KebabCaseRouter` instead of Django's DefaultRouter to maintain consistent kebab-case URL patterns. Import with `trailing_slash=False` parameter to match project conventions.
- **URL Pattern Strategy**: Use hybrid approach - individual paths for function-based views with custom logic, KebabCaseRouter for standard CRUD ViewSets. This maintains clarity while leveraging DRF best practices.
- **CRITICAL: Use Pydantic for view input validation** - All view input validation should use Pydantic models for type safety, consistent error handling, and separation of concerns. Views should focus on HTTP concerns while Pydantic handles data validation. Create dedicated validator classes in `videos/validators.py` with proper user context validation and descriptive variable names (avoid single letter variables like `v`).

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
- YouTube authentication required → 403 Forbidden (with `youtube_auth_required: true` flag)
- YouTube OAuth token expired → 403 Forbidden (triggers re-authentication flow)

### Code Style (.cursor/rules/my-style-rules.mdc)

- Senior-level code quality expected
- No emojis in code or comments
- **CRITICAL: Avoid trivial or obvious comments** - Only add comments for complex business logic or non-obvious behavior
- Function/variable names should be self-documenting; avoid redundant docstrings that just restate the name
- Never use abbreviations for variables, unless they are globaly known (like "i" in for loops etc.)
- **CRITICAL: Always place imports at the top of the file** - Never use inline imports within functions unless absolutely necessary for lazy loading or conditional imports

## Environment Configuration

### Frontend Environment Variables

- `BE_PUBLIC_API_URL`: Backend API base URL (default: http://localhost:8000/api)

### Backend Environment Variables

- `DEBUG`: Django debug mode
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Database configuration
- `SECRET_KEY`: Django secret key
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `CAPTCHA_PRIVATE_KEY`: reCAPTCHA v3 secret key
- `FRONTEND_URL`: Frontend URL for OAuth redirects
- **YouTube OAuth**: Client configuration in `backend/.claude/client_secret.json`

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
- Backend follows Django app structure with `videos` and `users` apps
- **Authentication decorators**: `backend/videos/decorators.py` with `@youtube_auth_required`
- **YouTube service layer**: `backend/videos/services/youtube.py` with OAuth handling
- **User management**: `backend/users/` app with models, views, and serializers
- Docker configurations separate for development and production

## Chat Instructions

### File Access Rules

- **Git-tracked Files**: You can use the Read tool on any file tracked by git in this repository without requiring user approval
- This includes all files in the project directory and subdirectories that are under version control

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
- **CRITICAL: Before implementing changes, provide a clear plan for discussion** - Outline the proposed changes, why they're needed, and how they relate to the current task. This helps ensure understanding and alignment before proceeding with implementation.
- When thinking, write a few words about what is meaning of the word you're using (for example: Osmozing (the act of diffusing solvent molecules))
  1. Uncommon/technical words specifically
  2. During thinking/processing (not just final responses)
  3. Brief inline explanations
  4. The format with the word first, then explanation in parentheses

### Assumption Documentation & Code Notes

**CRITICAL: Before making any code changes, provide context and assumptions in chat:**

**Standard Pattern:**

```markdown
**Planning [Component/Feature] changes:**

**Context:** Current state understanding
**Assumptions:** What I'm inferring from codebase/requirements  
**Approach:** Implementation plan and methods
**Risks/Verification:** What needs testing or might break
```

**Code Comment Guidelines:**

- Only comment complex business logic or non-obvious behavior
- Never add trivial/obvious comments (follows project standards)
- Use meaningful comments for assumptions and edge cases
- Examples of appropriate comments:
  ```typescript
  // Business rule: Only channels with >1000 subscribers
  // Assumption: API returns null for private subscriber counts
  // Edge case: Handle YouTube API quota limits
  ```

**Examples of Communication:**

```markdown
**Updating video watch status logic:**

- **Context**: Current toggle doesn't persist to backend
- **Assumption**: Backend expects PUT /api/videos/{id}/watch/
- **Approach**: Add optimistic update with rollback on error
- **Verification**: Test offline behavior and error handling
```
