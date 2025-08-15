from typing import Optional, List, Dict, Any
import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from datetime import datetime, timezone
from pathlib import Path
from ..models import Channel, Video

SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']

class YouTubeService:
    def __init__(self):
        self.credentials = None
        self.youtube = None
        self.authenticate()

    def authenticate(self):
        """Authenticate using OAuth 2.0"""
        # Get credential paths from environment variables or use defaults
        base_dir = Path(os.getenv('YOUTUBE_CREDENTIALS_DIR', '/app/config/credentials'))
        client_secret_path = base_dir / os.getenv('YOUTUBE_CLIENT_SECRET_FILE', 'client_secret.json')
        token_path = base_dir / os.getenv('YOUTUBE_TOKEN_FILE', 'token.json')

        # Load existing credentials if they exist
        if token_path.exists():
            self.credentials = Credentials.from_authorized_user_file(str(token_path), SCOPES)

        # If credentials don't exist or are invalid, refresh them
        if not self.credentials or not self.credentials.valid:
            if self.credentials and self.credentials.expired and self.credentials.refresh_token:
                self.credentials.refresh(Request())
            else:
                print(client_secret_path)
                if not client_secret_path.exists():
                    raise ValueError("client_secret.json not found in the project root")

                flow = InstalledAppFlow.from_client_secrets_file(
                    str(client_secret_path), SCOPES)
                self.credentials = flow.run_local_server(port=0)

            # Save the credentials for future use
            with open(token_path, 'w') as token:
                token.write(self.credentials.to_json())

        self.youtube = build('youtube', 'v3', credentials=self.credentials)

    def get_channel_details(self, channel_id: str) -> Optional[Dict[str, Any]]:
        try:
            request = self.youtube.channels().list(
                part="snippet,statistics,contentDetails",
                id=channel_id
            )
            response = request.execute()

            if not response['items']:
                return None

            channel_info = response['items'][0]
            return {
                'channel_id': channel_id,
                'title': channel_info['snippet']['title'],
                'description': channel_info['snippet']['description'],
                'url': f'https://www.youtube.com/channel/{channel_id}',
                'uploads_playlist_id': channel_info['contentDetails']['relatedPlaylists']['uploads']
            }
        except Exception as e:
            print(f"Error fetching channel details: {e}")
            return None

    def get_channel_videos(self, uploads_playlist_id: str) -> List[Dict[str, Any]]:
        videos = []
        next_page_token = None

        while True:
            try:
                # Get playlist items (video IDs)
                playlist_request = self.youtube.playlistItems().list(
                    part="contentDetails",
                    playlistId=uploads_playlist_id,
                    maxResults=50,
                    pageToken=next_page_token
                )
                playlist_response = playlist_request.execute()

                video_ids = [item['contentDetails']['videoId'] 
                           for item in playlist_response['items']]

                # Get detailed video information
                if video_ids:
                    video_request = self.youtube.videos().list(
                        part="snippet,contentDetails,statistics",
                        id=','.join(video_ids)
                    )
                    video_response = video_request.execute()

                    for video in video_response['items']:
                        try:
                            published_at = datetime.strptime(
                                video['snippet']['publishedAt'], 
                                '%Y-%m-%dT%H:%M:%SZ'
                            ).replace(tzinfo=timezone.utc)

                            video_data = {
                                'video_id': video['id'],
                                'title': video['snippet'].get('title'),
                                'description': video['snippet'].get('description'),
                                'published_at': published_at,
                                'view_count': int(video['statistics'].get('viewCount', 0)),
                                'like_count': int(video['statistics'].get('likeCount', 0)),
                                'comment_count': int(video['statistics'].get('commentCount', 0)),
                                'duration': video['contentDetails']['duration'],
                                'thumbnail_path': video['snippet']['thumbnails']['high']['url'],
                                'video_url': f'https://www.youtube.com/watch?v={video["id"]}',
                                'privacy_status': video['status']['privacyStatus'],
                                'category_id': video['snippet'].get('categoryId'),
                                'default_language': video['snippet'].get('defaultLanguage'),
                                'tags': ','.join(video['snippet'].get('tags', [])) if video['snippet'].get('tags') else None
                            }
                            videos.append(video_data)
                        except Exception as e:
                            print(f"Error processing video {video['id']}: {e}")
                            continue

                next_page_token = playlist_response.get('nextPageToken')
                if not next_page_token:
                    break

            except Exception as e:
                print(f"Error fetching videos: {e}")
                break

        return videos

    def fetch_channel(self, channel_id: str) -> Optional[Channel]:
        """Fetch a channel and all its videos from YouTube"""
        # Get channel details
        channel_info = self.get_channel_details(channel_id)
        if not channel_info:
            return None

        # Create or update channel
        channel, _ = Channel.objects.update_or_create(
            channel_id=channel_id,
            defaults={
                'title': channel_info['title'],
                'description': channel_info['description'],
                'url': channel_info['url']
            }
        )

        # Fetch all videos
        videos = self.get_channel_videos(channel_info['uploads_playlist_id'])
        
        # Create or update videos
        for video_data in videos:
            Video.objects.update_or_create(
                video_id=video_data.pop('video_id'),
                defaults={
                    **video_data,
                    'channel': channel
                }
            )

        return channel
