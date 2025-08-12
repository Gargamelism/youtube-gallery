# YouTube Gallery

A Next.js and Django application for managing and viewing YouTube videos with watched/unwatched tracking.

## API Conventions

All API endpoints follow the kebab-case convention:
- Words are separated by hyphens
- All letters are lowercase
- Example: `/api/channels/fetch-from-youtube/`

## API Endpoints

### Videos

```http
GET /api/videos/
```
List all videos with pagination and filtering options.
- Query Parameters:
  - `search`: Search in title and description
  - `ordering`: Sort by title, published_at, view_count, like_count
  - `channel`: Filter by channel UUID
  - `is_watched`: Filter by watch status

```http
GET /api/videos/{uuid}/
```
Get details for a specific video

```http
GET /api/videos/watched/
```
List all watched videos

```http
GET /api/videos/unwatched/
```
List all unwatched videos

```http
POST /api/videos/{uuid}/mark_as_watched/
```
Mark a video as watched

```http
POST /api/videos/{uuid}/mark_as_unwatched/
```
Mark a video as unwatched

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
- Watched videos count
- Unwatched videos count

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

3. First-time authentication:
   - The service will open a browser window for OAuth authentication
   - Log in to your Google account
   - Grant the required permissions
   - The token will be saved for future use

### Example API Usage

Import a YouTube channel:
```bash
curl -X POST http://localhost:8000/api/channels/fetch-from-youtube/ \
  -H "Content-Type: application/json" \
  -d '{"channel_id": "UC..."}'
```

List unwatched videos from a specific channel:
```bash
curl "http://localhost:8000/api/videos/?channel={uuid}&is_watched=false"
```

Get channel statistics:
```bash
curl http://localhost:8000/api/channels/{uuid}/stats/
```
