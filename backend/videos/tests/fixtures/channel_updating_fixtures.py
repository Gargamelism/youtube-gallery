"""
Database fixtures for channel updating tests.

This module provides pre-configured database fixtures that represent various
channel states and scenarios for comprehensive testing of the channel updating
and removal functionality.
"""

from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone

from videos.models import Channel, Video
from users.models import UserChannel, UserVideo, ChannelTag, UserChannelTag

User = get_user_model()


class ChannelUpdatingFixtures:
    """Factory class for creating test fixtures for channel updating scenarios"""

    def __init__(self):
        self.created_objects = {
            "users": [],
            "channels": [],
            "videos": [],
            "user_channels": [],
            "user_videos": [],
            "channel_tags": [],
            "user_channel_tags": [],
        }

    def cleanup(self):
        """Clean up all created test objects"""
        for object_type in [
            "user_channel_tags",
            "channel_tags",
            "user_videos",
            "user_channels",
            "videos",
            "channels",
            "users",
        ]:
            for obj in self.created_objects[object_type]:
                if hasattr(obj, "delete"):
                    obj.delete()

        # Clear the tracking
        for key in self.created_objects:
            self.created_objects[key].clear()

    def create_test_users(self) -> dict:
        """Create test users for various scenarios"""
        users = {}

        users["active_user"] = User.objects.create_user(
            username="active_user", email="active@example.com", password="testpass123"
        )  # nosec B105 - test-only password

        users["inactive_user"] = User.objects.create_user(
            username="inactive_user", email="inactive@example.com", password="testpass123"
        )  # nosec B105 - test-only password

        users["power_user"] = User.objects.create_user(
            username="power_user", email="power@example.com", password="testpass123"
        )  # nosec B105 - test-only password

        users["casual_user"] = User.objects.create_user(
            username="casual_user", email="casual@example.com", password="testpass123"
        )  # nosec B105 - test-only password

        self.created_objects["users"].extend(users.values())
        return users

    def create_channel_scenarios(self) -> dict:
        """Create channels representing different update scenarios"""
        channels = {}
        now = timezone.now()

        # Active channel - frequently updated, high engagement
        channels["active_tech"] = Channel.objects.create(
            channel_id="UC_active_tech_123",
            title="Active Tech Channel",
            description="Daily tech news and tutorials",
            url="https://youtube.com/channel/UC_active_tech_123",
        )

        # Outdated channel - hasn't been updated in months
        channels["outdated_gaming"] = Channel.objects.create(
            channel_id="UC_outdated_gaming_456",
            title="Old Gaming Channel Title",  # This should be updated
            description="Outdated description from 6 months ago",
            url="https://youtube.com/channel/UC_outdated_gaming_456",
        )
        # Simulate old timestamps
        channels["outdated_gaming"].created_at = now - timedelta(days=200)
        channels["outdated_gaming"].updated_at = now - timedelta(days=180)
        channels["outdated_gaming"].save()

        # Small inactive channel
        channels["small_inactive"] = Channel.objects.create(
            channel_id="UC_small_inactive_789",
            title="Small Inactive Channel",
            description="A channel that rarely uploads",
            url="https://youtube.com/channel/UC_small_inactive_789",
        )
        channels["small_inactive"].created_at = now - timedelta(days=400)
        channels["small_inactive"].updated_at = now - timedelta(days=300)
        channels["small_inactive"].save()

        # High-priority channel - popular, should be updated frequently
        channels["popular_education"] = Channel.objects.create(
            channel_id="UC_popular_edu_101",
            title="Popular Education Channel",
            description="Educational content with millions of subscribers",
            url="https://youtube.com/channel/UC_popular_edu_101",
        )

        # Orphaned channel - no user subscriptions
        channels["orphaned"] = Channel.objects.create(
            channel_id="UC_orphaned_202",
            title="Orphaned Channel",
            description="A channel with no active subscribers",
            url="https://youtube.com/channel/UC_orphaned_202",
        )

        # Potentially deleted channel - hasn't been accessible on YouTube
        channels["potentially_deleted"] = Channel.objects.create(
            channel_id="UC_deleted_303",
            title="Potentially Deleted Channel",
            description="Channel that may have been deleted on YouTube",
            url="https://youtube.com/channel/UC_deleted_303",
        )
        channels["potentially_deleted"].created_at = now - timedelta(days=90)
        channels["potentially_deleted"].updated_at = now - timedelta(days=90)
        channels["potentially_deleted"].save()

        # Private channel - may have changed privacy settings
        channels["private"] = Channel.objects.create(
            channel_id="UC_private_404",
            title="Now Private Channel",
            description="Channel that became private",
            url="https://youtube.com/channel/UC_private_404",
        )

        self.created_objects["channels"].extend(channels.values())
        return channels

    def create_videos_for_channels(self, channels: dict) -> dict:
        """Create videos associated with test channels"""
        videos = {}
        now = timezone.now()

        # Active tech channel videos (recent uploads)
        videos["active_tech_recent"] = []
        for i in range(5):
            video = Video.objects.create(
                channel=channels["active_tech"],
                video_id=f"active_tech_video_{i}",
                title=f"Recent Tech Video {i+1}",
                description=f"Description for recent tech video {i+1}",
                published_at=now - timedelta(days=i),
                view_count=10000 + (i * 1000),
                like_count=500 + (i * 50),
                comment_count=100 + (i * 10),
                thumbnail_url=f"https://i.ytimg.com/vi/active_tech_video_{i}/hqdefault.jpg",
                video_url=f"https://youtube.com/watch?v=active_tech_video_{i}",
            )
            videos["active_tech_recent"].append(video)

        # Outdated gaming channel videos (old uploads)
        videos["outdated_gaming_old"] = []
        for i in range(3):
            video = Video.objects.create(
                channel=channels["outdated_gaming"],
                video_id=f"outdated_gaming_video_{i}",
                title=f"Old Gaming Video {i+1}",
                description=f"Description for old gaming video {i+1}",
                published_at=now - timedelta(days=200 + i * 30),
                view_count=5000 + (i * 500),
                like_count=250 + (i * 25),
                comment_count=50 + (i * 5),
                thumbnail_url=f"https://i.ytimg.com/vi/outdated_gaming_video_{i}/hqdefault.jpg",
                video_url=f"https://youtube.com/watch?v=outdated_gaming_video_{i}",
            )
            videos["outdated_gaming_old"].append(video)

        # Small inactive channel (very few, very old videos)
        videos["small_inactive_videos"] = []
        for i in range(2):
            video = Video.objects.create(
                channel=channels["small_inactive"],
                video_id=f"small_inactive_video_{i}",
                title=f"Rare Video {i+1}",
                description=f"Description for rare video {i+1}",
                published_at=now - timedelta(days=350 + i * 50),
                view_count=1000 + (i * 100),
                like_count=50 + (i * 10),
                comment_count=10 + i,
                thumbnail_url=f"https://i.ytimg.com/vi/small_inactive_video_{i}/hqdefault.jpg",
                video_url=f"https://youtube.com/watch?v=small_inactive_video_{i}",
            )
            videos["small_inactive_videos"].append(video)

        # Popular education channel (many high-engagement videos)
        videos["popular_education_hits"] = []
        for i in range(10):
            video = Video.objects.create(
                channel=channels["popular_education"],
                video_id=f"popular_edu_video_{i}",
                title=f"Popular Education Video {i+1}",
                description=f"Description for popular educational content {i+1}",
                published_at=now - timedelta(days=i * 7),  # Weekly uploads
                view_count=100000 + (i * 10000),
                like_count=5000 + (i * 500),
                comment_count=1000 + (i * 100),
                thumbnail_url=f"https://i.ytimg.com/vi/popular_edu_video_{i}/hqdefault.jpg",
                video_url=f"https://youtube.com/watch?v=popular_edu_video_{i}",
            )
            videos["popular_education_hits"].append(video)

        # Orphaned channel videos (should be cleaned up)
        videos["orphaned_videos"] = []
        for i in range(2):
            video = Video.objects.create(
                channel=channels["orphaned"],
                video_id=f"orphaned_video_{i}",
                title=f"Orphaned Video {i+1}",
                description=f"Description for orphaned video {i+1}",
                published_at=now - timedelta(days=100 + i * 20),
                view_count=500 + (i * 50),
                like_count=25 + (i * 5),
                comment_count=5 + i,
                thumbnail_url=f"https://i.ytimg.com/vi/orphaned_video_{i}/hqdefault.jpg",
                video_url=f"https://youtube.com/watch?v=orphaned_video_{i}",
            )
            videos["orphaned_videos"].append(video)

        # Flatten the video lists for cleanup tracking
        all_videos = []
        for video_list in videos.values():
            if isinstance(video_list, list):
                all_videos.extend(video_list)
            else:
                all_videos.append(video_list)

        self.created_objects["videos"].extend(all_videos)
        return videos

    def create_user_subscriptions(self, users: dict, channels: dict) -> dict:
        """Create user channel subscriptions representing different patterns"""
        subscriptions = {}
        now = timezone.now()

        # Active user follows multiple channels
        subscriptions["active_user_subs"] = [
            UserChannel.objects.create(
                user=users["active_user"],
                channel=channels["active_tech"],
                subscribed_at=now - timedelta(days=30),
                is_active=True,
            ),
            UserChannel.objects.create(
                user=users["active_user"],
                channel=channels["popular_education"],
                subscribed_at=now - timedelta(days=60),
                is_active=True,
            ),
            UserChannel.objects.create(
                user=users["active_user"],
                channel=channels["outdated_gaming"],
                subscribed_at=now - timedelta(days=120),
                is_active=True,
            ),
        ]

        # Power user follows many channels including inactive ones
        subscriptions["power_user_subs"] = [
            UserChannel.objects.create(
                user=users["power_user"],
                channel=channels["active_tech"],
                subscribed_at=now - timedelta(days=15),
                is_active=True,
            ),
            UserChannel.objects.create(
                user=users["power_user"],
                channel=channels["small_inactive"],
                subscribed_at=now - timedelta(days=200),
                is_active=True,
            ),
            UserChannel.objects.create(
                user=users["power_user"],
                channel=channels["potentially_deleted"],
                subscribed_at=now - timedelta(days=100),
                is_active=True,
            ),
            UserChannel.objects.create(
                user=users["power_user"],
                channel=channels["private"],
                subscribed_at=now - timedelta(days=80),
                is_active=True,
            ),
        ]

        # Casual user follows only popular channels
        subscriptions["casual_user_subs"] = [
            UserChannel.objects.create(
                user=users["casual_user"],
                channel=channels["popular_education"],
                subscribed_at=now - timedelta(days=45),
                is_active=True,
            )
        ]

        # Inactive user has old subscriptions
        subscriptions["inactive_user_subs"] = [
            UserChannel.objects.create(
                user=users["inactive_user"],
                channel=channels["outdated_gaming"],
                subscribed_at=now - timedelta(days=300),
                is_active=False,  # Deactivated subscription
            )
        ]

        # Flatten subscriptions for cleanup tracking
        all_subscriptions = []
        for sub_list in subscriptions.values():
            all_subscriptions.extend(sub_list)

        self.created_objects["user_channels"].extend(all_subscriptions)
        return subscriptions

    def create_channel_tags_and_assignments(self, users: dict, subscriptions: dict) -> dict:
        """Create channel tags and assignments for testing tag-based updates"""
        tags_data = {}

        # Create tags for active user
        active_user_tags = [
            ChannelTag.objects.create(
                user=users["active_user"], name="Tech", color="#3B82F6", description="Technology related channels"
            ),
            ChannelTag.objects.create(
                user=users["active_user"], name="Education", color="#10B981", description="Educational content"
            ),
            ChannelTag.objects.create(
                user=users["active_user"], name="Entertainment", color="#F59E0B", description="Entertainment and gaming"
            ),
        ]

        # Create tags for power user
        power_user_tags = [
            ChannelTag.objects.create(
                user=users["power_user"],
                name="High Priority",
                color="#EF4444",
                description="Channels to update frequently",
            ),
            ChannelTag.objects.create(
                user=users["power_user"], name="Archive", color="#6B7280", description="Old or inactive channels"
            ),
        ]

        tags_data["active_user_tags"] = active_user_tags
        tags_data["power_user_tags"] = power_user_tags

        # Create tag assignments
        tag_assignments = []

        # Active user's tag assignments
        for subscription in subscriptions["active_user_subs"]:
            if "tech" in subscription.channel.title.lower():
                tag_assignments.append(
                    UserChannelTag.objects.create(user_channel=subscription, tag=active_user_tags[0])  # Tech tag
                )
            elif "education" in subscription.channel.title.lower():
                tag_assignments.append(
                    UserChannelTag.objects.create(user_channel=subscription, tag=active_user_tags[1])  # Education tag
                )
            else:
                tag_assignments.append(
                    UserChannelTag.objects.create(
                        user_channel=subscription, tag=active_user_tags[2]  # Entertainment tag
                    )
                )

        # Power user's tag assignments
        for subscription in subscriptions["power_user_subs"]:
            if subscription.channel.title in ["Active Tech Channel", "Popular Education Channel"]:
                tag_assignments.append(
                    UserChannelTag.objects.create(
                        user_channel=subscription, tag=power_user_tags[0]  # High Priority tag
                    )
                )
            else:
                tag_assignments.append(
                    UserChannelTag.objects.create(user_channel=subscription, tag=power_user_tags[1])  # Archive tag
                )

        tags_data["tag_assignments"] = tag_assignments

        # Track for cleanup
        all_tags = active_user_tags + power_user_tags
        self.created_objects["channel_tags"].extend(all_tags)
        self.created_objects["user_channel_tags"].extend(tag_assignments)

        return tags_data

    def create_user_video_interactions(self, users: dict, videos: dict) -> dict:
        """Create user video interactions (watch status, etc.)"""
        interactions = {}
        now = timezone.now()

        # Active user has watched some videos
        active_user_interactions = []
        for video in videos["active_tech_recent"][:3]:
            interaction = UserVideo.objects.create(
                user=users["active_user"],
                video=video,
                is_watched=True,
                watched_at=now - timedelta(days=1),
                notes="Great tutorial!",
            )
            active_user_interactions.append(interaction)

        # Power user has extensive interaction history
        power_user_interactions = []
        for video in videos["popular_education_hits"][:5]:
            interaction = UserVideo.objects.create(
                user=users["power_user"],
                video=video,
                is_watched=True,
                watched_at=now - timedelta(days=video.id.int % 10),
                notes=f"Watched and reviewed video {video.title}",
            )
            power_user_interactions.append(interaction)

        interactions["active_user"] = active_user_interactions
        interactions["power_user"] = power_user_interactions

        # Track for cleanup
        all_interactions = active_user_interactions + power_user_interactions
        self.created_objects["user_videos"].extend(all_interactions)

        return interactions

    def create_complete_test_scenario(self) -> dict:
        """Create a complete test scenario with all related objects"""
        scenario = {}

        scenario["users"] = self.create_test_users()
        scenario["channels"] = self.create_channel_scenarios()
        scenario["videos"] = self.create_videos_for_channels(scenario["channels"])
        scenario["subscriptions"] = self.create_user_subscriptions(scenario["users"], scenario["channels"])
        scenario["tags"] = self.create_channel_tags_and_assignments(scenario["users"], scenario["subscriptions"])
        scenario["interactions"] = self.create_user_video_interactions(scenario["users"], scenario["videos"])

        return scenario

    def get_channels_by_update_priority(self) -> dict:
        """Get channels categorized by their update priority for testing"""
        return {
            "high_priority": ["UC_active_tech_123", "UC_popular_edu_101"],
            "medium_priority": ["UC_outdated_gaming_456"],
            "low_priority": ["UC_small_inactive_789"],
            "problematic": ["UC_deleted_303", "UC_private_404"],
            "orphaned": ["UC_orphaned_202"],
        }

    def get_expected_removal_candidates(self) -> list:
        """Get list of channels that should be removed in cleanup"""
        return ["UC_orphaned_202"]  # Only the orphaned channel should be removed
