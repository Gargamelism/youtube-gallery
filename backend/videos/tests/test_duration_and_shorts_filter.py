from unittest.mock import MagicMock, patch

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from users.models import User, UserChannel
from videos.models import Channel, Video
from videos.services.search import VideoSearchService
from videos.services.youtube import check_is_short_via_redirect
from videos.validators import VideoSearchParams


# ─── check_is_short_via_redirect unit tests ───────────────────────────────────


class CheckIsShortViaRedirectTests(TestCase):
    """Unit tests for the check_is_short_via_redirect function"""

    @patch("videos.services.youtube.http")
    def test_returns_true_for_200_response(self, mock_http: MagicMock) -> None:
        mock_http.head.return_value = MagicMock(status_code=200)
        self.assertIs(check_is_short_via_redirect("abc123"), True)

    @patch("videos.services.youtube.http")
    def test_returns_false_for_302_response(self, mock_http: MagicMock) -> None:
        mock_http.head.return_value = MagicMock(status_code=302)
        self.assertIs(check_is_short_via_redirect("abc123"), False)

    @patch("videos.services.youtube.http")
    def test_returns_false_for_301_response(self, mock_http: MagicMock) -> None:
        mock_http.head.return_value = MagicMock(status_code=301)
        self.assertIs(check_is_short_via_redirect("abc123"), False)

    @patch("videos.services.youtube.http")
    def test_returns_none_for_unexpected_status(self, mock_http: MagicMock) -> None:
        mock_http.head.return_value = MagicMock(status_code=404)
        self.assertIsNone(check_is_short_via_redirect("abc123"))

    @patch("videos.services.youtube.http")
    def test_returns_none_on_exception(self, mock_http: MagicMock) -> None:
        mock_http.head.side_effect = Exception("Network error")
        self.assertIsNone(check_is_short_via_redirect("abc123"))

    @patch("videos.services.youtube.http")
    def test_returns_none_for_500_response(self, mock_http: MagicMock) -> None:
        mock_http.head.return_value = MagicMock(status_code=500)
        self.assertIsNone(check_is_short_via_redirect("abc123"))

    @patch("videos.services.youtube.http")
    def test_uses_correct_url_template(self, mock_http: MagicMock) -> None:
        mock_http.head.return_value = MagicMock(status_code=200)
        check_is_short_via_redirect("dQw4w9WgXcQ")
        mock_http.head.assert_called_once_with(
            "https://www.youtube.com/shorts/dQw4w9WgXcQ", allow_redirects=False
        )


# ─── Video.save() duration_seconds computation ────────────────────────────────


class VideoSaveDurationSecondsTests(TestCase):
    """Test that Video.save() correctly computes duration_seconds"""

    def setUp(self) -> None:
        self.channel = Channel.objects.create(channel_id="UC_test", title="Test Channel")

    def test_duration_seconds_computed_on_save(self) -> None:
        video = Video.objects.create(
            channel=self.channel, video_id="v1", title="T", duration="PT1H2M3S"
        )
        video.refresh_from_db()
        self.assertEqual(video.duration_seconds, 3723)  # 1*3600 + 2*60 + 3

    def test_duration_seconds_is_none_when_no_duration(self) -> None:
        video = Video.objects.create(channel=self.channel, video_id="v2", title="T", duration=None)
        video.refresh_from_db()
        self.assertIsNone(video.duration_seconds)

    def test_duration_seconds_is_none_for_zero_duration(self) -> None:
        video = Video.objects.create(channel=self.channel, video_id="v3", title="T", duration="PT0S")
        video.refresh_from_db()
        self.assertIsNone(video.duration_seconds)

    def test_is_short_not_set_by_save(self) -> None:
        """is_short is managed by the sync layer, not by save()"""
        video = Video.objects.create(
            channel=self.channel, video_id="v4", title="T", duration="PT30S", is_short=True
        )
        video.refresh_from_db()
        self.assertIs(video.is_short, True)

        video.title = "Updated"
        video.save()
        video.refresh_from_db()
        # is_short remains unchanged after a normal save
        self.assertIs(video.is_short, True)


