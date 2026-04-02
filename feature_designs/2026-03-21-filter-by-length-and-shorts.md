# Filter by Length and Filter Shorts

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Current System Analysis](#current-system-analysis)
- [Technical Design](#technical-design)
- [Implementation Phases](#implementation-phases)
- [Performance Considerations](#performance-considerations)
- [Testing Strategy](#testing-strategy)
- [Risks and Mitigation](#risks-and-mitigation)
- [Conclusion](#conclusion)

---

## Overview

Add duration-based video filtering to allow users to find videos by length (free-form "shorter than X min" / "longer than Y min" inputs) and to quickly exclude or include YouTube Shorts.

> **Research note — YouTube API and Shorts detection**
>
> The YouTube Data API v3 **has no official field** (`isShort`, `videoType`, etc.) to identify Shorts. Two reliable signals exist — no heuristics are used. If neither can confirm, `is_short` is stored as `NULL` (unknown).
>
> **Signal 1 — Channel Shorts playlist** (preferred for bulk sync):
> `channels.list?part=contentDetails` returns `contentDetails.relatedPlaylists.shorts` — the playlist ID of the channel's Shorts. Fetching `playlistItems.list` on that playlist ID yields all Short video IDs for the channel. Any video ID found in this playlist is definitively a Short. This is one API call per channel, making it efficient for initial sync and channel updates. Costs quota (1 unit for `playlistItems.list` per page).
>
> **Signal 2 — HTTP redirect check** (per-video fallback when playlist unavailable):
> `HEAD https://www.youtube.com/shorts/{video_id}` with `allow_redirects=False`:
> - Status **200** → Short (`is_short = True`)
> - Status **3xx** → not a Short (`is_short = False`)
> - Any other status or network error → log warning, store `is_short = NULL`
>
> **No heuristic fallback.** Duration thresholds and hashtag scanning are not used — they produce false positives and false negatives that would silently mislead users.
>
> **`is_short` is nullable** (`NULL` = detection was not possible). The `is_short=True` filter excludes `NULL` rows; the `is_short=False` filter also excludes `NULL` rows — only confirmed values are surfaced.

---

## Problem Statement

Users currently have no way to filter videos by duration. This creates two distinct friction points:

1. **Content length preference** — A user who has 10 minutes may want only short videos; a user looking for deep dives wants long-form content. Scrolling through a mixed-length feed to find the right video wastes time.
2. **YouTube Shorts pollution** — Channels that publish both regular videos and Shorts mix them in the same feed. Shorts are usually vertical, reels-style content that many users find undesirable when looking for informational or entertainment long-form content. There is currently no way to hide them.

---

## Solution Overview

Introduce two independent filter controls surfaced in the existing `FilterButtons` component:

**1. Duration range inputs** (`shorterThan` / `longerThan`) — free-form minute inputs:

| URL param | Frontend field | Backend field | Filter logic | Notes |
|---|---|---|---|---|
| `shorter_than` | `shorterThan: number` (minutes) | `shorter_than_seconds: int` (seconds) | `duration_seconds < value` | Exclusive upper bound |
| `longer_than` | `longerThan: number` (minutes) | `longer_than_seconds: int` (seconds) | `duration_seconds > value` | Exclusive lower bound |

Frontend stores minutes; backend `from_request()` converts to seconds (`minutes * 60`). Both filters may be active simultaneously (AND logic). No fixed buckets, no user preference storage — the user types their own threshold directly.

> **Design decision (2026-03)**: An earlier design used a `DurationFilter` enum (`short`/`medium`/`long`) backed by `UserWatchPreferences.short_max_seconds`/`medium_max_seconds`. This was abandoned in favour of free-form range inputs because it eliminates per-request preference lookups, avoids the user-configurable threshold UI complexity, and gives users direct control. Migrations `0009_add_duration_thresholds` and `0010_remove_duration_thresholds` represent this pivot.

**2. Shorts toggle** (`isShort` / `is_short`) — independent boolean:

| Value | Label | Filter logic | Notes |
|---|---|---|---|
| (none) | — | No Shorts filter | Default |
| `true` | Shorts only | `is_short = true` | Flag set at sync time |
| `false` | Exclude Shorts | `is_short = false` | Hides Shorts from results |

The two controls are **composable**: a user can filter for "videos under 10 minutes, excluding Shorts" (`shorter_than=10&is_short=false`).

Key capabilities:
- Shorts identified by a **precomputed `is_short` boolean** on the `Video` model, set at sync time — no runtime string parsing or extra API calls during filtering.
- Duration filters on a **precomputed `duration_seconds` integer** column with a database index.
- Both persisted in URL — shareable and bookmarkable.
- Composable with all existing filters (watch status, tags, search, sort).

---

## Current System Analysis

### Duration storage

`Video.duration` uses the custom `YouTubeDurationField` (a `CharField`) that stores the raw YouTube ISO 8601 format (`PT1H2M3S`). The field exposes:

- `duration_to_seconds(value: str) -> int` — converts a stored string to total seconds.
- `get_duration_seconds()` on the `Video` instance — wraps the field method.

Duration is currently indexed nowhere and used only for display inside `VideoCard`.

### Filter pipeline

```
URL params → useVideoFilters (hook) → buildVideoQueryParams (service)
  → GET /api/videos/?... → VideoViewSet.get_queryset()
  → VideoSearchService → Django ORM queryset → VideoListSerializer
```

Relevant files:
- `frontend/hooks/useVideoFilters.ts` — URL ↔ state synchronisation, exposes named update functions
- `frontend/services/videos.ts` — `buildVideoQueryParams()` (signature: `(params: VideoFilters & PaginationParams): string`)
- `frontend/app/videos/components/FilterButtons.tsx` — filter UI (actual path — not `frontend/components/`)
- `frontend/lib/reactQueryConfig.ts` — query key factory (`videosWithFilter`) and cache configs
- `frontend/locales/en/videos.json` — i18n strings for videos namespace
- `backend/videos/validators.py` — `VideoSearchParams` Pydantic model with `from_request()` classmethod
- `backend/videos/services/search.py` — `VideoSearchService.search_videos()` (primary filter entry point)
- `backend/videos/models.py` — `Video` model (extends `TimestampMixin`), `YouTubeDurationField` in `backend/videos/fields.py`

### Existing filter shape

```typescript
// frontend/types.ts — camelCase keys (CURRENT STATE — already implemented)
export interface VideoFilters {
  filter: string;                          // watch status ('all' | 'watched' | 'unwatched')
  selectedTags: string[];
  tagMode: TagModeType;
  searchQuery: string;
  notInterestedFilter: NotInterestedFilter;
  sort?: VideoSortMode;
  shorterThan?: number;    // minutes — new (DONE)
  longerThan?: number;     // minutes — new (DONE)
  isShort?: boolean;       // new (DONE)
}
```

```python
# backend/videos/validators.py — snake_case keys (CURRENT STATE — already implemented)
class VideoSearchParams(BaseModel):
    tags: Optional[List[str]] = None
    tag_mode: TagMode = TagMode.ANY
    watch_status: Optional[WatchStatus] = None
    not_interested_filter: NotInterestedFilter = NotInterestedFilter.EXCLUDE
    user: Optional[User] = None
    shorter_than_seconds: Optional[int] = None  # parsed from `shorter_than` query param (minutes → seconds)
    longer_than_seconds: Optional[int] = None   # parsed from `longer_than` query param (minutes → seconds)
    is_short: Optional[bool] = None             # new (DONE)
# Note: search and sort are NOT fields on VideoSearchParams.
# search is handled by DRF's SearchFilter backend on VideoViewSet.
# sort is parsed separately via VideoSortParams.model_validate().
```

---

## Technical Design

### 1. Database — two new columns + index ✓ DONE

Filtering directly on the `duration` varchar using string parsing inside SQL is fragile and slow. Two precomputed columns are added instead:

- **`duration_seconds`** — integer seconds, indexed, used for the length-bucket filters.
- **`is_short`** — nullable boolean, used for the Shorts filter. `NULL` = detection not yet attempted.

```python
# backend/videos/migrations/0007_add_duration_seconds_and_is_short.py — DONE
# Schema-only migration (no RunPython backfill):
# 1. duration_seconds = IntegerField(null=True, blank=True, db_index=True)
# 2. is_short = BooleanField(null=True, blank=True, db_index=True)
#    NULL = detection not yet attempted. Default is NULL, not False.
# Existing rows have duration_seconds=None and is_short=None until the
# backfill command is run manually.
```

**Backfill management command** (schema migration is schema-only; backfill is a separate manually-run command):

```
backend/videos/management/commands/backfill_duration_fields.py
```

The command:
- Iterates `Video` rows with `is_short=None` by default (re-runnable; `--force` re-checks all rows)
- Computes `duration_seconds` from the existing `duration` field in-process (no network)
- Calls `check_is_short_via_redirect()` per video for `is_short` — stores `True`, `False`, or `None` (no guessing)
- Saves via `bulk_update` in batches of 50 (rate-friendly for HEAD requests to `youtube.com`)
- Prints progress (`Processed 500/12340...`) using `self.stdout.write`
- Accepts `--batch-size` (default 50) and `--force` flag

```python
# Pseudostructure
class Command(BaseCommand):
    help = 'Backfill duration_seconds and is_short for existing videos'

    def add_arguments(self, parser):
        parser.add_argument('--batch-size', type=int, default=50)
        parser.add_argument('--force', action='store_true',
                            help='Re-check videos that already have is_short set')

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        queryset = Video.objects.all() if options['force'] else Video.objects.filter(is_short__isnull=True)
        total = queryset.count()
        # process in batches:
        #   compute duration_seconds in-process
        #   call check_is_short_via_redirect(video.video_id) → True / False / None
        #   bulk_update(['duration_seconds', 'is_short'])
        self.stdout.write(self.style.SUCCESS(f'Done. Updated {total} videos.'))
```

**Video model change — ✓ DONE** (`backend/videos/models.py`):

```python
# CURRENT STATE — already implemented
class Video(TimestampMixin):
    ...
    duration = YouTubeDurationField(blank=True, null=True)  # existing — max_length=20
    duration_seconds = models.IntegerField(null=True, blank=True, db_index=True)  # DONE
    is_short = models.BooleanField(null=True, blank=True, db_index=True)          # DONE — NULL = unknown

    def save(self, *args, **kwargs):
        # Only duration_seconds is computed here — is_short is set by the sync layer before
        # save() is called and stored as-is (True/False/None). No computation in save().
        raw_seconds = self.get_duration_seconds()
        self.duration_seconds = raw_seconds if raw_seconds else None  # store None when 0/unparseable
        super().save(*args, **kwargs)
```

`is_short` is **not** computed in `save()`. It is set by the sync layer before calling `update_or_create()`. This keeps `save()` free of network I/O.

> **Note on `from_db_value`**: `YouTubeDurationField.from_db_value()` converts the stored raw ISO 8601 string (e.g., `PT1H2M3S`) to formatted display string (e.g., `1:02:03`) when reading from the database. `get_duration_seconds()` calls `duration_to_seconds()` which handles BOTH formats, so `self.duration` being in either format during `save()` is safe.

**Sync-layer Shorts detection — two methods, no heuristic:**

**Method 1 — Shorts playlist lookup** (used during channel sync in `channel_updater.py` and `fetch_channel()` in `youtube.py`):

**STATUS: NOT YET IMPLEMENTED.** `_get_shorts_video_ids()` does not exist. This is the main remaining sync-layer work.

Before fetching videos for a channel, retrieve the channel's Shorts playlist ID from `channels.list?part=contentDetails`, then fetch all Short video IDs from `playlistItems.list` on that playlist. Pass the resulting set into the video-building loop so each video can be classified in O(1):

```python
# Pseudostructure in youtube.py / channel_updater.py
# _get_shorts_video_ids() is a METHOD on the YouTubeService class (which starts at line 128),
# because it needs the authenticated youtube_client — not a module-level function.

def _get_shorts_video_ids(self, channel_id: str) -> set[str]:
    # 1. channels.list(part='contentDetails', id=channel_id)
    #    → contentDetails.relatedPlaylists.shorts  (the Shorts playlist ID, may be absent)
    # 2. if playlist ID present: playlistItems.list(part='contentDetails', playlistId=..., maxResults=50)
    #    → paginate, collect all video IDs
    # 3. return set of video IDs; return empty set if no Shorts playlist or on any API error
    ...

# Then in get_channel_videos() or equivalent method, before the video loop:
try:
    shorts_video_ids = self._get_shorts_video_ids(channel_id)
    playlist_fetch_succeeded = True
except Exception:
    logger.warning("Shorts playlist fetch failed for channel %s, falling back to per-video check", channel_id)
    shorts_video_ids = set()
    playlist_fetch_succeeded = False

# Then in the video_data dict per video:
if playlist_fetch_succeeded:
    is_short = video["id"] in shorts_video_ids  # True or False (confirmed)
else:
    is_short = check_is_short_via_redirect(video["id"])  # True, False, or None

video_data = {
    ...
    "is_short": is_short,
}
```

> **Note**: A video absent from the Shorts playlist is confirmed as not-Short only if the playlist was successfully fetched. If the playlist fetch fails, fall through to Method 2.

**Method 2 — HTTP redirect check** (per-video, used when playlist fetch fails or for the backfill command):

`check_is_short_via_redirect(video_id: str) -> bool | None` — **✓ DONE** — exists as a **module-level function** in `backend/videos/services/youtube.py` (lines 92-109). Uses the existing `http` singleton (`TimeoutSession`):

```python
# Already implemented — module-level function in backend/videos/services/youtube.py lines 92-109
_SHORTS_URL_TEMPLATE = 'https://www.youtube.com/shorts/{video_id}'

def check_is_short_via_redirect(video_id: str) -> bool | None:
    """
    Returns True (Short), False (not Short), or None (could not determine).
    No heuristic fallback — None means unknown, not a guess.
    """
    try:
        response = http.head(_SHORTS_URL_TEMPLATE.format(video_id=video_id), allow_redirects=False)
        if response.status_code == 200:
            return True
        if 300 <= response.status_code < 400:
            return False
        logger.warning('Unexpected status %s for Shorts check on video %s', response.status_code, video_id)
        return None
    except Exception:
        logger.warning('Shorts redirect check failed for video %s', video_id, exc_info=True)
        return None
```

**`is_short` in `video_data`**: `True`, `False`, or `None`. Both `fetch_channel()` and `_fetch_new_videos()` already spread `video_data` into `update_or_create(defaults=...)` — no changes needed in those callers once `is_short` is added to the `video_data` dict.

### 2. Backend — Pydantic validator ✓ DONE

`VideoSearchParams` lives in `backend/videos/validators.py` (lines 56-123) and uses `from_request(request)` classmethod (called by `VideoViewSet.get_queryset()`). No `DurationFilter` enum — duration is handled as raw seconds derived from minute params.

```python
# backend/videos/validators.py — CURRENT STATE (already implemented)

class VideoSearchParams(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    tags: Optional[List[str]] = None
    tag_mode: TagMode = TagMode.ANY
    watch_status: Optional[WatchStatus] = None
    not_interested_filter: NotInterestedFilter = NotInterestedFilter.EXCLUDE
    user: Optional[User] = None
    shorter_than_seconds: Optional[int] = None  # converted from `shorter_than` query param (minutes)
    longer_than_seconds: Optional[int] = None   # converted from `longer_than` query param (minutes)
    is_short: Optional[bool] = None             # None = no filter, True = Shorts only, False = exclude

# from_request() parses duration via a helper:
#   def _parse_minutes_to_seconds(param: str) -> Optional[int]:
#       raw = request.query_params.get(param)
#       if raw is None: return None
#       try:
#           minutes = int(raw)
#           return minutes * 60 if minutes > 0 else None
#       except ValueError: return None
#   shorter_than_seconds = _parse_minutes_to_seconds("shorter_than")
#   longer_than_seconds = _parse_minutes_to_seconds("longer_than")
#   is_short: True if raw == 'true', False if raw == 'false', else None
```

### 3. Backend — VideoSearchService filtering ✓ DONE

`search_videos()` in `backend/videos/services/search.py` (lines 39-95). No `DurationFilter` enum — duration handled with raw seconds params.

```python
# backend/videos/services/search.py — CURRENT STATE (already implemented)

class VideoSearchService:
    ...

    def _apply_duration_filter(
        self,
        queryset: QuerySet[Video],
        shorter_than_seconds: Optional[int],
        longer_than_seconds: Optional[int],
    ) -> QuerySet[Video]:
        """Filter by optional shorter-than / longer-than boundaries; both may apply simultaneously"""
        if not shorter_than_seconds and not longer_than_seconds:
            return queryset
        queryset = queryset.exclude(duration_seconds__isnull=True)
        if shorter_than_seconds:
            queryset = queryset.filter(duration_seconds__lt=shorter_than_seconds)  # exclusive
        if longer_than_seconds:
            queryset = queryset.filter(duration_seconds__gt=longer_than_seconds)   # exclusive
        return queryset

    def _apply_is_short_filter(self, queryset: QuerySet[Video], is_short: Optional[bool]) -> QuerySet[Video]:
        """Both True and False explicitly exclude NULL (unknown) rows"""
        if is_short is None:
            return queryset
        return queryset.filter(is_short=is_short)

    def search_videos(
        self,
        tag_names: Optional[List[str]] = None,
        tag_mode: TagMode = TagMode.ANY,
        watch_status: Optional[WatchStatus] = None,
        not_interested_filter: NotInterestedFilter = NotInterestedFilter.EXCLUDE,
        shorter_than_seconds: Optional[int] = None,
        longer_than_seconds: Optional[int] = None,
        is_short: Optional[bool] = None,
    ) -> QuerySet[Video]:
        # ... existing subscription filter + tag/watch/not-interested filters ...
        queryset = self._apply_is_short_filter(queryset, is_short)
        queryset = self._apply_duration_filter(queryset, shorter_than_seconds, longer_than_seconds)
        return queryset.distinct()
```

Note: boundary semantics are **exclusive** (`__lt` for shorter-than, `__gt` for longer-than). A video with `duration_seconds == shorter_than_seconds` is NOT included.

### 4. Backend — ViewSet parameter extraction ✓ DONE

`VideoViewSet.get_queryset()` in `backend/videos/views.py` (lines 109-137) already passes both duration params:

```python
# backend/videos/views.py — CURRENT STATE (already implemented)

search_params = VideoSearchParams.from_request(self.request)
search_service = VideoSearchService(user)
queryset = search_service.search_videos(
    tag_names=search_params.tags,
    tag_mode=search_params.tag_mode,
    watch_status=search_params.watch_status,
    not_interested_filter=search_params.not_interested_filter,
    shorter_than_seconds=search_params.shorter_than_seconds,
    longer_than_seconds=search_params.longer_than_seconds,
    is_short=search_params.is_short,
)
return search_service.apply_ordering(queryset, sort_params.sort)
```

### 5. Frontend — TypeScript type ✓ DONE

```typescript
// frontend/types.ts — CURRENT STATE (already implemented)

export interface VideoFilters {
  filter: string;
  selectedTags: string[];
  tagMode: TagModeType;
  searchQuery: string;
  notInterestedFilter: NotInterestedFilter;
  sort?: VideoSortMode;
  shorterThan?: number;   // minutes — free-form input
  longerThan?: number;    // minutes — free-form input
  isShort?: boolean;      // undefined = no filter, true = Shorts only, false = exclude Shorts
}
```

No `DurationFilter` enum — duration is user-typed minutes stored as plain numbers.

### 6. Frontend — URL state hook ✓ DONE

`frontend/hooks/useVideoFilters.ts` — already implemented with the raw-minutes approach:

```typescript
// frontend/hooks/useVideoFilters.ts — CURRENT STATE (already implemented)

// URL params: `shorter_than`, `longer_than` (minutes as integers), `is_short`

// Parsing (URL → state):
const rawShorterThan = searchParams.get('shorter_than');
const shorterThan: number | undefined = rawShorterThan && parseInt(rawShorterThan) > 0
  ? parseInt(rawShorterThan) : undefined;

const rawLongerThan = searchParams.get('longer_than');
const longerThan: number | undefined = rawLongerThan && parseInt(rawLongerThan) > 0
  ? parseInt(rawLongerThan) : undefined;

const rawIsShort = searchParams.get('is_short');
const isShort: boolean | undefined =
  rawIsShort === 'true' ? true : rawIsShort === 'false' ? false : undefined;

// Named update functions exposed by hook:
const updateShorterThan = (minutes: number | undefined) => updateUrl({ ...currentFilters, shorterThan: minutes });
const updateLongerThan = (minutes: number | undefined) => updateUrl({ ...currentFilters, longerThan: minutes });
const updateIsShort = (value: boolean | undefined) => updateUrl({ ...currentFilters, isShort: value });
```

### 7. Frontend — API query builder ✓ DONE

```typescript
// frontend/services/videos.ts — CURRENT STATE (already implemented)

export const buildVideoQueryParams = (filters: VideoFilters): string => {
  const params = new URLSearchParams();
  // ... existing params ...
  if (filters.shorterThan !== undefined && filters.shorterThan > 0) {
    params.set('shorter_than', String(filters.shorterThan));  // minutes — backend converts to seconds
  }
  if (filters.longerThan !== undefined && filters.longerThan > 0) {
    params.set('longer_than', String(filters.longerThan));    // minutes — backend converts to seconds
  }
  if (filters.isShort !== undefined) {
    params.set('is_short', String(filters.isShort));
  }
  return params.toString();
};
```

### 8. Frontend — Filter UI ✓ DONE

File: `frontend/app/videos/components/FilterButtons.tsx`

The duration filter UI uses **number inputs with range sliders** (not enum pill buttons). The Shorts filter uses pill buttons.

Current JSX structure (top-to-bottom):
1. `div.FilterButton__watch-status` — watch status buttons
2. Duration section — two number inputs: "Shorter than X min" and "Longer than Y min", each with a range slider. Wired to `updateShorterThan()` / `updateLongerThan()` from `useVideoFilters`.
3. Shorts section — three pill buttons: [ All ] [ Shorts only ] [ Hide Shorts ]. Wired to `updateIsShort()`.
4. `div.FilterButton__not-interested` — not-interested buttons
5. Sort selector row
6. `SearchAndTagFilter` — tag/search component

**i18n keys** already added to `frontend/locales/en/videos.json`:

```json
{
  "durationFilter": {
    "shorterThan": "Shorter than",
    "longerThan": "Longer than",
    "minutesSuffix": "min"
  },
  "shortsFilter": {
    "all": "All",
    "only": "Shorts only",
    "hide": "Hide Shorts"
  }
}
```

No `WatchPreferences` query needed in `FilterButtons` — the UI accepts free-form minute input, so no threshold labels to derive from user preferences.

### 9. Query key invalidation ✓ DONE

File: `frontend/lib/reactQueryConfig.ts` (camelCase — confirmed path).

The existing factory:
```typescript
videosWithFilter: (params: VideoFilters) => ['videos', 'filtered', params] as const,
```

`shorterThan`, `longerThan`, and `isShort` are part of the `VideoFilters` object, so they are automatically included in the cache key. No change needed.

### 10. User-Configurable Duration Thresholds (Settings) — ❌ ABANDONED

> **Decision (2026-03)**: User-configurable duration thresholds were designed but explicitly rejected during implementation. Migration `0009_add_duration_thresholds` added `short_max_seconds` and `medium_max_seconds` to `UserWatchPreferences`, and migration `0010_remove_duration_thresholds` immediately removed them. The current `UserWatchPreferences` model has no duration threshold fields.
>
> **Reason for abandonment**: The free-form `shorter_than`/`longer_than` minute input approach (Section 8) makes fixed threshold configuration unnecessary — users type their own boundary directly in the filter UI. This eliminates per-request preference DB lookups, the settings UI section, the cross-field validator, and frontend type changes.
>
> **Current model state**: `UserWatchPreferences` has only `auto_mark_watched_enabled` and `auto_mark_threshold`. No `short_max_seconds` or `medium_max_seconds`.
>
> **Artefacts to clean up — delete before running migrations:**
> - `backend/users/migrations/0009_add_duration_thresholds.py` — untracked, never applied. Delete it.
> - `backend/users/migrations/0010_remove_duration_thresholds.py` — untracked, never applied. Delete it.
>
> Both files are untracked and have never been applied to any database. Running them in sequence would be a no-op (add then immediately remove), but they would permanently pollute the migration history. Delete both before the next `python manage.py migrate` run.
>
> - `frontend/app/settings/components/DurationThresholdsSection.tsx` — untracked, never used. Delete it.

The original design (retained for historical reference):

#### Backend — model fields (ABANDONED)

The original plan was to add two new fields to `UserWatchPreferences` (migration: `backend/users/migrations/0009_add_duration_thresholds.py`):

```python
# backend/users/models.py — UserWatchPreferences (existing model)

short_max_seconds = models.IntegerField(
    default=240,
    validators=[MinValueValidator(60), MaxValueValidator(3600)],
    help_text="Videos shorter than this (in seconds) are classified as 'short'. Default: 240 (4 min).",
)
medium_max_seconds = models.IntegerField(
    default=1200,
    validators=[MinValueValidator(60), MaxValueValidator(7200)],
    help_text="Videos shorter than this (in seconds) are classified as 'medium'; at or above is 'long'. Default: 1200 (20 min).",
)
```

`short_max_seconds` must be < `medium_max_seconds` — enforced by a Pydantic validator in the update params (not a DB constraint, validated at the view layer).

#### Backend — serializer

Update `UserWatchPreferencesSerializer` (in `backend/users/serializers.py`) to include both new fields in `fields`:

```python
fields = (
    "auto_mark_watched_enabled",
    "auto_mark_threshold",
    "short_max_seconds",
    "medium_max_seconds",
)
```

#### Backend — Pydantic validator

Update `WatchPreferencesParams` (in `backend/videos/validators.py`) with the new fields and cross-field validation:

```python
class WatchPreferencesParams(BaseModel):
    auto_mark_watched_enabled: bool = True
    auto_mark_threshold_percent: Optional[int] = Field(default=None, ge=0, le=100)
    short_max_seconds: int = Field(default=240, ge=60, le=3600)
    medium_max_seconds: int = Field(default=1200, ge=60, le=7200)

    @model_validator(mode='after')
    def short_must_be_less_than_medium(self) -> 'WatchPreferencesParams':
        if self.short_max_seconds >= self.medium_max_seconds:
            raise ValueError('short_max_seconds must be less than medium_max_seconds')
        return self
```

#### Backend — filter service uses user thresholds

`_apply_duration_filter()` in `VideoSearchService` already uses `prefs.short_max_seconds` / `prefs.medium_max_seconds` — see section 3 for the full implementation. The `get_or_create` call adds one indexed PK lookup per filtered request; if it becomes a bottleneck, `select_related('watch_preferences')` can be added to the base queryset.

#### Frontend — TypeScript types

Extend the existing `WatchPreferences` and `WatchPreferencesUpdateRequest` interfaces in `frontend/types.ts`:

```typescript
export interface WatchPreferences {
  auto_mark_watched_enabled: boolean;
  auto_mark_threshold: number;
  short_max_seconds: number;    // new
  medium_max_seconds: number;   // new
}

export interface WatchPreferencesUpdateRequest {
  auto_mark_watched_enabled: boolean;
  auto_mark_threshold: number;
  short_max_seconds: number;    // new
  medium_max_seconds: number;   // new
}
```

#### Frontend — Settings UI

Add a `DurationThresholdsSection` component at `frontend/app/settings/components/DurationThresholdsSection.tsx`, following the exact same pattern as `WatchPreferencesSection.tsx`:

- Fetches preferences via `queryKeys.watchPreferences` (shared cache with existing section — same endpoint)
- Two number inputs (or sliders): "Short videos: up to X minutes" and "Long videos: over Y minutes"
- "Medium" boundary is derived automatically and shown as read-only: "Medium: X min – Y min"
- Validates `short_max < medium_max` before enabling Save
- Save calls `updateWatchPreferences()` (existing service function in `frontend/services/auth.ts`) — adds the two new fields to the existing request body
- On success: invalidates `queryKeys.watchPreferences` cache

Component is added to `frontend/app/settings/page.tsx` below `WatchPreferencesSection`.

**Constants** (add to `frontend/lib/watchPreferencesConstants.ts`):

```typescript
export const DEFAULT_SHORT_MAX_SECONDS = 240;
export const DEFAULT_MEDIUM_MAX_SECONDS = 1200;
export const MIN_SHORT_MAX_SECONDS = 60;   // 1 min
export const MAX_SHORT_MAX_SECONDS = 3600; // 1 hour (must stay < medium)
export const MIN_MEDIUM_MAX_SECONDS = 60;
export const MAX_MEDIUM_MAX_SECONDS = 7200; // 2 hours
```

**i18n keys** (add to `frontend/locales/en/settings.json` under a `"durationThresholds"` key):

```json
{
  "durationThresholds": {
    "title": "Video Length Categories",
    "description": "Customize the duration boundaries used for the short, medium, and long video filters",
    "shortLabel": "Short videos",
    "shortDescription": "Videos shorter than this duration",
    "longLabel": "Long videos",
    "longDescription": "Videos longer than this duration",
    "mediumDerived": "Medium videos: {{short}} – {{long}}",
    "validationError": "Short threshold must be less than long threshold",
    "saveChanges": "Save Changes",
    "cancel": "Cancel",
    "resetToDefaults": "Reset to defaults"
  }
}
```

---

## Implementation Phases

> **Current status (2026-03-28)**: Phases 1–4 are substantially complete. The one remaining backend item is Shorts playlist lookup in the sync layer (Phase 1 step 4). Cleanup of the abandoned `DurationThresholdsSection.tsx` is also needed. Phase 5 (QA) is the final gate before shipping.

### Phase 1 — Backend data layer ✓ MOSTLY DONE

| Step | Status | Notes |
|---|---|---|
| Add `duration_seconds` (nullable IntegerField, db_index) to `Video` model | ✓ Done | `backend/videos/models.py` |
| Add `is_short` (nullable BooleanField, db_index) to `Video` model | ✓ Done | `null=True, blank=True` — not `default=False` |
| Override `Video.save()` to compute `duration_seconds` only | ✓ Done | `is_short` not computed in save — sync layer sets it |
| `check_is_short_via_redirect(video_id)` function | ✓ Done | Module-level in `backend/videos/services/youtube.py` lines 92-109 |
| Migration `0007_add_duration_seconds_and_is_short.py` | ✓ Done | Schema-only, no backfill |
| Management command `backfill_duration_fields` | ✓ Done | `backend/videos/management/commands/backfill_duration_fields.py` |
| **`_get_shorts_video_ids()` + wire `is_short` into sync video_data dict** | **❌ REMAINING** | See below |

**Remaining sync-layer work** — add `_get_shorts_video_ids()` as a method on `YouTubeService` (class starting at line 128 in `youtube.py`) and wire it into the channel sync flow:

```python
# backend/videos/services/youtube.py

class YouTubeService:
    ...
    def _get_shorts_video_ids(self, channel_id: str) -> set[str]:
        """
        Returns set of video IDs confirmed as Shorts via the channel's Shorts playlist.
        Returns empty set if the Shorts playlist is absent or any API error occurs.
        """
        try:
            channels_response = self.youtube_client.channels().list(
                part='contentDetails', id=channel_id
            ).execute()
            items = channels_response.get('items', [])
            if not items:
                return set()
            shorts_playlist_id = (
                items[0]
                .get('contentDetails', {})
                .get('relatedPlaylists', {})
                .get('shorts')
            )
            if not shorts_playlist_id:
                return set()
            # Paginate through the Shorts playlist
            video_ids: set[str] = set()
            page_token = None
            while True:
                pl_response = self.youtube_client.playlistItems().list(
                    part='contentDetails',
                    playlistId=shorts_playlist_id,
                    maxResults=50,
                    pageToken=page_token,
                ).execute()
                for item in pl_response.get('items', []):
                    video_ids.add(item['contentDetails']['videoId'])
                page_token = pl_response.get('nextPageToken')
                if not page_token:
                    break
            return video_ids
        except Exception:
            logger.warning('Shorts playlist fetch failed for channel %s', channel_id, exc_info=True)
            return set()

    def get_channel_videos(self, channel_id: str, ...) -> list[dict]:
        # Before the video loop:
        try:
            shorts_video_ids = self._get_shorts_video_ids(channel_id)
            playlist_fetch_succeeded = True
        except Exception:
            shorts_video_ids = set()
            playlist_fetch_succeeded = False

        # In the video_data dict per video:
        if playlist_fetch_succeeded:
            is_short = video_id in shorts_video_ids  # True or False (confirmed)
        else:
            is_short = check_is_short_via_redirect(video_id)  # True, False, or None

        video_data = {
            ...
            'is_short': is_short,
        }
```

> Note: Find the exact method name that builds `video_data` dicts in `youtube.py` (grep for `video_id` + `update_or_create` callers) to identify the correct insertion point.

**Cleanup**: Delete `frontend/app/settings/components/DurationThresholdsSection.tsx` (abandoned — never used).

### Phase 2 — Backend API ✓ DONE

All items complete:
- `VideoSearchParams` has `shorter_than_seconds`, `longer_than_seconds`, `is_short` — `from_request()` parses `shorter_than`/`longer_than` (minutes → seconds) and `is_short`
- `VideoSearchService._apply_duration_filter(shorter_than_seconds, longer_than_seconds)` and `_apply_is_short_filter(is_short)` exist
- `VideoViewSet.get_queryset()` passes both duration params
- Backend tests in `backend/videos/tests/test_duration_and_shorts_filter.py` — comprehensive coverage

### Phase 3 — Frontend types and state ✓ DONE

All items complete:
- `VideoFilters` has `shorterThan?: number`, `longerThan?: number`, `isShort?: boolean`
- `useVideoFilters.ts` parses `shorter_than`/`longer_than` URL params and exposes `updateShorterThan()`, `updateLongerThan()`, `updateIsShort()`
- `buildVideoQueryParams()` sends `shorter_than`, `longer_than`, `is_short`
- i18n keys in `frontend/locales/en/videos.json` under `"durationFilter"` and `"shortsFilter"`

### Phase 4 — Frontend UI ✓ DONE

All items complete:
- Duration inputs (number + range slider) for `shorterThan` / `longerThan` in `FilterButtons.tsx`
- Shorts pill buttons wired to `updateIsShort()`

### Phase 5 — QA and edge cases (depends on all previous phases)
1. Test all filter combinations: `shorter_than` + `longer_than` together (AND logic), + `is_short` + watch status + tags + search.
2. Verify boundary semantics: a video with `duration_seconds == shorter_than_seconds` is NOT included (exclusive `__lt`). A video with `duration_seconds == longer_than_seconds` is NOT included (exclusive `__gt`).
3. Verify videos with `duration_seconds = NULL` are excluded from any duration-filtered query.
4. Verify `is_short = NULL` videos are excluded from both `is_short=true` and `is_short=false` filter results.
5. Confirm URL sharing: navigate to `?shorter_than=5&is_short=false` — filter inputs populate correctly.
6. Performance test with large dataset — confirm `duration_seconds` index is used (EXPLAIN ANALYZE on duration range queries).
7. Run backfill command on staging: `python manage.py backfill_duration_fields --batch-size 50` — confirm `duration_seconds` and `is_short` are populated.

### Phase 6 — User-configurable thresholds ❌ ABANDONED

See Section 10. No implementation needed.

---

## Performance Considerations

### Database
- `duration_seconds` index makes range queries `O(log n)` instead of full-table scans.
- The `save()` override computes seconds once on write, not on every read.
- Duration filter is applied as a WHERE clause before the JOIN/prefetch phase, reducing the dataset early.

### Frontend
- No additional API calls — duration filter is a query parameter on the existing `/api/videos/` endpoint.
- React Query cache naturally partitions by `shorterThan`/`longerThan`/`isShort` values within the `VideoFilters` object — no extra configuration needed.

### Migration
- The backfill data migration should batch updates (`Video.objects.bulk_update(...)`) to avoid row-level locking on large tables.

---

## Testing Strategy

### Backend ✓ MOSTLY DONE

Existing test file: `backend/videos/tests/test_duration_and_shorts_filter.py`

**Already covered:**
- `check_is_short_via_redirect()`: 200 → `True`; 302/301 → `False`; 404/500 → `None`; exception → `None`.
- `Video.save()` duration seconds computation from ISO 8601; NULL handling.
- `_apply_duration_filter()`: shorter-than (exclusive `__lt`), longer-than (exclusive `__gt`), both together (AND), NULL exclusion, boundary conditions.
- `_apply_is_short_filter()`: `True`/`False`/`None` behaviour; NULL rows excluded from `True` and `False`.
- `VideoSearchParams.from_request()`: minutes-to-seconds conversion; zero/invalid handling; `is_short` string parsing.
- Integration: `GET /api/videos/?shorter_than=3`, `?longer_than=10`, `?shorter_than=...&longer_than=...`, `?is_short=true/false`.
- Management command `backfill_duration_fields`: duration_seconds population, `is_short` via redirect check, `--force`, `--batch-size`, NULL handling.

**Still needed (add to `test_duration_and_shorts_filter.py` or a new file):**
- Unit tests for `_get_shorts_video_ids()`: channel with Shorts playlist returns correct set; channel without Shorts playlist (absent key) returns empty set; API error returns empty set and logs warning.
- Integration test: channel sync populates `is_short=True` for videos confirmed via Shorts playlist; `is_short=False` for videos confirmed as not in playlist; `is_short=None` when playlist fetch fails and redirect check also fails.

### Frontend ✓ MOSTLY DONE

Existing test files: `frontend/hooks/__tests__/useVideoFilters.test.ts`, `frontend/services/__tests__/videos.test.ts`, `frontend/app/videos/components/__tests__/FilterButtons.test.tsx`

**Already covered** (verify current test file contents):
- `useVideoFilters` URL parsing: `shorter_than`/`longer_than` (valid integer minutes); `is_short=true`/`false`/absent; invalid values produce `undefined`.
- `buildVideoQueryParams()`: `shorterThan` → `shorter_than`, `longerThan` → `longer_than`, `isShort` → `is_short`; absent fields produce no param; zero/negative produce no param.
- `FilterButtons`: duration input renders with correct values; Shorts buttons click-to-set and click-active-to-clear.

**Verify these are tested:**
- React Query cache key includes `shorterThan`/`longerThan`/`isShort` — changing any triggers a new fetch.

---

## Risks and Mitigation

| Risk | Impact | Status | Mitigation |
|---|---|---|---|
| Videos with `duration = null` (live streams, scheduled premieres) appear in duration-filtered results | Wrong results | ✓ Mitigated | `_apply_duration_filter()` explicitly excludes `duration_seconds__isnull=True` |
| `is_short` HTTP check adds latency to sync | Sync time increases per new video | ✓ Mitigated | `TimeoutSession` enforces timeout; Shorts playlist lookup (Method 1) eliminates per-video HTTP calls for bulk sync |
| `youtube.com/shorts/` endpoint behaviour changes | Detection breaks silently | ✓ Mitigated | Unexpected status codes log warnings and store `NULL` — no guessing |
| Shorts playlist absent or API call fails during sync | `is_short` stays `NULL` | ✓ Mitigated | Falls through to per-video HTTP redirect check; if that also fails, stores `NULL` — corrected on next sync |
| Existing rows have `is_short=NULL` and `duration_seconds=NULL` until backfill is run | Shorts filter and duration filter return fewer results — degrades gracefully | ✓ Acceptable | Run `python manage.py backfill_duration_fields` before release |
| Backfill command slow for large libraries | Long-running command | ✓ Mitigated | Default batch size 50; skips already-set rows without `--force`; safely re-runnable |
| YouTube API duration format edge cases (`PT0S`, `P0D`) | Wrong `duration_seconds` | ✓ Mitigated | `get_duration_seconds()` handles these; tested |
| `_get_shorts_video_ids()` not yet implemented | Shorts `is_short` not populated for new synced videos | ❌ Open | Remaining Phase 1 work; per-video redirect check works as fallback |
| Boundary semantics are exclusive (`__lt`, `__gt`) — not obvious to users | User expects "under 10 min" to include a 10-min video | ⚠ Acceptable | Consistent with common filter conventions; tests document the exact semantics |
| UI clutter — adding duration inputs + Shorts row | Discoverability vs. density | ✓ Mitigated | Duration inputs and Shorts pills are compact; follow established filter row pattern |

---

## Conclusion

The duration filter feature has minimal backend risk because the `duration` data is already stored; the work is exposing it for filtering. The `duration_seconds` computed column makes queries fast and decouples filtering logic from string parsing. On the frontend, the feature follows the established URL-driven filter pattern exactly, requiring incremental changes to the hook, service, and a single UI component. The Shorts bucket in particular directly addresses a common user frustration and requires no additional YouTube API data.
