import uuid
from django.db import IntegrityError
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from unittest.mock import patch
from videos.models import Channel, Video
from videos.services.search import VideoSearchService
from videos.validators import TagMode, WatchStatus
from ..models import ChannelTag, UserChannel, UserChannelTag, UserVideo

User = get_user_model()


class ChannelTagModelTests(TestCase):
    """Unit tests for ChannelTag model"""

    @classmethod
    def setUpTestData(cls):
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )  # nosec B105 - test-only password
        cls.user2 = User.objects.create_user(
            username="testuser2", email="test2@example.com", password="testpass123"
        )  # nosec B105 - test-only password

    def test_channel_tag_creation(self):
        """Test creating a channel tag"""
        tag = ChannelTag.objects.create(
            user=self.user,
            name="Tech",
            color="#3B82F6",
            description="Technology channels",
        )
        self.assertEqual(tag.name, "Tech")
        self.assertEqual(tag.color, "#3B82F6")
        self.assertEqual(tag.user, self.user)

    def test_channel_tag_string_representation(self):
        """Test string representation of ChannelTag"""
        tag = ChannelTag.objects.create(user=self.user, name="Tech")
        self.assertEqual(str(tag), "Tech")

    def test_channel_tag_unique_constraint(self):
        """Test that tag names must be unique per user"""
        ChannelTag.objects.create(user=self.user, name="Tech")

        with self.assertRaises(IntegrityError):
            ChannelTag.objects.create(user=self.user, name="Tech")

    def test_different_users_can_have_same_tag_name(self):
        """Test that different users can have tags with the same name"""
        tag1 = ChannelTag.objects.create(user=self.user, name="Tech")
        tag2 = ChannelTag.objects.create(user=self.user2, name="Tech")

        self.assertNotEqual(tag1.id, tag2.id)
        self.assertEqual(tag1.name, tag2.name)

    def test_channel_tag_default_color(self):
        """Test that channel tag has default color"""
        tag = ChannelTag.objects.create(user=self.user, name="Tech")
        self.assertEqual(tag.color, "#3B82F6")

    def test_channel_tag_ordering(self):
        """Test that channel tags are ordered by name"""
        ChannelTag.objects.create(user=self.user, name="Zebra")
        ChannelTag.objects.create(user=self.user, name="Alpha")

        tags = list(ChannelTag.objects.filter(user=self.user))
        self.assertEqual(tags[0].name, "Alpha")
        self.assertEqual(tags[1].name, "Zebra")


class UserChannelTagModelTests(TestCase):
    """Unit tests for UserChannelTag model"""

    @classmethod
    def setUpTestData(cls):
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )  # nosec B105 - test-only password
        cls.channel = Channel.objects.create(channel_id="UC123456", title="Test Channel")
        cls.user_channel = UserChannel.objects.create(user=cls.user, channel=cls.channel)
        cls.tag = ChannelTag.objects.create(user=cls.user, name="Tech")

    def test_user_channel_tag_creation(self):
        """Test creating a user channel tag assignment"""
        assignment = UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag)
        self.assertEqual(assignment.user_channel, self.user_channel)
        self.assertEqual(assignment.tag, self.tag)

    def test_user_channel_tag_string_representation(self):
        """Test string representation of UserChannelTag"""
        assignment = UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag)
        expected = f"{self.user_channel} -> {self.tag}"
        self.assertEqual(str(assignment), expected)

    def test_user_channel_tag_unique_constraint(self):
        """Test that user channel tag assignments must be unique"""
        UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag)

        with self.assertRaises(IntegrityError):
            UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag)


