"""
Mock YouTube API responses for testing channel updating functionality.

This module provides realistic mock responses that mirror the actual YouTube Data API v3
response structures for channels, videos, and error scenarios.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional


class YouTubeAPIMockResponses:
    """Collection of mock YouTube API responses for testing"""

    @staticmethod
    def get_channel_response(
        channel_id: str = "UC_test_channel",
        title: str = "Test Channel",
        description: str = "A test channel description",
        subscriber_count: int = 1000,
        video_count: int = 50,
        view_count: int = 100000,
        custom_url: Optional[str] = None,
        published_at: Optional[str] = None,
        thumbnails: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Generate a mock channel response from YouTube API"""

        if published_at is None:
            published_at = (datetime.utcnow() - timedelta(days=365)).isoformat() + "Z"

        if thumbnails is None:
            thumbnails = {
                "default": {
                    "url": f"https://yt3.ggpht.com/default_{channel_id}=s88-c-k-c0x00ffffff-no-rj",
                    "width": 88,
                    "height": 88,
                },
                "medium": {
                    "url": f"https://yt3.ggpht.com/medium_{channel_id}=s240-c-k-c0x00ffffff-no-rj",
                    "width": 240,
                    "height": 240,
                },
                "high": {
                    "url": f"https://yt3.ggpht.com/high_{channel_id}=s800-c-k-c0x00ffffff-no-rj",
                    "width": 800,
                    "height": 800,
                },
            }

        return {
            "kind": "youtube#channelListResponse",
            "etag": f"mock_etag_{channel_id}",
            "pageInfo": {"totalResults": 1, "resultsPerPage": 1},
            "items": [
                {
                    "kind": "youtube#channel",
                    "etag": f"channel_etag_{channel_id}",
                    "id": channel_id,
                    "snippet": {
                        "title": title,
                        "description": description,
                        "customUrl": custom_url or f"@{title.lower().replace(' ', '')}",
                        "publishedAt": published_at,
                        "thumbnails": thumbnails,
                        "localized": {"title": title, "description": description},
                        "country": "US",
                    },
                    "contentDetails": {
                        "relatedPlaylists": {
                            "likes": "",
                            "uploads": f"UU{channel_id[2:]}",  # Convert UC prefix to UU for uploads playlist
                        }
                    },
                    "statistics": {
                        "viewCount": str(view_count),
                        "subscriberCount": str(subscriber_count),
                        "hiddenSubscriberCount": False,
                        "videoCount": str(video_count),
                    },
                }
            ],
        }

    @staticmethod
    def get_empty_channel_response() -> Dict[str, Any]:
        """Mock response when channel is not found"""
        return {
            "kind": "youtube#channelListResponse",
            "etag": "mock_empty_etag",
            "pageInfo": {"totalResults": 0, "resultsPerPage": 0},
            "items": [],
        }

    @staticmethod
    def get_video_response(
        video_id: str = "test_video_123",
        title: str = "Test Video",
        description: str = "A test video description",
        channel_id: str = "UC_test_channel",
        channel_title: str = "Test Channel",
        published_at: Optional[str] = None,
        duration: str = "PT5M30S",
        view_count: int = 10000,
        like_count: int = 500,
        comment_count: int = 25,
    ) -> Dict[str, Any]:
        """Generate a mock video response from YouTube API"""

        if published_at is None:
            published_at = (datetime.utcnow() - timedelta(days=7)).isoformat() + "Z"

        return {
            "kind": "youtube#videoListResponse",
            "etag": f"video_etag_{video_id}",
            "items": [
                {
                    "kind": "youtube#video",
                    "etag": f"item_etag_{video_id}",
                    "id": video_id,
                    "snippet": {
                        "publishedAt": published_at,
                        "channelId": channel_id,
                        "title": title,
                        "description": description,
                        "thumbnails": {
                            "default": {
                                "url": f"https://i.ytimg.com/vi/{video_id}/default.jpg",
                                "width": 120,
                                "height": 90,
                            },
                            "medium": {
                                "url": f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg",
                                "width": 320,
                                "height": 180,
                            },
                            "high": {
                                "url": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
                                "width": 480,
                                "height": 360,
                            },
                        },
                        "channelTitle": channel_title,
                        "categoryId": "22",
                        "liveBroadcastContent": "none",
                        "localized": {"title": title, "description": description},
                    },
                    "contentDetails": {
                        "duration": duration,
                        "dimension": "2d",
                        "definition": "hd",
                        "caption": "false",
                        "licensedContent": True,
                        "contentRating": {},
                        "projection": "rectangular",
                    },
                    "statistics": {
                        "viewCount": str(view_count),
                        "likeCount": str(like_count),
                        "commentCount": str(comment_count),
                    },
                }
            ],
        }

    @staticmethod
    def get_playlist_items_response(
        video_ids: List[str], playlist_id: str = "UU_test_channel", next_page_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate mock playlist items response for channel uploads"""

        items = []
        for i, video_id in enumerate(video_ids):
            published_at = (datetime.utcnow() - timedelta(days=i)).isoformat() + "Z"
            items.append(
                {
                    "kind": "youtube#playlistItem",
                    "etag": f"playlist_item_etag_{video_id}",
                    "id": f"playlist_item_{i}",
                    "contentDetails": {
                        "videoId": video_id,
                        "startAt": "PT0S",
                        "endAt": "PT0S",
                        "note": "",
                        "videoPublishedAt": published_at,
                    },
                }
            )

        response = {
            "kind": "youtube#playlistItemListResponse",
            "etag": f"playlist_etag_{playlist_id}",
            "pageInfo": {"totalResults": len(video_ids), "resultsPerPage": min(50, len(video_ids))},
            "items": items,
        }

        if next_page_token:
            response["nextPageToken"] = next_page_token

        return response

    @staticmethod
    def get_quota_exceeded_error() -> Dict[str, Any]:
        """Mock YouTube API quota exceeded error response"""
        return {
            "error": {
                "code": 403,
                "message": "The request cannot be completed because you have exceeded your quota.",
                "errors": [
                    {
                        "domain": "youtube.quota",
                        "reason": "quotaExceeded",
                        "message": "The request cannot be completed because you have exceeded your quota.",
                    }
                ],
            }
        }

    @staticmethod
    def get_channel_not_found_error() -> Dict[str, Any]:
        """Mock YouTube API channel not found error response"""
        return {
            "error": {
                "code": 404,
                "message": "The channel was not found.",
                "errors": [
                    {"domain": "youtube.channel", "reason": "channelNotFound", "message": "The channel was not found."}
                ],
            }
        }

    @staticmethod
    def get_forbidden_channel_error() -> Dict[str, Any]:
        """Mock YouTube API forbidden/private channel error response"""
        return {
            "error": {
                "code": 403,
                "message": "The channel is private or no longer available.",
                "errors": [
                    {
                        "domain": "youtube.channel",
                        "reason": "forbidden",
                        "message": "The channel is private or no longer available.",
                    }
                ],
            }
        }

    @staticmethod
    def get_api_key_invalid_error() -> Dict[str, Any]:
        """Mock YouTube API invalid key error response"""
        return {
            "error": {
                "code": 400,
                "message": "API key not valid. Please pass a valid API key.",
                "errors": [
                    {
                        "domain": "global",
                        "reason": "badRequest",
                        "message": "API key not valid. Please pass a valid API key.",
                    }
                ],
            }
        }

    @staticmethod
    def get_search_response(
        channel_id: str = "UC_search_result",
        channel_title: str = "Search Result Channel",
        description: str = "A channel found through search",
    ) -> Dict[str, Any]:
        """Mock YouTube API search response for channels"""
        return {
            "kind": "youtube#searchListResponse",
            "etag": "search_etag",
            "nextPageToken": "next_token_123",
            "regionCode": "US",
            "pageInfo": {"totalResults": 1000000, "resultsPerPage": 1},
            "items": [
                {
                    "kind": "youtube#searchResult",
                    "etag": "search_item_etag",
                    "id": {"kind": "youtube#channel", "channelId": channel_id},
                    "snippet": {
                        "publishedAt": (datetime.utcnow() - timedelta(days=365)).isoformat() + "Z",
                        "channelId": channel_id,
                        "title": channel_title,
                        "description": description,
                        "thumbnails": {
                            "default": {"url": f"https://yt3.ggpht.com/search_{channel_id}=s88-c-k-c0x00ffffff-no-rj"}
                        },
                        "channelTitle": channel_title,
                        "liveBroadcastContent": "none",
                        "publishTime": (datetime.utcnow() - timedelta(days=365)).isoformat() + "Z",
                    },
                }
            ],
        }


class MockYouTubeServiceFixtures:
    """Pre-configured fixtures for common test scenarios"""

    @staticmethod
    def create_active_channel_data() -> Dict[str, Any]:
        """Data for an active, regularly updated channel"""
        return YouTubeAPIMockResponses.get_channel_response(
            channel_id="UC_active_channel",
            title="Active Tech Channel",
            description="A very active technology channel with daily uploads",
            subscriber_count=150000,
            video_count=500,
            view_count=5000000,
        )

    @staticmethod
    def create_inactive_channel_data() -> Dict[str, Any]:
        """Data for an inactive channel with old content"""
        return YouTubeAPIMockResponses.get_channel_response(
            channel_id="UC_inactive_channel",
            title="Inactive Gaming Channel",
            description="A gaming channel that hasn't uploaded in months",
            subscriber_count=25000,
            video_count=50,
            view_count=800000,
            published_at=(datetime.utcnow() - timedelta(days=800)).isoformat() + "Z",
        )

    @staticmethod
    def create_small_channel_data() -> Dict[str, Any]:
        """Data for a small, growing channel"""
        return YouTubeAPIMockResponses.get_channel_response(
            channel_id="UC_small_channel",
            title="Small Tutorial Channel",
            description="Educational content for beginners",
            subscriber_count=1500,
            video_count=25,
            view_count=50000,
        )

    @staticmethod
    def create_deleted_channel_response() -> Dict[str, Any]:
        """Response for a deleted/terminated channel"""
        return YouTubeAPIMockResponses.get_channel_not_found_error()

    @staticmethod
    def create_private_channel_response() -> Dict[str, Any]:
        """Response for a private/restricted channel"""
        return YouTubeAPIMockResponses.get_forbidden_channel_error()