# ─── VideoSearchService filter unit tests ─────────────────────────────────────


class VideoSearchServiceFilterTests(TestCase):
    """Unit tests for VideoSearchService duration and shorts filter methods"""

    def setUp(self) -> None:
        self.user = User.objects.create_user(
            username="testuser", email="filter@example.com", password="testpass123"  # nosec B105
        )
        self.channel = Channel.objects.create(channel_id="UC_filter", title="Filter Channel")
        UserChannel.objects.create(user=self.user, channel=self.channel)

        # Create videos with varying durations and is_short states
        # PT2M = 120s
        self.short_video = Video.objects.create(
            channel=self.channel, video_id="short1", title="Short", duration="PT2M", is_short=False
        )
        # PT10M = 600s
        self.medium_video = Video.objects.create(
            channel=self.channel, video_id="med1", title="Medium", duration="PT10M", is_short=False
        )
        # PT30M = 1800s
        self.long_video = Video.objects.create(
            channel=self.channel, video_id="long1", title="Long", duration="PT30M", is_short=False
        )
        # PT45S = 45s
        self.shorts_video = Video.objects.create(
            channel=self.channel, video_id="short_yt1", title="YT Short", duration="PT45S", is_short=True
        )
        # PT5M = 300s
        self.unknown_short_video = Video.objects.create(
            channel=self.channel, video_id="unknown1", title="Unknown", duration="PT5M", is_short=None
        )
        self.no_duration_video = Video.objects.create(
            channel=self.channel, video_id="nodur1", title="No Duration", duration=None, is_short=False
        )

        self.service = VideoSearchService(self.user)

    def _search(self, **kwargs):
        return list(self.service.search_videos(**kwargs))

    # ── is_short filter ───────────────────────────────────────────────────────

    def test_is_short_true_returns_only_confirmed_shorts(self) -> None:
        results = self._search(is_short=True)
        uuids = {v.uuid for v in results}
        self.assertIn(self.shorts_video.uuid, uuids)
        self.assertNotIn(self.short_video.uuid, uuids)
        self.assertNotIn(self.unknown_short_video.uuid, uuids)

    def test_is_short_false_excludes_confirmed_shorts_and_nulls(self) -> None:
        results = self._search(is_short=False)
        uuids = {v.uuid for v in results}
        self.assertNotIn(self.shorts_video.uuid, uuids)
        self.assertNotIn(self.unknown_short_video.uuid, uuids)
        self.assertIn(self.short_video.uuid, uuids)

    def test_is_short_none_returns_all_including_nulls(self) -> None:
        results = self._search(is_short=None)
        uuids = {v.uuid for v in results}
        self.assertIn(self.shorts_video.uuid, uuids)
        self.assertIn(self.unknown_short_video.uuid, uuids)
        self.assertIn(self.short_video.uuid, uuids)

    # ── shorter_than_seconds filter ───────────────────────────────────────────

    def test_shorter_than_returns_videos_below_threshold(self) -> None:
        # 300s threshold: short_video(120s) and shorts_video(45s) qualify
        results = self._search(shorter_than_seconds=300)
        uuids = {v.uuid for v in results}
        self.assertIn(self.short_video.uuid, uuids)  # 120s < 300
        self.assertIn(self.shorts_video.uuid, uuids)  # 45s < 300
        self.assertNotIn(self.medium_video.uuid, uuids)  # 600s >= 300
        self.assertNotIn(self.long_video.uuid, uuids)  # 1800s >= 300

    def test_shorter_than_excludes_videos_without_duration(self) -> None:
        results = self._search(shorter_than_seconds=300)
        uuids = {v.uuid for v in results}
        self.assertNotIn(self.no_duration_video.uuid, uuids)

    def test_shorter_than_boundary_is_exclusive(self) -> None:
        # A video exactly at the boundary (600s) should NOT be included
        results = self._search(shorter_than_seconds=600)
        uuids = {v.uuid for v in results}
        self.assertNotIn(self.medium_video.uuid, uuids)  # 600s is not < 600
        self.assertIn(self.short_video.uuid, uuids)  # 120s < 600

    # ── longer_than_seconds filter ────────────────────────────────────────────

    def test_longer_than_returns_videos_above_threshold(self) -> None:
        # 600s threshold: only long_video(1800s) qualifies
        results = self._search(longer_than_seconds=600)
        uuids = {v.uuid for v in results}
        self.assertIn(self.long_video.uuid, uuids)  # 1800s > 600
        self.assertNotIn(self.medium_video.uuid, uuids)  # 600s is not > 600
        self.assertNotIn(self.short_video.uuid, uuids)  # 120s < 600

    def test_longer_than_excludes_videos_without_duration(self) -> None:
        results = self._search(longer_than_seconds=60)
        uuids = {v.uuid for v in results}
        self.assertNotIn(self.no_duration_video.uuid, uuids)

    def test_longer_than_boundary_is_exclusive(self) -> None:
        # A video exactly at the boundary (1800s) should NOT be included
        results = self._search(longer_than_seconds=1800)
        uuids = {v.uuid for v in results}
        self.assertNotIn(self.long_video.uuid, uuids)  # 1800s is not > 1800

    # ── both filters combined (AND logic) ────────────────────────────────────

    def test_both_shorter_and_longer_than_applied_as_and(self) -> None:
        # 300s < duration < 700s → only medium_video(600s) qualifies
        results = self._search(shorter_than_seconds=700, longer_than_seconds=300)
        uuids = {v.uuid for v in results}
        self.assertIn(self.medium_video.uuid, uuids)  # 300 < 600 < 700
        self.assertNotIn(self.short_video.uuid, uuids)  # 120s <= 300
        self.assertNotIn(self.long_video.uuid, uuids)  # 1800s >= 700
        self.assertNotIn(self.no_duration_video.uuid, uuids)

    def test_no_filter_includes_no_duration_video(self) -> None:
        results = self._search()
        uuids = {v.uuid for v in results}
        self.assertIn(self.no_duration_video.uuid, uuids)

    # ── combination with is_short ─────────────────────────────────────────────

    def test_shorter_than_and_exclude_unknown_shorts(self) -> None:
        # shorter_than=700s AND is_short=False: excludes unknown_short_video (is_short=None)
        results = self._search(shorter_than_seconds=700, is_short=False)
        uuids = {v.uuid for v in results}
        self.assertIn(self.short_video.uuid, uuids)  # 120s < 700, is_short=False
        self.assertNotIn(self.unknown_short_video.uuid, uuids)  # is_short=None → excluded