class ChannelTagAPITests(APITestCase):
    """API tests for channel tag operations"""

    @classmethod
    def setUpTestData(cls):
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )  # nosec B105 - test-only password
        cls.other_user = User.objects.create_user(
            username="otheruser", email="other@example.com", password="testpass123"
        )  # nosec B105 - test-only password

    def setUp(self):
        """Set up per-test authentication"""
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def tearDown(self):
        """Clean up per-test data"""
        Token.objects.filter(user=self.user).delete()
        ChannelTag.objects.filter(user=self.user).delete()

    def test_create_channel_tag(self):
        """Test creating a channel tag via API"""
        data = {
            "name": "Tech",
            "color": "#3B82F6",
            "description": "Technology channels",
        }
        response = self.client.post("/api/auth/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Tech")
        self.assertEqual(response.data["color"], "#3B82F6")
        self.assertEqual(ChannelTag.objects.filter(user=self.user).count(), 1)

    def test_create_channel_tag_without_description(self):
        """Test creating a channel tag without description"""
        data = {"name": "Gaming", "color": "#EF4444"}
        response = self.client.post("/api/auth/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Gaming")
        self.assertIsNone(response.data.get("description"))

    def test_create_channel_tag_duplicate_name(self):
        """Test creating channel tag with duplicate name fails"""
        ChannelTag.objects.create(user=self.user, name="Tech")

        data = {"name": "Tech", "color": "#3B82F6"}
        response = self.client.post("/api/auth/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_channel_tag_invalid_data(self):
        """Test creating channel tag with invalid data"""
        data = {"color": "#3B82F6"}  # Missing name
        response = self.client.post("/api/auth/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_list_channel_tags(self):
        """Test listing user's channel tags"""
        ChannelTag.objects.create(user=self.user, name="Tech")
        ChannelTag.objects.create(user=self.user, name="Gaming")

        # Create tag for other user (should not appear in results)
        ChannelTag.objects.create(user=self.other_user, name="Music")

        response = self.client.get("/api/auth/tags")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 2)
        tag_names = [tag["name"] for tag in response.data.get("results")]
        self.assertIn("Tech", tag_names)
        self.assertIn("Gaming", tag_names)
        self.assertNotIn("Music", tag_names)

    def test_list_channel_tags_empty(self):
        """Test listing channel tags when user has none"""
        response = self.client.get("/api/auth/tags")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 0)

    def test_retrieve_channel_tag(self):
        """Test retrieving a specific channel tag"""
        tag = ChannelTag.objects.create(user=self.user, name="Tech")

        response = self.client.get(f"/api/auth/tags/{tag.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Tech")

    def test_update_channel_tag(self):
        """Test updating a channel tag"""
        tag = ChannelTag.objects.create(user=self.user, name="Tech")

        data = {
            "name": "Technology",
            "color": "#10B981",
            "description": "Updated description",
        }
        response = self.client.put(f"/api/auth/tags/{tag.id}", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Technology")
        self.assertEqual(response.data["color"], "#10B981")

        # Verify database was updated
        tag.refresh_from_db()
        self.assertEqual(tag.name, "Technology")

    def test_partial_update_channel_tag(self):
        """Test partially updating a channel tag"""
        tag = ChannelTag.objects.create(user=self.user, name="Tech", color="#3B82F6")

        data = {"name": "Technology"}
        response = self.client.patch(f"/api/auth/tags/{tag.id}", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Technology")
        self.assertEqual(response.data["color"], "#3B82F6")  # Unchanged

    def test_delete_channel_tag(self):
        """Test deleting a channel tag"""
        tag = ChannelTag.objects.create(user=self.user, name="Tech")

        response = self.client.delete(f"/api/auth/tags/{tag.id}")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ChannelTag.objects.filter(user=self.user).count(), 0)

    def test_user_cannot_access_other_users_tags(self):
        """Test that users cannot access other users' tags"""
        tag = ChannelTag.objects.create(user=self.other_user, name="Music")

        test_cases = [
            ("get", None),
            ("put", {"name": "Rock"}),
            ("delete", None),
        ]

        for method, data in test_cases:
            with self.subTest(method=method, data=data):
                client_method = getattr(self.client, method)
                if data:
                    response = client_method(f"/api/auth/tags/{tag.id}", data, format="json")
                else:
                    response = client_method(f"/api/auth/tags/{tag.id}")

                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated requests are denied"""
        self.client.credentials()  # Remove authentication

        response = self.client.get("/api/auth/tags")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TagAssignmentAPITests(APITestCase):
    """API tests for tag assignment to channels"""

    @classmethod
    def setUpTestData(cls):
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )  # nosec B105 - test-only password
        cls.other_user = User.objects.create_user(
            username="otheruser", email="other@example.com", password="testpass123"
        )  # nosec B105 - test-only password

        cls.channel = Channel.objects.create(channel_id="UC123456", title="Test Channel")
        cls.user_channel = UserChannel.objects.create(user=cls.user, channel=cls.channel)

    def setUp(self):
        """Set up per-test authentication and data"""
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        self.tag1 = ChannelTag.objects.create(user=self.user, name="Tech")
        self.tag2 = ChannelTag.objects.create(user=self.user, name="Gaming")

    def tearDown(self):
        """Clean up per-test data"""
        Token.objects.filter(user=self.user).delete()
        ChannelTag.objects.filter(user=self.user).delete()
        UserChannelTag.objects.filter(user_channel=self.user_channel).delete()

    def test_assign_tags_to_channel(self):
        """Test assigning tags to a channel"""
        data = {"tag_ids": [str(self.tag1.id), str(self.tag2.id)]}

        response = self.client.put(f"/api/auth/channels/{self.user_channel.id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(UserChannelTag.objects.filter(user_channel=self.user_channel).count(), 2)

    def test_assign_single_tag_to_channel(self):
        """Test assigning single tag to a channel"""
        data = {"tag_ids": [str(self.tag1.id)]}

        response = self.client.put(f"/api/auth/channels/{self.user_channel.id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(UserChannelTag.objects.filter(user_channel=self.user_channel).count(), 1)

    def test_assign_empty_tags_to_channel(self):
        """Test assigning empty tag list to channel (removes all tags)"""
        # First assign some tags
        UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag1)
        self.assertEqual(UserChannelTag.objects.filter(user_channel=self.user_channel).count(), 1)

        data = {"tag_ids": []}

        response = self.client.put(f"/api/auth/channels/{self.user_channel.id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(UserChannelTag.objects.filter(user_channel=self.user_channel).count(), 0)

    def test_get_channel_tags(self):
        """Test getting tags assigned to a channel"""
        UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag1)
        UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag2)

        response = self.client.get(f"/api/auth/channels/{self.user_channel.id}/tags")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        tag_names = [tag["name"] for tag in response.data]
        self.assertIn("Tech", tag_names)
        self.assertIn("Gaming", tag_names)

    def test_get_channel_tags_empty(self):
        """Test getting tags for channel with no tags assigned"""
        response = self.client.get(f"/api/auth/channels/{self.user_channel.id}/tags")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_assign_invalid_tag_ids_format(self):
        """Test assigning invalid tag ID format returns error"""
        data = {"tag_ids": ["invalid-uuid-123"]}

        response = self.client.put(f"/api/auth/channels/{self.user_channel.id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid UUID format", str(response.data))

    def test_assign_nonexistent_tag_ids(self):
        """Test assigning non-existent tag IDs returns error"""
        fake_uuid = str(uuid.uuid4())
        data = {"tag_ids": [fake_uuid]}

        response = self.client.put(f"/api/auth/channels/{self.user_channel.id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid tag IDs not owned by user", str(response.data))

    def test_assign_other_users_tags(self):
        """Test that users cannot assign other users' tags"""
        other_tag = ChannelTag.objects.create(user=self.other_user, name="Music")

        data = {"tag_ids": [str(other_tag.id)]}

        response = self.client.put(f"/api/auth/channels/{self.user_channel.id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid tag IDs not owned by user", str(response.data))

    def test_replace_existing_tag_assignments(self):
        """Test that new tag assignments replace existing ones"""
        # Initially assign tag1
        UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag1)
        self.assertEqual(UserChannelTag.objects.filter(user_channel=self.user_channel).count(), 1)

        # Assign tag2 (should replace tag1)
        data = {"tag_ids": [str(self.tag2.id)]}

        response = self.client.put(f"/api/auth/channels/{self.user_channel.id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(UserChannelTag.objects.filter(user_channel=self.user_channel).count(), 1)

        # Verify only tag2 is assigned
        remaining_assignment = UserChannelTag.objects.filter(user_channel=self.user_channel).first()
        self.assertEqual(remaining_assignment.tag, self.tag2)

    def test_assign_tags_to_nonexistent_channel(self):
        """Test assigning tags to non-existent channel returns 404"""
        fake_channel_id = uuid.uuid4()

        data = {"tag_ids": [str(self.tag1.id)]}

        response = self.client.put(f"/api/auth/channels/{fake_channel_id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class VideoTagFilteringAPITests(APITestCase):
    """API tests for video filtering by tags"""

    @classmethod
    def setUpTestData(cls):
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )  # nosec B105 - test-only password

        # Create channels
        cls.tech_channel = Channel.objects.create(channel_id="UC_TECH", title="Tech Channel")
        cls.gaming_channel = Channel.objects.create(channel_id="UC_GAMING", title="Gaming Channel")
        cls.mixed_channel = Channel.objects.create(channel_id="UC_MIXED", title="Mixed Channel")

        # Create user channel subscriptions
        cls.user_tech_channel = UserChannel.objects.create(user=cls.user, channel=cls.tech_channel)
        cls.user_gaming_channel = UserChannel.objects.create(user=cls.user, channel=cls.gaming_channel)
        cls.user_mixed_channel = UserChannel.objects.create(user=cls.user, channel=cls.mixed_channel)

        # Create videos
        cls.tech_video = Video.objects.create(channel=cls.tech_channel, video_id="tech_video_1", title="Tech Tutorial")
        cls.gaming_video = Video.objects.create(
            channel=cls.gaming_channel, video_id="gaming_video_1", title="Gaming Review"
        )
        cls.mixed_video = Video.objects.create(
            channel=cls.mixed_channel,
            video_id="mixed_video_1",
            title="Tech Gaming Setup",
        )

    def setUp(self):
        """Set up per-test authentication and tags"""
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        # Create tags
        self.tech_tag = ChannelTag.objects.create(user=self.user, name="Tech")
        self.gaming_tag = ChannelTag.objects.create(user=self.user, name="Gaming")
        self.tutorial_tag = ChannelTag.objects.create(user=self.user, name="Tutorial")

        # Assign tags to channels
        UserChannelTag.objects.create(user_channel=self.user_tech_channel, tag=self.tech_tag)
        UserChannelTag.objects.create(user_channel=self.user_tech_channel, tag=self.tutorial_tag)
        UserChannelTag.objects.create(user_channel=self.user_gaming_channel, tag=self.gaming_tag)
        UserChannelTag.objects.create(user_channel=self.user_mixed_channel, tag=self.tech_tag)
        UserChannelTag.objects.create(user_channel=self.user_mixed_channel, tag=self.gaming_tag)

    def tearDown(self):
        """Clean up per-test data"""
        Token.objects.filter(user=self.user).delete()
        ChannelTag.objects.filter(user=self.user).delete()
        UserChannelTag.objects.filter(user_channel__user=self.user).delete()
        UserVideo.objects.filter(user=self.user).delete()

    def test_filter_videos_by_single_tag_any_mode(self):
        """Test filtering videos by single tag in 'any' mode"""
        response = self.client.get("/api/videos?tags=Tech&tag_mode=any")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]

        # Should include videos from tech_channel and mixed_channel (both have Tech tag)
        self.assertIn("tech_video_1", video_ids)
        self.assertIn("mixed_video_1", video_ids)
        self.assertNotIn("gaming_video_1", video_ids)

    def test_filter_videos_by_multiple_tags_any_mode(self):
        """Test filtering videos by multiple tags in 'any' mode"""
        response = self.client.get("/api/videos?tags=Tech,Gaming&tag_mode=any")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]

        # Should include all videos (all channels have at least one of the tags)
        self.assertIn("tech_video_1", video_ids)
        self.assertIn("gaming_video_1", video_ids)
        self.assertIn("mixed_video_1", video_ids)

    def test_filter_videos_by_multiple_tags_all_mode(self):
        """Test filtering videos by multiple tags in 'all' mode"""
        response = self.client.get("/api/videos?tags=Tech,Gaming&tag_mode=all")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]

        # Should only include videos from mixed_channel (has both Tech and Gaming tags)
        self.assertNotIn("tech_video_1", video_ids)
        self.assertNotIn("gaming_video_1", video_ids)
        self.assertIn("mixed_video_1", video_ids)

    def test_filter_videos_with_watch_status_and_tags(self):
        """Test combining tag filtering with watch status filtering"""
        # Mark gaming video as watched
        UserVideo.objects.create(user=self.user, video=self.gaming_video, is_watched=True)

        response = self.client.get("/api/videos?tags=Gaming&watch_status=watched")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]

        # Should only include watched gaming videos
        self.assertIn("gaming_video_1", video_ids)
        self.assertNotIn("tech_video_1", video_ids)
        self.assertNotIn("mixed_video_1", video_ids)  # mixed_video has Gaming tag but is not watched

    def test_filter_videos_by_nonexistent_tag(self):
        """Test filtering by non-existent tag returns validation error"""
        response = self.client.get("/api/videos?tags=NonExistent&tag_mode=any")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid tags not owned by user", str(response.data))

    def test_filter_videos_watched_action_with_tags(self):
        """Test watched videos endpoint with tag filtering"""
        # Mark some videos as watched
        UserVideo.objects.create(user=self.user, video=self.tech_video, is_watched=True)
        UserVideo.objects.create(user=self.user, video=self.mixed_video, is_watched=True)

        response = self.client.get("/api/videos/watched?tags=Tech")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]

        # Should include watched videos with Tech tag
        self.assertIn("tech_video_1", video_ids)
        self.assertIn("mixed_video_1", video_ids)
        self.assertNotIn("gaming_video_1", video_ids)  # Not watched and no Tech tag

    def test_filter_videos_unwatched_action_with_tags(self):
        """Test unwatched videos endpoint with tag filtering"""
        # Mark one video as watched
        UserVideo.objects.create(user=self.user, video=self.tech_video, is_watched=True)

        response = self.client.get("/api/videos/unwatched?tags=Tech")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]

        # Should include unwatched videos with Tech tag
        self.assertNotIn("tech_video_1", video_ids)  # Watched
        self.assertIn("mixed_video_1", video_ids)  # Unwatched with Tech tag
        self.assertNotIn("gaming_video_1", video_ids)  # No Tech tag

    def test_video_list_includes_channel_tags(self):
        """Test that video list includes channel tags in response"""
        response = self.client.get("/api/videos")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Find the tech video in response
        tech_video_data = None
        for video in response.data["results"]:
            if video["video_id"] == "tech_video_1":
                tech_video_data = video
                break

        self.assertIsNotNone(tech_video_data)
        self.assertIn("channel_tags", tech_video_data)

        # Check that channel tags are included
        channel_tags = tech_video_data["channel_tags"]
        tag_names = [tag["name"] for tag in channel_tags]
        self.assertIn("Tech", tag_names)
        self.assertIn("Tutorial", tag_names)

    def test_invalid_tag_mode_parameter(self):
        """Test that invalid tag_mode parameter uses default 'any'"""
        response = self.client.get("/api/videos?tags=Tech&tag_mode=invalid")

        # Should still work, using default 'any' mode
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_empty_tags_parameter(self):
        """Test that empty tags parameter returns all videos"""
        response = self.client.get("/api/videos?tags=&tag_mode=any")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)  # All videos

    def test_video_stats_with_tag_filtering(self):
        """Test video stats endpoint works independently of tag filtering"""
        # Mark some videos as watched
        UserVideo.objects.create(user=self.user, video=self.tech_video, is_watched=True)

        response = self.client.get("/api/videos/stats")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 3)
        self.assertEqual(response.data["watched"], 1)
        self.assertEqual(response.data["unwatched"], 2)

    @patch("videos.services.search.VideoSearchService.search_videos")
    def test_video_search_service_called(self, mock_search_videos):
        """Test that VideoSearchService is called for video filtering"""
        mock_search_videos.return_value = Video.objects.none()

        self.client.get("/api/videos?tags=Tech&tag_mode=any")

        mock_search_videos.assert_called_once()
        args, kwargs = mock_search_videos.call_args
        self.assertEqual(kwargs["tag_names"], ["Tech"])
        self.assertEqual(kwargs["tag_mode"].value, "any")

    def test_pydantic_validation_error_handling(self):
        """Test that Pydantic validation errors are properly handled"""
        # Test with invalid tag_mode enum value that gets through URL params
        response = self.client.get("/api/videos?tags=Tech&tag_mode=invalid_enum")

        # Should handle gracefully by using default
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class SearchServiceIntegrationTests(TestCase):
    """Integration tests for VideoSearchService"""

    @classmethod
    def setUpTestData(cls):
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )  # nosec B105 - test-only password

        # Create test data similar to VideoTagFilteringAPITests
        cls.channel = Channel.objects.create(channel_id="UC_TEST", title="Test Channel")
        cls.user_channel = UserChannel.objects.create(user=cls.user, channel=cls.channel)
        cls.video = Video.objects.create(channel=cls.channel, video_id="test_video_1", title="Test Video")

    def setUp(self):
        """Set up per-test data"""
        self.tag = ChannelTag.objects.create(user=self.user, name="Test")
        UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag)

    def tearDown(self):
        """Clean up per-test data"""
        ChannelTag.objects.filter(user=self.user).delete()
        UserChannelTag.objects.filter(user_channel=self.user_channel).delete()
        UserVideo.objects.filter(user=self.user).delete()

    def test_search_service_query_optimization(self):
        """Test that search service generates efficient queries with tag filtering"""
        service = VideoSearchService(self.user)

        # Optimized query strategy with tag filtering generates 4 queries:
        # 1. Main videos query with channel data and tag filtering (with EXISTS subquery)
        # 2. User videos prefetch (filtered by user)
        # 3. User channels prefetch (filtered by user)
        # 4. User channel tags + channel tags with select_related optimization
        with self.assertNumQueries(4):
            list(
                service.search_videos(
                    tag_names=["Test"],
                    tag_mode=TagMode.ANY,
                    watch_status=WatchStatus.ALL,
                )
            )

    def test_search_service_query_optimization_no_tags(self):
        """Test that search service generates fewer queries without tag filtering"""
        service = VideoSearchService(self.user)

        # Without tag filtering, Django ORM generates fewer queries:
        # 1. Main videos query with channel data
        # 2. User videos prefetch
        # 3. User channels prefetch
        # 4. Channel tags prefetch with select_related
        with self.assertNumQueries(4):
            list(service.search_videos(watch_status=WatchStatus.ALL))

    def test_search_service_with_all_filters(self):
        """Test search service with all filter combinations"""
        # Mark video as watched
        UserVideo.objects.create(user=self.user, video=self.video, is_watched=True)

        service = VideoSearchService(self.user)

        test_cases = [
            (["Test"], "TagMode.ANY", "WatchStatus.WATCHED", 1),
            (["Test"], "TagMode.ANY", "WatchStatus.UNWATCHED", 0),
            (["Test"], "TagMode.ALL", "WatchStatus.WATCHED", 1),
            (["NonExistent"], "TagMode.ANY", "WatchStatus.ALL", 0),
        ]

        for tags, tag_mode, watch_status, expected_count in test_cases:
            with self.subTest(tags=tags, tag_mode=tag_mode, watch_status=watch_status):
                # Convert string representations to actual enum values
                tag_mode_enum = getattr(TagMode, tag_mode.split(".")[1])
                watch_status_enum = getattr(WatchStatus, watch_status.split(".")[1])

                results = service.search_videos(
                    tag_names=tags,
                    tag_mode=tag_mode_enum,
                    watch_status=watch_status_enum,
                )
                self.assertEqual(len(list(results)), expected_count)
