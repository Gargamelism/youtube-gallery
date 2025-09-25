# YouTube Gallery

A Next.js and Django application for managing and viewing YouTube videos with user-based channel subscriptions and watch tracking.

## Features

### Channel Tagging and Filtering ✅
- **Custom Tag Creation**: Users can create custom tags with colors for organizing channels
- **Tag Assignment**: Assign multiple tags to subscribed channels for better organization  
- **Advanced Filtering**: Filter videos by tags using AND/ALL or OR/ANY logic combined with watch status
- **Tag Management**: Full CRUD operations for tags with real-time UI updates
- **Performance Optimized**: Strategic database indexes and React Query caching for fast filtering

### User Management
- **Authentication**: Token-based authentication with registration and login
- **Personal Collections**: Each user has their own channel subscriptions and watch tracking
- **Watch Status**: Mark videos as watched/unwatched with timestamps and personal notes
- **Privacy**: Users only see videos from channels they've subscribed to

## API Conventions

All API endpoints follow the kebab-case convention:

- Words are separated by hyphens
- All letters are lowercase
- Example: `/api/channels/fetch-from-youtube/`

## User Authentication

The application now supports user authentication with token-based authentication. Users must authenticate to access most endpoints and manage their personal video collections.

### Authentication Endpoints

```http
POST /api/auth/register/
```

Register a new user account

- Request Body:
  ```json
  {
    "email": "user@example.com",
    "username": "username",
    "password": "securepassword",
    "password_confirm": "securepassword",
    "first_name": "First",
    "last_name": "Last"
  }
  ```

```http
POST /api/auth/login/
```

Login with email and password

- Request Body:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- Returns: User data and authentication token

```http
POST /api/auth/logout/
```

Logout and invalidate token (requires authentication)

```http
GET /api/auth/profile/
```

Get current user profile (requires authentication)

### User Channel Management

```http
GET /api/auth/channels/
POST /api/auth/channels/
```

List and create user channel subscriptions (requires authentication)

```http
GET /api/auth/channels/{uuid}/
PUT /api/auth/channels/{uuid}/
DELETE /api/auth/channels/{uuid}/
```

Retrieve, update, or delete user channel subscriptions (requires authentication)

### User Video Management

```http
GET /api/auth/videos/
POST /api/auth/videos/
```

List and create user video interactions (requires authentication)

```http
GET /api/auth/videos/{uuid}/
PUT /api/auth/videos/{uuid}/
DELETE /api/auth/videos/{uuid}/
```

Retrieve, update, or delete user video interactions (requires authentication)

### Channel Tag Management

```http
GET /api/auth/tags/
POST /api/auth/tags/
```

List and create channel tags (requires authentication)

- POST Request Body:
  ```json
  {
    "name": "Tech",
    "color": "#3B82F6",
    "description": "Technology videos"
  }
  ```

```http
GET /api/auth/tags/{id}/
PUT /api/auth/tags/{id}/
DELETE /api/auth/tags/{id}/
```

Retrieve, update, or delete channel tags (requires authentication)

```http
GET /api/auth/channels/{id}/tags/
PUT /api/auth/channels/{id}/tags/
```

Get or assign tags to a channel (requires authentication)

- PUT Request Body:
  ```json
  {
    "tag_ids": ["tag-uuid-1", "tag-uuid-2"]
  }
  ```

## API Endpoints

### Videos (User-Filtered)

```http
GET /api/videos/
```

List videos from user's subscribed channels with pagination and filtering options (authentication optional).

- Query Parameters:
  - `search`: Search in title and description
  - `ordering`: Sort by title, published_at, view_count, like_count
  - `channel`: Filter by channel UUID
  - `tags`: Comma-separated tag names for filtering (e.g., `tags=Tech,Tutorial`)
  - `tag_mode`: Tag filtering mode - `any` (OR logic) or `all` (AND logic)
  - `watch_status`: Filter by watch status - `watched`, `unwatched`, or `all`
- Note: Authenticated users only see videos from their subscribed channels
- Example: `/api/videos?tags=Tech,Tutorial&tag_mode=any&watch_status=unwatched`

```http
GET /api/videos/{uuid}/
```

Get details for a specific video

```http
GET /api/videos/watched/
```

List all watched videos for authenticated user (requires authentication)

```http
GET /api/videos/unwatched/
```

List all unwatched videos for authenticated user (requires authentication)

```http
PUT /api/videos/{uuid}/watch/
```

Update watch status and notes for a video (requires authentication)

- Request Body:
  ```json
  {
    "is_watched": true,
    "notes": "Optional notes about the video"
  }
  ```

### Channels

```http
GET /api/channels/
```

List all channels with pagination and filtering options.

- Query Parameters:
  - `search`: Search in title and description
  - `ordering`: Sort by title, created_at
  - `channel_id`: Filter by YouTube channel ID

```http
GET /api/channels/{uuid}/
```

Get channel details including video statistics

```http
GET /api/channels/{uuid}/videos/
```

List all videos from a specific channel

```http
GET /api/channels/{uuid}/stats/
```

Get channel statistics including:

- Total videos count
- Watched videos count (user-specific if authenticated)
- Unwatched videos count (user-specific if authenticated)
- Channel subscription status (if authenticated)

