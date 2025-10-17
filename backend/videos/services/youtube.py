import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict, Union, cast

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow  # type: ignore
from googleapiclient.discovery import build  # type: ignore

from videos.models import Channel, Video
from videos.services.quota_tracker import QuotaTracker
from videos.utils.dateutils import timezone_aware_datetime
from youtube_gallery.utils.http import http

# Type aliases for better type checking
YouTubeResource = Any  # Type stub for Resource isn't available

YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube.readonly"]
MAX_SEARCH_RESULTS = 50  # Max results for searching channel by handle


class CredentialsData(TypedDict, total=False):
    token: str
    refresh_token: str
    token_uri: str
    expiry: str
    scopes: List[str]


class YouTubeClientConfig(TypedDict):
    client_id: str
    client_secret: str
    token_uri: str


class GoogleCredentialsData(TypedDict, total=False):
    access_token: str
    expires_in: int
    refresh_token: str
    scope: str
    token_type: str
    refresh_token_expires_in: int


class YouTubeAuthenticationError(Exception):
    """Custom exception for YouTube authentication errors that require user intervention"""

    def __init__(self, message, auth_url=None, verification_url=None, user_code=None):
        super().__init__(message)
        self.auth_url = auth_url
        self.verification_url = verification_url
        self.user_code = user_code


