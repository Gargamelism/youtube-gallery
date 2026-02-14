import uuid
from django.db import IntegrityError
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from unittest.mock import patch
from videos.models import Channel, Video
from videos.services.search import VideoSearchService
from videos.validators import TagMode, WatchStatus
from users.models import ChannelTag, UserChannel, UserChannelTag, UserVideo, User


class TagModeEnumTests(TestCase):
    """Unit tests for TagMode enum"""

    def test_except_mode_exists(self) -> None:
        """Test that EXCEPT tag mode exists in the TagMode enum"""
        self.assertEqual(TagMode.EXCEPT.value, "except")

    def test_from_param_except(self) -> None:
        """Test that TagMode.from_param parses 'except' correctly"""
        result = TagMode.from_param("except")
        self.assertEqual(result, TagMode.EXCEPT)

    def test_from_param_invalid_still_defaults_to_any(self) -> None:
        """Test that invalid values still default to ANY"""
        result = TagMode.from_param("invalid")
        self.assertEqual(result, TagMode.ANY)


class ChannelTagModelTests(TestCase):
    """Unit tests for ChannelTag model"""

    user: User
    user2: User

    @classmethod
    def setUpTestData(cls) -> None:
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )
        cls.user2 = User.objects.create_user(
            username="testuser2",
            email="test2@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )

    def test_channel_tag_creation(self) -> None:
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

    def test_channel_tag_string_representation(self) -> None:
        """Test string representation of ChannelTag"""
        tag = ChannelTag.objects.create(user=self.user, name="Tech")
        self.assertEqual(str(tag), "Tech")

    def test_channel_tag_unique_constraint(self) -> None:
        """Test that tag names must be unique per user"""
        ChannelTag.objects.create(user=self.user, name="Tech")

        with self.assertRaises(IntegrityError):
            ChannelTag.objects.create(user=self.user, name="Tech")

    def test_different_users_can_have_same_tag_name(self) -> None:
        """Test that different users can have tags with the same name"""
        tag1 = ChannelTag.objects.create(user=self.user, name="Tech")
        tag2 = ChannelTag.objects.create(user=self.user2, name="Tech")

        self.assertNotEqual(tag1.id, tag2.id)
        self.assertEqual(tag1.name, tag2.name)

    def test_channel_tag_default_color(self) -> None:
        """Test that channel tag has default color"""
        tag = ChannelTag.objects.create(user=self.user, name="Tech")
        self.assertEqual(tag.color, "#3B82F6")

    def test_channel_tag_ordering(self) -> None:
        """Test that channel tags are ordered by name"""
        ChannelTag.objects.create(user=self.user, name="Zebra")
        ChannelTag.objects.create(user=self.user, name="Alpha")

        tags = list(ChannelTag.objects.filter(user=self.user))
        self.assertEqual(tags[0].name, "Alpha")
        self.assertEqual(tags[1].name, "Zebra")


class UserChannelTagModelTests(TestCase):
    """Unit tests for UserChannelTag model"""

    user: User
    channel: Channel
    user_channel: UserChannel
    tag: ChannelTag

    @classmethod
    def setUpTestData(cls) -> None:
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )
        cls.channel = Channel.objects.create(channel_id="UC123456", title="Test Channel")
        cls.user_channel = UserChannel.objects.create(user=cls.user, channel=cls.channel)
        cls.tag = ChannelTag.objects.create(user=cls.user, name="Tech")

    def test_user_channel_tag_creation(self) -> None:
        """Test creating a user channel tag assignment"""
        assignment = UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag)
        self.assertEqual(assignment.user_channel, self.user_channel)
        self.assertEqual(assignment.tag, self.tag)

    def test_user_channel_tag_string_representation(self) -> None:
        """Test string representation of UserChannelTag"""
        assignment = UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag)
        expected = f"{self.user_channel} -> {self.tag}"
        self.assertEqual(str(assignment), expected)

    def test_user_channel_tag_unique_constraint(self) -> None:
        """Test that user channel tag assignments must be unique"""
        UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag)

        with self.assertRaises(IntegrityError):
            UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag)


