# YouTube Gallery

A Next.js and Django application for managing and viewing YouTube videos with user-based channel subscriptions and watch tracking.

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
- Note: Authenticated users only see videos from their subscribed channels

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
   YOUTUBE_TOKEN_FILE=token.json
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