class YouTubeService:
    def __init__(
        self,
        credentials: Optional[Credentials] = None,
        api_key: Optional[str] = None,
        redirect_uri: Optional[str] = None,
        quota_tracker: Optional[QuotaTracker] = None,
    ) -> None:
        self.credentials = credentials
        self.api_key = api_key
        self.quota_tracker = quota_tracker or QuotaTracker()

        # Initialize YouTube API client
        if credentials:
            # OAuth authentication
            self.youtube: YouTubeResource = cast(YouTubeResource, build("youtube", "v3", credentials=credentials))
            self.auth_type = "oauth"
        elif api_key:
            # API key authentication
            self.youtube: YouTubeResource = cast(YouTubeResource, build("youtube", "v3", developerKey=api_key))
            self.auth_type = "api_key"
        else:
            # Neither provided - require OAuth
            auth_url = YouTubeService._generate_oauth_url(redirect_uri)
            raise YouTubeAuthenticationError("YouTube credentials are required", auth_url=auth_url)

    @staticmethod
    def get_client_config() -> YouTubeClientConfig:
        """Get YouTube OAuth client configuration from the client secret file"""
        base_dir = Path(os.getenv("YOUTUBE_CREDENTIALS_DIR", "/app/config/credentials"))
        client_secret_path = base_dir / os.getenv("YOUTUBE_CLIENT_SECRET_FILE", "client_secret.json")

        if not client_secret_path.exists():
            raise Exception("Configuration error: Client secret file not found")

        with open(client_secret_path) as secrets_file:
            client_config = json.load(secrets_file)
            client_info = client_config.get("web")

        return client_info

    @staticmethod
    def _generate_oauth_url(redirect_uri: Optional[str] = None, state: Optional[str] = None) -> Optional[str]:
        """Generate OAuth 2.0 authorization URL"""
        try:
            base_dir = Path(os.getenv("YOUTUBE_CREDENTIALS_DIR", "/app/config/credentials"))
            client_secret_path = base_dir / os.getenv("YOUTUBE_CLIENT_SECRET_FILE", "client_secret.json")

            if not client_secret_path.exists():
                return None

            flow = Flow.from_client_secrets_file(str(client_secret_path), scopes=YOUTUBE_SCOPES)
            # Ensure redirect_uri is always provided to maintain consistency
            if not redirect_uri:
                raise Exception("redirect_uri is required for OAuth flow")
            flow.redirect_uri = redirect_uri

            auth_params = {"access_type": "offline", "include_granted_scopes": "true", "prompt": "consent"}
            if state:
                auth_params["state"] = state

            authorization_url, _ = flow.authorization_url(**auth_params)

            return authorization_url
        except Exception as e:
            print(f"OAuth URL generation failed: {e}")
            return None

    @classmethod
    def handle_oauth_callback(cls, authorization_code: str, redirect_uri: str) -> Dict[str, Any]:
        """Handle OAuth callback and return credentials"""
        client_info = cls.get_client_config()

        token_uri = client_info.get("token_uri")
        data = {
            "code": authorization_code,
            "client_id": client_info.get("client_id"),
            "client_secret": client_info.get("client_secret"),
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
        try:
            response = http.post(url=token_uri, data=data)
            response.raise_for_status()
            token_data = response.json()
        except Exception as e:
            raise YouTubeAuthenticationError(f"Token exchange failed: {e}")

        return token_data

    @classmethod
    def create_credentials(cls, credentials_data: Union[str, CredentialsData]) -> Credentials:
        """Factory method to create Google OAuth2 Credentials object from session data"""
        client_config = cls.get_client_config()

        if isinstance(credentials_data, str):
            credentials_info = json.loads(credentials_data)
        else:
            credentials_info = credentials_data

        expiry = None
        if credentials_info.get("expiry"):
            expiry = datetime.fromisoformat(credentials_info["expiry"])

        return Credentials(
            token=credentials_info.get("token"),
            refresh_token=credentials_info.get("refresh_token"),
            token_uri=credentials_info.get("token_uri"),
            client_id=client_config.get("client_id"),
            client_secret=client_config.get("client_secret"),
            scopes=credentials_info.get("scopes", YOUTUBE_SCOPES),
            expiry=expiry,
        )

    def _get_channels_by_ids(self, channel_id: str) -> Optional[Dict[str, Any]]:
        """Get channel details using channel ID"""
        if not self.quota_tracker.can_make_request("channels.list"):
            raise Exception("Insufficient quota for channels.list API call")

        request = self.youtube.channels().list(part="snippet,statistics,contentDetails", id=channel_id)
        response = request.execute()
        self.quota_tracker.record_usage("channels.list")

        if not response["items"]:
            return None

        return response["items"]

    def _get_channel_by_handle(self, handle: str) -> Optional[Dict[str, Any]]:
        """Get channel details using username (without @ symbol)"""
        if not self.quota_tracker.can_make_request("channels.list"):
            raise Exception("Insufficient quota for channels.list API call")

        request = self.youtube.channels().list(part="snippet,statistics,contentDetails", forUsername=handle)
        response = request.execute()
        self.quota_tracker.record_usage("channels.list")

        if response["pageInfo"]["totalResults"] == 0:
            return None

        return response["items"][0]

    def _search_channel_by_handle(self, handle: str) -> Optional[Dict[str, Any]]:
        """Search for channel ID using handle via search API"""
        if not self.quota_tracker.can_make_request("search.list"):
            raise Exception("Insufficient quota for search.list API call")

        stripped_handle = handle.lstrip("@")

        request = self.youtube.search().list(
            part="snippet", q=stripped_handle, type="channel", maxResults=MAX_SEARCH_RESULTS
        )
        response = request.execute()
        self.quota_tracker.record_usage("search.list")
        if not response["items"]:
            return None

        desired_channel = None
        desired_channel = self._find_channel_by_handle(handle, response["items"])
        if desired_channel:
            return desired_channel

        while "nextPageToken" in response and not desired_channel:
            if not self.quota_tracker.can_make_request("search.list"):
                raise Exception("Insufficient quota for search.list API call")

            next_page_token = response["nextPageToken"]
            request = self.youtube.search().list(
                part="snippet",
                q=stripped_handle,
                type="channel",
                maxResults=MAX_SEARCH_RESULTS,
                pageToken=next_page_token,
            )
            response = request.execute()
            self.quota_tracker.record_usage("search.list")
            if not response["items"]:
                break

            desired_channel = self._find_channel_by_handle(handle, response["items"])
            if desired_channel:
                return desired_channel

        return None

    def _find_channel_by_handle(self, handle: str, items: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        channel_ids = [item["snippet"]["channelId"] for item in items]
        channels_info = self._get_channels_by_ids(",".join(channel_ids))

        if channels_info is None:
            return None

        for channel in channels_info:
            custom_url = channel["snippet"].get("customUrl")
            if custom_url and custom_url.lower() == handle.lstrip("@").lower():
                return channel

        return None

    def _format_channel_response(self, channel_info: Dict[str, Any]) -> Dict[str, Any]:
        """Format channel API response into standardized structure"""
        channel_id = channel_info["id"]
        return {
            "channel_id": channel_id,
            "title": channel_info["snippet"]["title"],
            "description": channel_info["snippet"]["description"],
            "url": f"https://www.youtube.com/channel/{channel_id}",
            "uploads_playlist_id": channel_info["contentDetails"]["relatedPlaylists"]["uploads"],
        }

    def get_channel_details(self, channel_identifier: str) -> Optional[Dict[str, Any]]:
        """Get channel details by ID or handle (@username)"""
        try:
            if channel_identifier.startswith("@"):
                channel_info = self._get_channel_by_handle(channel_identifier)

                if not channel_info:
                    # Fall back to search API
                    channel_info = self._search_channel_by_handle(channel_identifier)
                    if not channel_info:
                        return None
            else:
                # Handle regular channel ID
                channel_info = self._get_channels_by_ids(channel_identifier)
                if not channel_info:
                    return None
                channel_info = channel_info[0]

            return self._format_channel_response(channel_info)

        except Exception:
            # Error fetching channel details
            return None

    def get_channel_videos(self, uploads_playlist_id: str):
        """Generator that yields pages of video data"""
        next_page_token = None

        while True:
            try:
                if not self.quota_tracker.can_make_request("playlistItems.list"):
                    print("WARNING: Insufficient quota for playlistItems.list API call")
                    break

                playlist_request = self.youtube.playlistItems().list(
                    part="contentDetails",
                    playlistId=uploads_playlist_id,
                    maxResults=50,
                    pageToken=next_page_token,
                )
                playlist_response = playlist_request.execute()
                self.quota_tracker.record_usage("playlistItems.list")

                video_ids = [item["contentDetails"]["videoId"] for item in playlist_response["items"]]

                if video_ids:
                    if not self.quota_tracker.can_make_request("videos.list"):
                        print("WARNING: Insufficient quota for videos.list API call")
                        break

                    video_request = self.youtube.videos().list(
                        part="snippet,contentDetails,statistics", id=",".join(video_ids)
                    )
                    video_response = video_request.execute()
                    self.quota_tracker.record_usage("videos.list")

                    page_videos = []
                    for video in video_response["items"]:
                        video_data = {
                            "video_id": video["id"],
                            "title": video["snippet"].get("title"),
                            "description": video["snippet"].get("description"),
                            "published_at": timezone_aware_datetime(video["snippet"]["publishedAt"]),
                            "view_count": int(video["statistics"].get("viewCount", 0)),
                            "like_count": int(video["statistics"].get("likeCount", 0)),
                            "comment_count": int(video["statistics"].get("commentCount", 0)),
                            "duration": video["contentDetails"]["duration"],
                            "thumbnail_url": video["snippet"]["thumbnails"]["high"]["url"],
                            "video_url": f'https://www.youtube.com/watch?v={video["id"]}',
                            "category_id": video["snippet"].get("categoryId"),
                            "default_language": video["snippet"].get("defaultLanguage"),
                            "tags": (
                                ",".join(video["snippet"].get("tags", [])) if video["snippet"].get("tags") else None
                            ),
                        }
                        page_videos.append(video_data)

                    yield page_videos

                next_page_token = playlist_response.get("nextPageToken")
                if not next_page_token:
                    break

            except Exception:
                break

    def fetch_channel(self, channel_identifier: str) -> Optional[Channel]:
        """Fetch a channel and all its videos from YouTube"""
        channel_info = self.get_channel_details(channel_identifier)
        if not channel_info:
            return None

        channel, _ = Channel.objects.update_or_create(
            channel_id=channel_info["channel_id"],
            defaults={
                "title": channel_info["title"],
                "description": channel_info["description"],
                "url": channel_info["url"],
            },
        )

        videos_generator = self.get_channel_videos(channel_info["uploads_playlist_id"])

        for page_videos in videos_generator:
            for video_data in page_videos:
                Video.objects.update_or_create(
                    video_id=video_data.pop("video_id"),
                    defaults={**video_data, "channel": channel},
                )

        return channel

    def import_or_create_channel(self, channel_identifier: str) -> Channel:
        """Import channel from YouTube - fails if channel cannot be verified"""
        existing_channel = Channel.objects.filter(channel_id=channel_identifier).first()
        if existing_channel:
            return existing_channel

        channel = self.fetch_channel(channel_identifier)
        if not channel:
            raise Exception(f"Channel not found on YouTube: {channel_identifier}")
        return channel

    def _create_basic_channel(self, channel_identifier: str) -> Channel:
        """Create basic channel entry without YouTube API"""
        if channel_identifier.startswith("@"):
            title = f"Channel {channel_identifier}"
            url = f"https://youtube.com/{channel_identifier}"
        elif channel_identifier.startswith("UC") and len(channel_identifier) == 24:
            title = f"Channel {channel_identifier[:15]}..."
            url = f"https://youtube.com/channel/{channel_identifier}"
        else:
            title = f"Channel {channel_identifier}"
            url = f"https://youtube.com/channel/{channel_identifier}"

        return Channel.objects.create(
            channel_id=channel_identifier,
            title=title,
            description=f"Imported channel: {channel_identifier}",
            url=url,
        )
