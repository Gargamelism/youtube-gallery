from typing import Optional, List, Dict, Any
import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from datetime import datetime
from pathlib import Path
from videos.models import Channel, Video
from videos.utils.dateutils import timezone_aware_datetime

SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']

class YouTubeAuthenticationError(Exception):
    """Custom exception for YouTube authentication errors that require user intervention"""
    def __init__(self, message, auth_url=None, verification_url=None, user_code=None):
        super().__init__(message)
        self.auth_url = auth_url
        self.verification_url = verification_url
        self.user_code = user_code

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
                if not client_secret_path.exists():
                    raise YouTubeAuthenticationError(
                        "YouTube API credentials not configured", 
                        auth_url="https://console.cloud.google.com/apis/credentials"
                    )
                
                flow = InstalledAppFlow.from_client_secrets_file(
                    str(client_secret_path), SCOPES)
                
                try:
                    self.credentials = flow.run_local_server(port=0)
                except Exception as e:
                    # Always raise authentication error since we can't do browser auth in Docker
                    auth_url, _ = flow.authorization_url(prompt='consent')
                    raise YouTubeAuthenticationError(
                        "Browser authentication failed. Manual authentication required.",
                        auth_url=auth_url
                    )

            # Save the credentials for future use
            with open(token_path, 'w') as token:
                token.write(self.credentials.to_json())

        self.youtube = build('youtube', 'v3', credentials=self.credentials)

    def _get_channel_by_id(self, channel_id: str) -> Optional[Dict[str, Any]]:
        """Get channel details using channel ID"""
        request = self.youtube.channels().list(
            part="snippet,statistics,contentDetails",
            id=channel_id
        )
        response = request.execute()
        
        if not response['items']:
            return None
            
        return response['items'][0]

    def _get_channel_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get channel details using username (without @ symbol)"""
        request = self.youtube.channels().list(
            part="snippet,statistics,contentDetails",
            forUsername=username
        )
        response = request.execute()

        if response['pageInfo']['totalResults'] == 0:
            return None
            
        return response['items'][0]

    def _search_channel_by_handle(self, handle: str) -> Optional[str]:
        """Search for channel ID using handle via search API"""
        request = self.youtube.search().list(
            part="snippet",
            q=handle,
            type="channel",
            maxResults=1
        )
        response = request.execute()

        if not response['items']:
            return None
            
        return response['items'][0]['snippet']['channelId']

    def _format_channel_response(self, channel_info: Dict[str, Any]) -> Dict[str, Any]:
        """Format channel API response into standardized structure"""
        channel_id = channel_info['id']
        return {
            'channel_id': channel_id,
            'title': channel_info['snippet']['title'],
            'description': channel_info['snippet']['description'],
            'url': f'https://www.youtube.com/channel/{channel_id}',
            'uploads_playlist_id': channel_info['contentDetails']['relatedPlaylists']['uploads']
        }
    

    def get_channel_details(self, channel_identifier: str) -> Optional[Dict[str, Any]]:
        """Get channel details by ID or handle (@username)"""
        try:
            if channel_identifier.startswith('@'):
                # Handle channel username/handle
                username = channel_identifier[1:]  # Remove @ symbol
                
                # Try direct username lookup first
                channel_info = self._get_channel_by_username(username)

                if not channel_info:
                    # Fall back to search API
                    channel_id = self._search_channel_by_handle(channel_identifier)
                    if not channel_id:
                        return None
                    
                    channel_info = self._get_channel_by_id(channel_id)
                    if not channel_info:
                        return None
            else:
                # Handle regular channel ID
                channel_info = self._get_channel_by_id(channel_identifier)
                if not channel_info:
                    return None

            return self._format_channel_response(channel_info)
            
        except Exception as e:
            # Error fetching channel details
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
                        video_data = {
                            'video_id': video['id'],
                            'title': video['snippet'].get('title'),
                            'description': video['snippet'].get('description'),
                            'published_at': timezone_aware_datetime(video['snippet']['publishedAt']),
                            'view_count': int(video['statistics'].get('viewCount', 0)),
                            'like_count': int(video['statistics'].get('likeCount', 0)),
                            'comment_count': int(video['statistics'].get('commentCount', 0)),
                            'duration': video['contentDetails']['duration'],
                            'thumbnail_url': video['snippet']['thumbnails']['high']['url'],
                            'video_url': f'https://www.youtube.com/watch?v={video["id"]}',
                            'category_id': video['snippet'].get('categoryId'),
                            'default_language': video['snippet'].get('defaultLanguage'),
                            'tags': ','.join(video['snippet'].get('tags', [])) if video['snippet'].get('tags') else None
                        }
                        videos.append(video_data)

                next_page_token = playlist_response.get('nextPageToken')
                if not next_page_token:
                    break

            except Exception as e:
                # Error fetching videos
                break

        return videos

    def fetch_channel(self, channel_identifier: str) -> Optional[Channel]:
        """Fetch a channel and all its videos from YouTube"""
        channel_info = self.get_channel_details(channel_identifier)
        if not channel_info:
            return None

        channel, _ = Channel.objects.update_or_create(
            channel_id=channel_info['channel_id'],
            defaults={
                'title': channel_info['title'],
                'description': channel_info['description'],
                'url': channel_info['url']
            }
        )

        videos = self.get_channel_videos(channel_info['uploads_playlist_id'])
        
        for video_data in videos:
            Video.objects.update_or_create(
                video_id=video_data.pop('video_id'),
                defaults={
                    **video_data,
                    'channel': channel
                }
            )

        return channel

    def import_or_create_channel(self, channel_identifier: str) -> Channel:
        """Import channel from YouTube or create basic entry if API fails"""
        existing_channel = Channel.objects.filter(channel_id=channel_identifier).first()
        if existing_channel:
            return existing_channel

        try:
            channel = self.fetch_channel(channel_identifier)
            if channel:
                return channel
        except YouTubeAuthenticationError:
            raise
        except Exception as e:
            # YouTube API error - fall through to create basic channel
            pass

        return self._create_basic_channel(channel_identifier)

    def _create_basic_channel(self, channel_identifier: str) -> Channel:
        """Create basic channel entry without YouTube API"""
        if channel_identifier.startswith('@'):
            title = f"Channel {channel_identifier}"
            url = f"https://youtube.com/{channel_identifier}"
        elif channel_identifier.startswith('UC') and len(channel_identifier) == 24:
            title = f"Channel {channel_identifier[:15]}..."
            url = f"https://youtube.com/channel/{channel_identifier}"
        else:
            title = f"Channel {channel_identifier}"
            url = f"https://youtube.com/channel/{channel_identifier}"
        
        return Channel.objects.create(
            channel_id=channel_identifier,
            title=title,
            description=f"Imported channel: {channel_identifier}",
            url=url
        )