# ─── VideoSearchParams.from_request ───────────────────────────────────────────


class VideoSearchParamsFromRequestTests(TestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(
            username="paramtest", email="param@example.com", password="testpass123"  # nosec B105
        )

    def _make_request(self, params: dict):
        mock_request = MagicMock()
        mock_request.query_params = params
        mock_request.user = self.user
        return mock_request

    def test_parses_shorter_than_minutes_to_seconds(self) -> None:
        params = VideoSearchParams.from_request(self._make_request({"shorter_than": "5"}))
        self.assertEqual(params.shorter_than_seconds, 300)  # 5 * 60

    def test_parses_longer_than_minutes_to_seconds(self) -> None:
        params = VideoSearchParams.from_request(self._make_request({"longer_than": "10"}))
        self.assertEqual(params.longer_than_seconds, 600)  # 10 * 60

    def test_shorter_than_zero_yields_none(self) -> None:
        params = VideoSearchParams.from_request(self._make_request({"shorter_than": "0"}))
        self.assertIsNone(params.shorter_than_seconds)

    def test_longer_than_zero_yields_none(self) -> None:
        params = VideoSearchParams.from_request(self._make_request({"longer_than": "0"}))
        self.assertIsNone(params.longer_than_seconds)

    def test_invalid_shorter_than_yields_none(self) -> None:
        params = VideoSearchParams.from_request(self._make_request({"shorter_than": "abc"}))
        self.assertIsNone(params.shorter_than_seconds)

    def test_absent_shorter_than_yields_none(self) -> None:
        params = VideoSearchParams.from_request(self._make_request({}))
        self.assertIsNone(params.shorter_than_seconds)

    def test_absent_longer_than_yields_none(self) -> None:
        params = VideoSearchParams.from_request(self._make_request({}))
        self.assertIsNone(params.longer_than_seconds)

    def test_parses_is_short_true(self) -> None:
        params = VideoSearchParams.from_request(self._make_request({"is_short": "true"}))
        self.assertIs(params.is_short, True)

    def test_parses_is_short_false(self) -> None:
        params = VideoSearchParams.from_request(self._make_request({"is_short": "false"}))
        self.assertIs(params.is_short, False)

    def test_absent_is_short_yields_none(self) -> None:
        params = VideoSearchParams.from_request(self._make_request({}))
        self.assertIsNone(params.is_short)

    def test_invalid_is_short_yields_none(self) -> None:
        params = VideoSearchParams.from_request(self._make_request({"is_short": "maybe"}))
        self.assertIsNone(params.is_short)


# ─── API integration tests ────────────────────────────────────────────────────


class DurationAndShortsApiTests(TestCase):
    """Integration tests against the real API endpoint"""

    def setUp(self) -> None:
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="apiuser", email="api@example.com", password="testpass123"  # nosec B105
        )
        self.client.force_authenticate(user=self.user)

        self.channel = Channel.objects.create(channel_id="UC_api", title="API Channel")
        UserChannel.objects.create(user=self.user, channel=self.channel)

        # PT2M = 120s
        self.short_video = Video.objects.create(
            channel=self.channel, video_id="api_short", title="Short", duration="PT2M", is_short=False
        )
        # PT30M = 1800s
        self.long_video = Video.objects.create(
            channel=self.channel, video_id="api_long", title="Long", duration="PT30M", is_short=False
        )
        # PT45S = 45s
        self.yt_short = Video.objects.create(
            channel=self.channel, video_id="api_yt", title="YT Short", duration="PT45S", is_short=True
        )
        # PT5M = 300s
        self.unknown_video = Video.objects.create(
            channel=self.channel, video_id="api_unknown", title="Unknown Short", duration="PT5M", is_short=None
        )

    def test_is_short_true_returns_only_confirmed_shorts(self) -> None:
        response = self.client.get("/api/videos?is_short=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {v["video_id"] for v in response.data["results"]}
        self.assertIn("api_yt", ids)
        self.assertNotIn("api_short", ids)
        self.assertNotIn("api_unknown", ids)

    def test_is_short_false_excludes_confirmed_shorts_and_nulls(self) -> None:
        response = self.client.get("/api/videos?is_short=false")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {v["video_id"] for v in response.data["results"]}
        self.assertNotIn("api_yt", ids)
        self.assertNotIn("api_unknown", ids)
        self.assertIn("api_short", ids)

    def test_shorter_than_filters_by_minutes(self) -> None:
        # shorter_than=3 → < 180s: api_yt(45s) and api_short(120s) qualify
        response = self.client.get("/api/videos?shorter_than=3")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {v["video_id"] for v in response.data["results"]}
        self.assertIn("api_short", ids)  # 120s < 180
        self.assertIn("api_yt", ids)  # 45s < 180
        self.assertNotIn("api_long", ids)

    def test_longer_than_filters_by_minutes(self) -> None:
        # longer_than=10 → > 600s: api_long(1800s) qualifies
        response = self.client.get("/api/videos?longer_than=10")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {v["video_id"] for v in response.data["results"]}
        self.assertIn("api_long", ids)
        self.assertNotIn("api_short", ids)
        self.assertNotIn("api_yt", ids)

    def test_shorter_and_longer_than_combined(self) -> None:
        # shorter_than=10 (600s) AND longer_than=2 (120s) → 120s < duration < 600s
        # api_unknown(300s) and api_short(120s - boundary, not > 120) could qualify
        # api_unknown(300s): 120 < 300 < 600 → included
        response = self.client.get("/api/videos?shorter_than=10&longer_than=2")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {v["video_id"] for v in response.data["results"]}
        self.assertIn("api_unknown", ids)  # 300s: 120 < 300 < 600
        self.assertNotIn("api_long", ids)  # 1800s >= 600
        self.assertNotIn("api_yt", ids)  # 45s <= 120

    def test_combination_shorter_than_and_is_short(self) -> None:
        # shorter_than=10 (600s) AND is_short=false: api_unknown(is_short=None) excluded
        response = self.client.get("/api/videos?shorter_than=10&is_short=false")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {v["video_id"] for v in response.data["results"]}
        self.assertNotIn("api_unknown", ids)  # is_short=None → excluded by is_short=false


# ─── Backfill management command tests ───────────────────────────────────────


class BackfillDurationFieldsCommandTests(TestCase):
    """Tests for the backfill_duration_fields management command"""

    def setUp(self) -> None:
        self.channel = Channel.objects.create(channel_id="UC_backfill", title="Backfill Channel")

    @patch("videos.management.commands.backfill_duration_fields.check_is_short_via_redirect")
    def test_populates_duration_seconds_and_is_short(self, mock_check: MagicMock) -> None:
        mock_check.return_value = False
        video = Video.objects.create(
            channel=self.channel, video_id="bf1", title="T", duration="PT5M", is_short=None
        )
        # Override duration_seconds to None to simulate backfill scenario
        Video.objects.filter(pk=video.pk).update(duration_seconds=None)

        from django.core.management import call_command
        from io import StringIO

        out = StringIO()
        call_command("backfill_duration_fields", stdout=out)

        video.refresh_from_db()
        self.assertEqual(video.duration_seconds, 300)  # PT5M = 300s
        self.assertIs(video.is_short, False)

    @patch("videos.management.commands.backfill_duration_fields.check_is_short_via_redirect")
    def test_skips_already_set_without_force(self, mock_check: MagicMock) -> None:
        mock_check.return_value = True
        Video.objects.create(
            channel=self.channel, video_id="bf2", title="T", duration="PT5M", is_short=True
        )
        from django.core.management import call_command
        from io import StringIO

        call_command("backfill_duration_fields", stdout=StringIO())
        # Already has is_short set, so check_is_short_via_redirect should NOT be called
        mock_check.assert_not_called()

    @patch("videos.management.commands.backfill_duration_fields.check_is_short_via_redirect")
    def test_force_flag_reprocesses_all_rows(self, mock_check: MagicMock) -> None:
        mock_check.return_value = None
        Video.objects.create(
            channel=self.channel, video_id="bf3", title="T", duration="PT5M", is_short=True
        )
        from django.core.management import call_command
        from io import StringIO

        call_command("backfill_duration_fields", "--force", stdout=StringIO())
        mock_check.assert_called_once()

    @patch("videos.management.commands.backfill_duration_fields.check_is_short_via_redirect")
    def test_handles_none_is_short_result(self, mock_check: MagicMock) -> None:
        """When check returns None, is_short is stored as None (unknown)"""
        mock_check.return_value = None
        video = Video.objects.create(
            channel=self.channel, video_id="bf4", title="T", duration="PT5M", is_short=None
        )
        from django.core.management import call_command
        from io import StringIO

        call_command("backfill_duration_fields", stdout=StringIO())
        video.refresh_from_db()
        self.assertIsNone(video.is_short)

    @patch("videos.management.commands.backfill_duration_fields.check_is_short_via_redirect")
    def test_batch_size_option(self, mock_check: MagicMock) -> None:
        mock_check.return_value = False
        for i in range(5):
            Video.objects.create(
                channel=self.channel, video_id=f"batch{i}", title=f"T{i}", duration="PT1M", is_short=None
            )
        from django.core.management import call_command
        from io import StringIO

        call_command("backfill_duration_fields", "--batch-size", "2", stdout=StringIO())
        self.assertEqual(mock_check.call_count, 5)