class ChannelTagAPITests(APITestCase):
    """API tests for channel tag operations"""

    user: User
    other_user: User

    @classmethod
    def setUpTestData(cls) -> None:
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )
        cls.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )

    def setUp(self) -> None:
        """Set up per-test authentication"""
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def tearDown(self) -> None:
        """Clean up per-test data"""
        Token.objects.filter(user=self.user).delete()
        ChannelTag.objects.filter(user=self.user).delete()

    def test_create_channel_tag(self) -> None:
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

    def test_create_channel_tag_without_description(self) -> None:
        """Test creating a channel tag without description"""
        data = {"name": "Gaming", "color": "#EF4444"}
        response = self.client.post("/api/auth/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Gaming")
        self.assertIsNone(response.data.get("description"))

    def test_create_channel_tag_duplicate_name(self) -> None:
        """Test creating channel tag with duplicate name fails"""
        ChannelTag.objects.create(user=self.user, name="Tech")

        data = {"name": "Tech", "color": "#3B82F6"}
        response = self.client.post("/api/auth/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_channel_tag_invalid_data(self) -> None:
        """Test creating channel tag with invalid data"""
        data = {"color": "#3B82F6"}  # Missing name
        response = self.client.post("/api/auth/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_list_channel_tags(self) -> None:
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

    def test_list_channel_tags_empty(self) -> None:
        """Test listing channel tags when user has none"""
        response = self.client.get("/api/auth/tags")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 0)

    def test_retrieve_channel_tag(self) -> None:
        """Test retrieving a specific channel tag"""
        tag = ChannelTag.objects.create(user=self.user, name="Tech")

        response = self.client.get(f"/api/auth/tags/{tag.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Tech")

    def test_update_channel_tag(self) -> None:
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

    def test_partial_update_channel_tag(self) -> None:
        """Test partially updating a channel tag"""
        tag = ChannelTag.objects.create(user=self.user, name="Tech", color="#3B82F6")

        data = {"name": "Technology"}
        response = self.client.patch(f"/api/auth/tags/{tag.id}", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Technology")
        self.assertEqual(response.data["color"], "#3B82F6")  # Unchanged

    def test_delete_channel_tag(self) -> None:
        """Test deleting a channel tag"""
        tag = ChannelTag.objects.create(user=self.user, name="Tech")

        response = self.client.delete(f"/api/auth/tags/{tag.id}")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ChannelTag.objects.filter(user=self.user).count(), 0)

    def test_user_cannot_access_other_users_tags(self) -> None:
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

    def test_unauthenticated_access_denied(self) -> None:
        """Test that unauthenticated requests are denied"""
        self.client.credentials()  # Remove authentication

        response = self.client.get("/api/auth/tags")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TagAssignmentAPITests(APITestCase):
    """API tests for tag assignment to channels"""

    user: User
    other_user: User
    channel: Channel
    user_channel: UserChannel

    @classmethod
    def setUpTestData(cls) -> None:
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )
        cls.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )

        cls.channel = Channel.objects.create(channel_id="UC123456", title="Test Channel")
        cls.user_channel = UserChannel.objects.create(user=cls.user, channel=cls.channel)

    def setUp(self) -> None:
        """Set up per-test authentication and data"""
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        self.tag1 = ChannelTag.objects.create(user=self.user, name="Tech")
        self.tag2 = ChannelTag.objects.create(user=self.user, name="Gaming")

    def tearDown(self) -> None:
        """Clean up per-test data"""
        Token.objects.filter(user=self.user).delete()
        ChannelTag.objects.filter(user=self.user).delete()
        UserChannelTag.objects.filter(user_channel=self.user_channel).delete()

    def test_assign_tags_to_channel(self) -> None:
        """Test assigning tags to a channel"""
        data = {"tag_ids": [str(self.tag1.id), str(self.tag2.id)]}

        response = self.client.put(f"/api/auth/channels/{self.user_channel.id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(UserChannelTag.objects.filter(user_channel=self.user_channel).count(), 2)

    def test_assign_single_tag_to_channel(self) -> None:
        """Test assigning single tag to a channel"""
        data = {"tag_ids": [str(self.tag1.id)]}

        response = self.client.put(f"/api/auth/channels/{self.user_channel.id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(UserChannelTag.objects.filter(user_channel=self.user_channel).count(), 1)

    def test_assign_empty_tags_to_channel(self) -> None:
        """Test assigning empty tag list to channel (removes all tags)"""
        # First assign some tags
        UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag1)
        self.assertEqual(UserChannelTag.objects.filter(user_channel=self.user_channel).count(), 1)

        data: dict[str, list[str]] = {"tag_ids": []}

        response = self.client.put(f"/api/auth/channels/{self.user_channel.id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(UserChannelTag.objects.filter(user_channel=self.user_channel).count(), 0)

    def test_get_channel_tags(self) -> None:
        """Test getting tags assigned to a channel"""
        UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag1)
        UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag2)

        response = self.client.get(f"/api/auth/channels/{self.user_channel.id}/tags")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        tag_names = [tag["name"] for tag in response.data]
        self.assertIn("Tech", tag_names)
        self.assertIn("Gaming", tag_names)

    def test_get_channel_tags_empty(self) -> None:
        """Test getting tags for channel with no tags assigned"""
        response = self.client.get(f"/api/auth/channels/{self.user_channel.id}/tags")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_assign_invalid_tag_ids_format(self) -> None:
        """Test assigning invalid tag ID format returns error"""
        data = {"tag_ids": ["invalid-uuid-123"]}

        response = self.client.put(f"/api/auth/channels/{self.user_channel.id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid UUID format", str(response.data))

    def test_assign_nonexistent_tag_ids(self) -> None:
        """Test assigning non-existent tag IDs returns error"""
        fake_uuid = str(uuid.uuid4())
        data = {"tag_ids": [fake_uuid]}

        response = self.client.put(f"/api/auth/channels/{self.user_channel.id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid tag IDs not owned by user", str(response.data))

    def test_assign_other_users_tags(self) -> None:
        """Test that users cannot assign other users' tags"""
        other_tag = ChannelTag.objects.create(user=self.other_user, name="Music")

        data = {"tag_ids": [str(other_tag.id)]}

        response = self.client.put(f"/api/auth/channels/{self.user_channel.id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid tag IDs not owned by user", str(response.data))

    def test_replace_existing_tag_assignments(self) -> None:
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
        self.assertIsNotNone(remaining_assignment)
        assert remaining_assignment is not None  # Type narrowing for mypy
        self.assertEqual(remaining_assignment.tag, self.tag2)

    def test_assign_tags_to_nonexistent_channel(self) -> None:
        """Test assigning tags to non-existent channel returns 404"""
        fake_channel_id = uuid.uuid4()

        data = {"tag_ids": [str(self.tag1.id)]}

        response = self.client.put(f"/api/auth/channels/{fake_channel_id}/tags", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class VideoTagFilteringAPITests(APITestCase):
    """API tests for video filtering by tags"""

    user: User
    tech_channel: Channel
    gaming_channel: Channel
    mixed_channel: Channel
    user_tech_channel: UserChannel
    user_gaming_channel: UserChannel
    user_mixed_channel: UserChannel
    tech_video: Video
    gaming_video: Video
    mixed_video: Video

    @classmethod
    def setUpTestData(cls) -> None:
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )

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

    def setUp(self) -> None:
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

    def tearDown(self) -> None:
        """Clean up per-test data"""
        Token.objects.filter(user=self.user).delete()
        ChannelTag.objects.filter(user=self.user).delete()
        UserChannelTag.objects.filter(user_channel__user=self.user).delete()
        UserVideo.objects.filter(user=self.user).delete()

    def test_filter_videos_by_single_tag_any_mode(self) -> None:
        """Test filtering videos by single tag in 'any' mode"""
        response = self.client.get("/api/videos?tags=Tech&tag_mode=any")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]

        # Should include videos from tech_channel and mixed_channel (both have Tech tag)
        self.assertIn("tech_video_1", video_ids)
        self.assertIn("mixed_video_1", video_ids)
        self.assertNotIn("gaming_video_1", video_ids)

    def test_filter_videos_by_multiple_tags_any_mode(self) -> None:
        """Test filtering videos by multiple tags in 'any' mode"""
        response = self.client.get("/api/videos?tags=Tech,Gaming&tag_mode=any")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]

        # Should include all videos (all channels have at least one of the tags)
        self.assertIn("tech_video_1", video_ids)
        self.assertIn("gaming_video_1", video_ids)
        self.assertIn("mixed_video_1", video_ids)

    def test_filter_videos_by_multiple_tags_all_mode(self) -> None:
        """Test filtering videos by multiple tags in 'all' mode"""
        response = self.client.get("/api/videos?tags=Tech,Gaming&tag_mode=all")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]

        # Should only include videos from mixed_channel (has both Tech and Gaming tags)
        self.assertNotIn("tech_video_1", video_ids)
        self.assertNotIn("gaming_video_1", video_ids)
        self.assertIn("mixed_video_1", video_ids)

    def test_filter_videos_with_watch_status_and_tags(self) -> None:
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

    def test_filter_videos_by_nonexistent_tag(self) -> None:
        """Test filtering by non-existent tag returns validation error"""
        response = self.client.get("/api/videos?tags=NonExistent&tag_mode=any")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid tags not owned by user", str(response.data))

    def test_filter_videos_watched_action_with_tags(self) -> None:
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

    def test_filter_videos_unwatched_action_with_tags(self) -> None:
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

    def test_video_list_includes_channel_tags(self) -> None:
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
        assert tech_video_data is not None  # Type narrowing for mypy
        self.assertIn("channel_tags", tech_video_data)

        # Check that channel tags are included
        channel_tags = tech_video_data["channel_tags"]
        tag_names = [tag["name"] for tag in channel_tags]
        self.assertIn("Tech", tag_names)
        self.assertIn("Tutorial", tag_names)

    def test_invalid_tag_mode_parameter(self) -> None:
        """Test that invalid tag_mode parameter uses default 'any'"""
        response = self.client.get("/api/videos?tags=Tech&tag_mode=invalid")

        # Should still work, using default 'any' mode
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_empty_tags_parameter(self) -> None:
        """Test that empty tags parameter returns all videos"""
        response = self.client.get("/api/videos?tags=&tag_mode=any")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)  # All videos

    def test_video_stats_with_tag_filtering(self) -> None:
        """Test video stats endpoint works independently of tag filtering"""
        # Mark some videos as watched
        UserVideo.objects.create(user=self.user, video=self.tech_video, is_watched=True)

        response = self.client.get("/api/videos/stats")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 3)
        self.assertEqual(response.data["watched"], 1)
        self.assertEqual(response.data["unwatched"], 2)

    @patch("videos.services.search.VideoSearchService.search_videos")
    def test_video_search_service_called(self, mock_search_videos) -> None:
        """Test that VideoSearchService is called for video filtering"""
        mock_search_videos.return_value = Video.objects.none()

        self.client.get("/api/videos?tags=Tech&tag_mode=any")

        mock_search_videos.assert_called_once()
        args, kwargs = mock_search_videos.call_args
        self.assertEqual(kwargs["tag_names"], ["Tech"])
        self.assertEqual(kwargs["tag_mode"].value, "any")

    def test_pydantic_validation_error_handling(self) -> None:
        """Test that Pydantic validation errors are properly handled"""
        # Test with invalid tag_mode enum value that gets through URL params
        response = self.client.get("/api/videos?tags=Tech&tag_mode=invalid_enum")

        # Should handle gracefully by using default
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filter_videos_by_single_tag_except_mode(self) -> None:
        """Test filtering videos by single tag in 'except' mode via API"""
        response = self.client.get("/api/videos?tags=Tech&tag_mode=except")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]

        self.assertIn("gaming_video_1", video_ids)
        self.assertNotIn("tech_video_1", video_ids)
        self.assertNotIn("mixed_video_1", video_ids)

    def test_filter_videos_by_multiple_tags_except_mode(self) -> None:
        """Test filtering videos by multiple tags in 'except' mode via API"""
        response = self.client.get("/api/videos?tags=Tech,Gaming&tag_mode=except")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]

        self.assertEqual(len(video_ids), 0)

    def test_filter_videos_except_mode_with_watch_status(self) -> None:
        """Test combining EXCEPT tag mode with watch status filtering"""
        UserVideo.objects.create(user=self.user, video=self.gaming_video, is_watched=True)

        response = self.client.get("/api/videos?tags=Tech&tag_mode=except&watch_status=watched")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]

        self.assertIn("gaming_video_1", video_ids)
        self.assertEqual(len(video_ids), 1)

    def test_filter_videos_except_tutorial(self) -> None:
        """Test EXCEPT with Tutorial tag returns channels without Tutorial"""
        response = self.client.get("/api/videos?tags=Tutorial&tag_mode=except")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        video_ids = [video["video_id"] for video in response.data["results"]]

        self.assertIn("gaming_video_1", video_ids)
        self.assertIn("mixed_video_1", video_ids)
        self.assertNotIn("tech_video_1", video_ids)