```http
POST /api/channels/fetch-from-youtube/
```

Import a channel and all its videos from YouTube

- Request Body:
  ```json
  {
    "channel_id": "UC..." // YouTube channel ID
  }
  ```

## Getting Started

### Building the Project

The project uses a test-driven build process. To build the project:

```bash
# Using Python (works on all platforms)
python build.py

# Or using the shell script (Unix/Linux/WSL)
./build.sh
```

The build will only succeed if all tests pass. This ensures code quality and prevents broken builds.

### Running Tests

#### Frontend Testing

The project includes comprehensive frontend testing with Jest and React Testing Library:

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Test files are located in `__tests__` directories alongside components and include:
- Component unit tests for all tag-related components
- Integration tests for video filtering workflows  
- API interaction testing with comprehensive mocking

#### Backend Testing

The backend includes extensive test coverage with Django's testing framework:

```bash
cd backend
python manage.py test
```

Key test suites:
- `users/test_tag_functionality.py` - 653+ lines covering tag models, API endpoints, and filtering logic
- `videos/tests/test_serializer_optimization.py` - Performance tests with query counting
- Model validation, API endpoints, integration testing, and performance regression detection

#### Docker-based Testing

Run all tests:
```bash
docker-compose --profile test up --build backend_test
```

#### Test Debugging

To debug failing tests with step-by-step debugging:

1. **Create VS Code debug configuration** in `.vscode/launch.json`:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Debug Docker Tests",
         "type": "debugpy",
         "request": "attach",
         "connect": {
           "host": "localhost",
           "port": 5679
         },
         "pathMappings": [
           {
             "localRoot": "${workspaceFolder}/backend",
             "remoteRoot": "/app"
           }
         ]
       }
     ]
   }
   ```

2. **Debug specific pytest test:**
   ```bash
   docker-compose --profile test run --rm -p 5679:5679 backend_test python -m debugpy --listen 0.0.0.0:5679 --wait-for-client -m pytest users/test_tag_functionality.py::ChannelTagAPITests::test_create_channel_tag_duplicate_name -v -s
   ```

3. **Debug Django test:**
   ```bash
   docker-compose --profile test run --rm -p 5679:5679 backend_test python -m debugpy --listen 0.0.0.0:5679 --wait-for-client manage.py test users.test_tag_functionality.ChannelTagAPITests.test_create_channel_tag_duplicate_name --verbosity=2
   ```

4. **Attach debugger in VS Code:**
   - Set breakpoints in your test or application code
   - Run the debug command above
   - In VS Code, go to Run and Debug (Ctrl+Shift+D)
   - Select "Debug Docker Tests" and click the green play button
   - The debugger will attach and stop at your breakpoints

The `--wait-for-client` flag pauses execution until you attach the debugger, allowing you to set breakpoints and step through failing tests.

### Development Server

Once built, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Configuration

### YouTube API Setup

1. Place your OAuth2 credentials in:

   ```
   backend/config/credentials/client_secret.json
   ```

2. Set environment variables in `backend/.env`:

   ```env
   YOUTUBE_CREDENTIALS_DIR=/app/config/credentials
   YOUTUBE_CLIENT_SECRET_FILE=client_secret.json
   ```

3. First-time authentication for development:

   ```bash
   docker-compose exec -it backend python scripts/docker-youtube-auth.py
   ```

   - Follow the interactive prompts
   - Copy the OAuth URL to your browser
   - Complete the Google authentication
   - Copy the authorization code back to the terminal
   - The token will be saved for future use in the container

## User-Based Architecture

The application now supports multiple users with individual:

- **Channel Subscriptions**: Users can subscribe to specific YouTube channels
- **Watch Status**: Each user has their own watch/unwatched status for videos
- **Notes**: Users can add personal notes to videos
- **Privacy**: Users only see videos from channels they've subscribed to

### Database Models

- **User**: Custom user model with UUID primary key
- **UserChannel**: Many-to-many relationship between users and channels
- **UserVideo**: Tracks user-specific data (watch status, notes, timestamps)
- **Video/Channel**: Core video and channel data (shared across users)

### Authentication Usage

Most API requests require authentication using token headers:

```bash
# Include token in requests
curl -H "Authorization: Token your_token_here" \
  http://localhost:8000/api/videos/
```

### Example API Usage

Register a new user:

```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "myuser",
    "password": "securepassword123",
    "password_confirm": "securepassword123"
  }'
```

Login and get token:

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

Subscribe to a channel:

```bash
curl -X POST http://localhost:8000/api/auth/channels/ \
  -H "Authorization: Token your_token_here" \
  -H "Content-Type: application/json" \
  -d '{"channel": "channel_uuid_here"}'
```

Import a YouTube channel:

```bash
curl -X POST http://localhost:8000/api/channels/fetch-from-youtube/ \
  -H "Content-Type: application/json" \
  -d '{"channel_id": "UC..."}'
```

Mark a video as watched with notes:

```bash
curl -X PUT http://localhost:8000/api/videos/{uuid}/watch/ \
  -H "Authorization: Token your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "is_watched": true,
    "notes": "Great tutorial on Django!"
  }'
```

List user's unwatched videos:

```bash
curl -H "Authorization: Token your_token_here" \
  http://localhost:8000/api/videos/unwatched/
```