class ExceptModeSearchServiceTests(TestCase):
    """Integration tests for EXCEPT mode in VideoSearchService"""

    user: User
    tech_channel: Channel
    gaming_channel: Channel
    mixed_channel: Channel

    @classmethod
    def setUpTestData(cls) -> None:
        cls.user = User.objects.create_user(
            username="except_testuser",
            email="except@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )
        cls.tech_channel = Channel.objects.create(channel_id="UC_EXCEPT_TECH", title="Tech Channel")
        cls.gaming_channel = Channel.objects.create(channel_id="UC_EXCEPT_GAMING", title="Gaming Channel")
        cls.mixed_channel = Channel.objects.create(channel_id="UC_EXCEPT_MIXED", title="Mixed Channel")

        UserChannel.objects.create(user=cls.user, channel=cls.tech_channel)
        UserChannel.objects.create(user=cls.user, channel=cls.gaming_channel)
        UserChannel.objects.create(user=cls.user, channel=cls.mixed_channel)

        Video.objects.create(channel=cls.tech_channel, video_id="except_tech_v1", title="Tech Video")
        Video.objects.create(channel=cls.gaming_channel, video_id="except_gaming_v1", title="Gaming Video")
        Video.objects.create(channel=cls.mixed_channel, video_id="except_mixed_v1", title="Mixed Video")

    def setUp(self) -> None:
        self.tech_tag = ChannelTag.objects.create(user=self.user, name="Tech")
        self.gaming_tag = ChannelTag.objects.create(user=self.user, name="Gaming")
        self.tutorial_tag = ChannelTag.objects.create(user=self.user, name="Tutorial")

        user_tech = UserChannel.objects.get(user=self.user, channel=self.tech_channel)
        user_gaming = UserChannel.objects.get(user=self.user, channel=self.gaming_channel)
        user_mixed = UserChannel.objects.get(user=self.user, channel=self.mixed_channel)

        UserChannelTag.objects.create(user_channel=user_tech, tag=self.tech_tag)
        UserChannelTag.objects.create(user_channel=user_tech, tag=self.tutorial_tag)
        UserChannelTag.objects.create(user_channel=user_gaming, tag=self.gaming_tag)
        UserChannelTag.objects.create(user_channel=user_mixed, tag=self.tech_tag)
        UserChannelTag.objects.create(user_channel=user_mixed, tag=self.gaming_tag)

    def tearDown(self) -> None:
        ChannelTag.objects.filter(user=self.user).delete()
        UserChannelTag.objects.filter(user_channel__user=self.user).delete()
        UserVideo.objects.filter(user=self.user).delete()

    def test_except_single_tag_excludes_matching_channels(self) -> None:
        """EXCEPT with single tag excludes channels that have that tag"""
        service = VideoSearchService(self.user)
        results = list(service.search_videos(tag_names=["Tech"], tag_mode=TagMode.EXCEPT))
        video_ids = [v.video_id for v in results]

        self.assertIn("except_gaming_v1", video_ids)
        self.assertNotIn("except_tech_v1", video_ids)
        self.assertNotIn("except_mixed_v1", video_ids)

    def test_except_multiple_tags_excludes_all_matching(self) -> None:
        """EXCEPT with multiple tags excludes channels that have ANY of those tags"""
        service = VideoSearchService(self.user)
        results = list(service.search_videos(tag_names=["Tech", "Gaming"], tag_mode=TagMode.EXCEPT))
        video_ids = [v.video_id for v in results]

        self.assertEqual(len(video_ids), 0)

    def test_except_tag_sparse(self) -> None:
        """EXCEPT with a tag that only one channel has returns others"""
        service = VideoSearchService(self.user)
        results = list(service.search_videos(tag_names=["Tutorial"], tag_mode=TagMode.EXCEPT))
        video_ids = [v.video_id for v in results]

        self.assertIn("except_gaming_v1", video_ids)
        self.assertIn("except_mixed_v1", video_ids)
        self.assertNotIn("except_tech_v1", video_ids)

    def test_except_combined_with_watch_status_watched(self) -> None:
        """EXCEPT mode combined with watched filter"""
        gaming_video = Video.objects.get(video_id="except_gaming_v1")
        UserVideo.objects.create(user=self.user, video=gaming_video, is_watched=True)

        service = VideoSearchService(self.user)
        results = list(
            service.search_videos(
                tag_names=["Tech"],
                tag_mode=TagMode.EXCEPT,
                watch_status=WatchStatus.WATCHED,
            )
        )
        video_ids = [v.video_id for v in results]

        self.assertEqual(video_ids, ["except_gaming_v1"])

    def test_except_combined_with_watch_status_unwatched(self) -> None:
        """EXCEPT mode combined with unwatched filter"""
        gaming_video = Video.objects.get(video_id="except_gaming_v1")
        UserVideo.objects.create(user=self.user, video=gaming_video, is_watched=True)

        service = VideoSearchService(self.user)
        results = list(
            service.search_videos(
                tag_names=["Tech"],
                tag_mode=TagMode.EXCEPT,
                watch_status=WatchStatus.UNWATCHED,
            )
        )
        video_ids = [v.video_id for v in results]

        self.assertEqual(len(video_ids), 0)

    def test_except_mode_query_optimization(self) -> None:
        """EXCEPT mode maintains the 4-query optimization strategy"""
        service = VideoSearchService(self.user)

        with self.assertNumQueries(4):
            list(
                service.search_videos(
                    tag_names=["Tech"],
                    tag_mode=TagMode.EXCEPT,
                    watch_status=WatchStatus.ALL,
                )
            )


class SearchServiceIntegrationTests(TestCase):
    """Integration tests for VideoSearchService"""

    user: User
    channel: Channel
    user_channel: UserChannel
    video: Video

    @classmethod
    def setUpTestData(cls) -> None:
        """Create test data once for the entire test class"""
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",  # nosec B105 - test-only password
        )

        # Create test data similar to VideoTagFilteringAPITests
        cls.channel = Channel.objects.create(channel_id="UC_TEST", title="Test Channel")
        cls.user_channel = UserChannel.objects.create(user=cls.user, channel=cls.channel)
        cls.video = Video.objects.create(channel=cls.channel, video_id="test_video_1", title="Test Video")

    def setUp(self) -> None:
        """Set up per-test data"""
        self.tag = ChannelTag.objects.create(user=self.user, name="Test")
        UserChannelTag.objects.create(user_channel=self.user_channel, tag=self.tag)

    def tearDown(self) -> None:
        """Clean up per-test data"""
        ChannelTag.objects.filter(user=self.user).delete()
        UserChannelTag.objects.filter(user_channel=self.user_channel).delete()
        UserVideo.objects.filter(user=self.user).delete()

    def test_search_service_query_optimization(self) -> None:
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

    def test_search_service_query_optimization_no_tags(self) -> None:
        """Test that search service generates fewer queries without tag filtering"""
        service = VideoSearchService(self.user)

        # Without tag filtering, Django ORM generates fewer queries:
        # 1. Main videos query with channel data
        # 2. User videos prefetch
        # 3. User channels prefetch
        # 4. Channel tags prefetch with select_related
        with self.assertNumQueries(4):
            list(service.search_videos(watch_status=WatchStatus.ALL))

    def test_search_service_with_all_filters(self) -> None:
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
