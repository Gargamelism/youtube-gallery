# Not Interested Video Flow

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [Current System Analysis](#current-system-analysis)
5. [Technical Design](#technical-design)
   - [Database Schema Changes](#database-schema-changes)
   - [Backend API Design](#backend-api-design)
   - [Frontend Architecture](#frontend-architecture)
   - [URL State Management](#url-state-management)
   - [Internationalization](#internationalization)
6. [Implementation Phases](#implementation-phases)
7. [Performance Considerations](#performance-considerations)
8. [Testing Strategy](#testing-strategy)
9. [Risks and Mitigation](#risks-and-mitigation)
10. [Conclusion](#conclusion)

---

## Overview

This feature design introduces a "not interested" flow for videos, allowing users to mark videos they don't want to see and filter them from their feed. The implementation mirrors the existing watched/unwatched status pattern while adding a dismiss action via an "X" button on video cards.

**Key Capabilities:**
- Mark videos as "not interested" via an "X" button positioned on the top-right of video cards
- Filter videos to show only "not interested" items
- Default behavior excludes "not interested" videos from standard views
- Track when videos were marked as not interested
- Maintain consistency with existing watch status patterns

---

## Problem Statement

### User Pain Points

1. **Content Overload**: Users subscribe to channels but not all videos are relevant to their interests
2. **No Dismissal Mechanism**: Currently, users can only mark videos as watched or unwatched - there's no way to indicate disinterest without watching
3. **Feed Clutter**: Irrelevant videos remain in the unwatched feed indefinitely, making it harder to find content users actually want to watch
4. **YouTube Parity**: YouTube's native interface has a "Not interested" feature that users expect in similar applications

### Current Limitations

- Users must scroll past irrelevant videos repeatedly
- No way to clean up the feed without marking videos as watched (which would misrepresent viewing history)
- No analytics on content preferences (what types of videos users actively dismiss)
- Cannot review previously dismissed videos to undo mistakes

---

## Solution Overview

### High-Level Approach

Implement a three-state video interest system:
1. **Normal** (default): Video is available in standard feeds
2. **Watched**: User has marked as watched (existing functionality)
3. **Not Interested**: User has dismissed the video from standard feeds

The "not interested" status will:
- Be toggled via a subtle "X" button in the top-right corner of video cards
- Exclude videos from default "unwatched" and "all" filters
- Provide a dedicated filter to review and manage dismissed videos
- Store timestamp data for analytics and potential undo functionality

### Key Capabilities

**User Actions:**
- Click "X" button to mark video as not interested (with confirmation for accidental clicks)
- Filter to view only not interested videos
- Unmark videos from not interested status
- Continue using watched/unwatched status independently

**System Behavior:**
- Not interested videos excluded from default views automatically
- Stats updated to show not interested count
- Efficient database queries using existing optimization patterns
- Seamless integration with existing tag and search filters

---

## Current System Analysis

### Existing Watch Status Implementation

The application currently implements a robust watch status system with the following architecture:

**Database Layer:**
```python
class UserVideo(TimestampMixin):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, ...)
    video = models.ForeignKey("videos.Video", ...)
    is_watched = models.BooleanField(default=False)
    watched_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ("user", "video")
```

**API Endpoints:**
- `GET /api/videos/?watch_status=watched|unwatched|all` - Filtered video list
- `PUT /api/videos/{id}/watch` - Update watch status
- `GET /api/videos/stats/` - Video statistics

**Frontend State Management:**
- URL-driven filters using Next.js `useSearchParams`
- TanStack Query for data fetching with 90-second stale time
- Filter buttons component with count badges
- Mutation-based status updates with automatic query invalidation

**Performance Optimizations:**
- `Prefetch` objects with user-filtered querysets to avoid N+1 queries
- `EXISTS` subqueries for efficient filtering
- Centralized query key factories for cache management
- Strategic database indexes on UserVideo fields

### Patterns to Follow

1. **Boolean flag + timestamp pattern**: Store both `is_not_interested` and `not_interested_at`
2. **get_or_create pattern**: Idempotent API endpoints using `UserVideo.objects.get_or_create()`
3. **Enum-based validation**: Use Pydantic validators with enum for filter parameters
4. **Prefetch optimization**: Always use `Prefetch("user_videos", queryset=UserVideo.objects.filter(user=self.user))`
5. **SerializerMethodField pattern**: Access prefetched data via `obj.user_videos.first()`
6. **URL state management**: Filters stored in query params, parsed by custom hooks
7. **Query invalidation**: Invalidate both video list and stats on mutation success

---

## Technical Design

### Database Schema Changes

**Migration:** `backend/users/migrations/0004_add_not_interested_fields.py`

```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('users', '0003_add_performance_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='uservideo',
            name='is_not_interested',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='uservideo',
            name='not_interested_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddIndex(
            model_name='uservideo',
            index=models.Index(
                fields=['user', 'is_not_interested'],
                name='user_not_interested_idx'
            ),
        ),
    ]
```

**Updated Model:** `backend/users/models.py`

```python
class UserVideo(TimestampMixin):
    # Existing fields...
    is_watched = models.BooleanField(default=False)
    watched_at = models.DateTimeField(null=True, blank=True)

    # New fields
    is_not_interested = models.BooleanField(default=False)
    not_interested_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True, null=True)
```

**Rationale:**
- Follows existing pattern for `is_watched`/`watched_at`
- Indexed on `user` + `is_not_interested` for efficient filtering queries
- Nullable timestamp allows tracking when dismissal occurred
- No unique constraints needed (already enforced by `unique_together` on user+video)

### Backend API Design

#### 1. Update Not Interested Status Endpoint

**Endpoint:** `PUT /api/videos/{uuid}/not-interested`

**Request Body:**
```json
{
  "is_not_interested": true
}
```

**Response:**
```json
{
  "status": "success",
  "is_not_interested": true,
  "not_interested_at": "2025-10-25T10:30:00Z"
}
```

**Implementation:** `backend/videos/views.py`

```python
@action(detail=True, methods=["put"], url_path="not-interested")
def not_interested(self, request: Request, pk: Any = None) -> Response:
    """Mark video as not interested or restore to normal state"""
    video = self.get_object()
    user = cast(User, request.user)

    is_not_interested = request.data.get("is_not_interested", True)

    user_video, created = UserVideo.objects.get_or_create(
        user=user,
        video=video,
    )

    user_video.is_not_interested = is_not_interested
    user_video.not_interested_at = timezone.now() if is_not_interested else None
    user_video.save()

    return Response({
        "status": "success",
        "is_not_interested": user_video.is_not_interested,
        "not_interested_at": user_video.not_interested_at,
    })
```

**Error Handling:**
- 404: Video not found
- 400: Invalid request body (Pydantic validation)
- 401: Authentication required

#### 2. Video List Filtering Enhancement

**Updated Validator:** `backend/videos/validators.py`

```python
class NotInterestedFilter(str, Enum):
    """Filter options for not interested videos"""
    ONLY = "only"          # Show only not interested videos
    EXCLUDE = "exclude"    # Hide not interested videos (default)
    INCLUDE = "include"    # Show all videos regardless of not interested status

    @classmethod
    def from_param(cls, value: Optional[str]) -> Self:
        """Parse filter from parameter with default to EXCLUDE"""
        try:
            return cls(value)
        except (ValueError, TypeError):
            return cls.EXCLUDE

class VideoSearchValidator(BaseModel):
    # Existing fields...
    watch_status: Optional[WatchStatus] = Field(None)

    # New field
    not_interested_filter: NotInterestedFilter = Field(default=NotInterestedFilter.EXCLUDE)

    @field_validator("not_interested_filter", mode="before")
    @classmethod
    def validate_not_interested_filter(cls, value: Any) -> NotInterestedFilter:
        return NotInterestedFilter.from_param(value)
```

**Search Service Update:** `backend/videos/services/search.py`

```python
def _apply_not_interested_filter(
    self,
    queryset: QuerySet[Video],
    filter_mode: NotInterestedFilter
) -> QuerySet[Video]:
    """Apply not interested filtering using EXISTS subquery"""
    not_interested_exists = UserVideo.objects.filter(
        user=self.user,
        video=OuterRef("uuid"),
        is_not_interested=True
    )

    match filter_mode:
        case NotInterestedFilter.ONLY:
            return queryset.filter(Exists(not_interested_exists))

        case NotInterestedFilter.EXCLUDE:
            return queryset.filter(~Exists(not_interested_exists))

        case NotInterestedFilter.INCLUDE:
            return queryset

def search(self, params: VideoSearchValidator) -> QuerySet[Video]:
    """Execute video search with all filters"""
    queryset = self._get_base_queryset()

    # Apply existing filters...
    if params.watch_status:
        queryset = self._apply_watch_status_filter(queryset, params.watch_status)

    # Apply not interested filter (always, defaults to EXCLUDE)
    queryset = self._apply_not_interested_filter(queryset, params.not_interested_filter)

    # Apply tag, search filters...
    return queryset
```

**Query Parameters:**
- `not_interested_filter=only` - Show only not interested videos
- `not_interested_filter=exclude` - Hide not interested (default behavior)
- `not_interested_filter=include` - Show all videos

#### 3. Statistics Endpoint Update

**Updated Response:** `GET /api/videos/stats/`

```json
{
  "total": 150,
  "watched": 45,
  "unwatched": 90,
  "not_interested": 15
}
```

**Implementation:** `backend/videos/views.py`

```python
@action(detail=False, methods=["get"])
def stats(self, request: Request) -> Response:
    """Get video statistics for current user"""
    user = cast(User, request.user)

    # Existing stats...
    total_count = Video.objects.filter(
        channel__user_channels__user=user
    ).count()

    watched_count = UserVideo.objects.filter(
        user=user,
        is_watched=True
    ).count()

    unwatched_count = total_count - watched_count

    # New stat
    not_interested_count = UserVideo.objects.filter(
        user=user,
        is_not_interested=True
    ).count()

    return Response({
        "total": total_count,
        "watched": watched_count,
        "unwatched": unwatched_count,
        "not_interested": not_interested_count,
    })
```

#### 4. Serializer Updates

**VideoListSerializer:** `backend/videos/serializers.py`

```python
class VideoListSerializer(serializers.ModelSerializer):
    # Existing fields...
    is_watched = serializers.SerializerMethodField()
    watched_at = serializers.SerializerMethodField()

    # New fields
    is_not_interested = serializers.SerializerMethodField()
    not_interested_at = serializers.SerializerMethodField()

    notes = serializers.SerializerMethodField()

    def get_is_not_interested(self, obj: Video) -> bool:
        """Get not interested status from prefetched user_videos"""
        user_video = obj.user_videos.first()
        return user_video.is_not_interested if user_video else False

    def get_not_interested_at(self, obj: Video) -> Any:
        """Get not interested timestamp from prefetched user_videos"""
        user_video = obj.user_videos.first()
        return user_video.not_interested_at if user_video else None
```

**ViewSet Prefetch:** `backend/videos/views.py`

```python
def get_queryset(self) -> QuerySet[Video]:
    user = cast(User, self.request.user)

    return Video.objects.select_related("channel").prefetch_related(
        Prefetch(
            "user_videos",
            queryset=UserVideo.objects.filter(user=user)
        ),
        # ... other prefetches
    )
```

### Frontend Architecture

#### 1. Type Definitions

**Updated Types:** `frontend/types.ts`

```typescript
export interface Video {
  uuid: string;
  video_id: string;
  channel_title: string;
  title: string;
  description: string | null;
  published_at: string;
  duration: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  thumbnail_url: string;
  video_url: string;

  // Watch status
  is_watched: boolean;
  watched_at: string | null;
  notes: string | null;

  // Not interested status (new)
  is_not_interested: boolean;
  not_interested_at: string | null;

  channel_tags: ChannelTag[];
}

export enum NotInterestedFilter {
  ONLY = 'only',
  EXCLUDE = 'exclude',
  INCLUDE = 'include',
}

export interface VideoStats {
  total: number;
  watched: number;
  unwatched: number;
  not_interested: number; // new
}

export interface VideoFilters {
  filter: string;
  selectedTags: string[];
  tagMode: TagModeType;
  searchQuery: string;
  notInterestedFilter: NotInterestedFilter; // new
}
```

#### 2. API Service Layer

**Service Functions:** `frontend/services/videos.ts`

```typescript
export interface NotInterestedResponse {
  status: string;
  is_not_interested: boolean;
  not_interested_at: string | null;
}

export async function updateVideoNotInterested(
  videoId: string,
  isNotInterested: boolean
): Promise<ApiResponse<NotInterestedResponse>> {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/not-interested`, {
    ...getRequestOptions(),
    method: 'PUT',
    body: JSON.stringify({ is_not_interested: isNotInterested }),
  });
  return ResponseHandler.handle<NotInterestedResponse>(response);
}

export function buildVideoQueryParams(params: VideoFilters & PaginationParams): string {
  const queryParams = new URLSearchParams();

  // Existing parameters...
  if (params.filter && params.filter !== 'all') {
    queryParams.set('watch_status', params.filter);
  }

  // New parameter (always include, backend defaults to 'exclude')
  if (params.notInterestedFilter) {
    queryParams.set('not_interested_filter', params.notInterestedFilter);
  }

  // ... other parameters

  return queryParams.toString();
}
```

#### 3. Video Card Component

**Updated VideoCard:** `frontend/app/videos/components/VideoCard.tsx`

```typescript
interface VideoCardProps {
  video: Video;
  onWatch: () => void;
  onToggleWatched: (isWatched: boolean, notes?: string) => void;
  onToggleNotInterested: (isNotInterested: boolean) => void; // new
  notInterestedFilter: NotInterestedFilter; // new - to determine button appearance
}

export function VideoCard({
  video,
  onWatch,
  onToggleWatched,
  onToggleNotInterested,
  notInterestedFilter
}: VideoCardProps) {
  const { t } = useTranslation('videos');

  const handleNotInterestedClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onToggleNotInterested(!video.is_not_interested);
  };

  // Show "+" icon when viewing not interested filter (to mark as interested again)
  // Show "X" icon in normal views (to mark as not interested)
  const showingNotInterestedVideos = notInterestedFilter === NotInterestedFilter.ONLY
    || (notInterestedFilter === NotInterestedFilter.INCLUDE && video.is_not_interested);
  const IconComponent = showingNotInterestedVideos ? Plus : X;
  const buttonLabel = showingNotInterestedVideos ? t('markInterested') : t('markNotInterested');

  return (
    <div className="relative group">
      {/* Not Interested/Interested button - top right corner */}
      <button
        onClick={handleNotInterestedClick}
        className={`
          absolute top-2 right-2 z-10
          p-2 rounded-full
          transition-all duration-200
          ${video.is_not_interested
            ? showingNotInterestedVideos
              ? 'bg-green-100 text-green-700 opacity-100'
              : 'bg-red-100 text-red-700 opacity-100'
            : 'bg-white/90 text-gray-600 opacity-0 group-hover:opacity-100'
          }
          ${showingNotInterestedVideos
            ? 'hover:bg-green-100 hover:text-green-700'
            : 'hover:bg-red-100 hover:text-red-700'
          }
          focus:opacity-100 focus:outline-none focus:ring-2 ${
            showingNotInterestedVideos ? 'focus:ring-green-500' : 'focus:ring-red-500'
          }
        `}
        aria-label={buttonLabel}
        title={buttonLabel}
      >
        <IconComponent className="w-4 h-4" />
      </button>

      {/* Existing card content... */}
      <div className={video.is_not_interested && !showingNotInterestedVideos ? 'opacity-50' : ''}>
        {/* Thumbnail, title, description, etc. */}
      </div>

      {/* Existing watch button */}
      <button onClick={handleWatchedToggle}>
        {/* ... */}
      </button>
    </div>
  );
}
```

**Design Notes:**
- **Context-aware icon**: Shows "X" for dismissal in normal views, "+" for restoration when viewing dismissed videos
- **Color coding**: Red theme for dismissal ("X"), green theme for restoration ("+")
- Button positioned absolutely in top-right corner
- Hidden by default, shown on card hover (group-hover pattern)
- Always visible when video is marked not interested
- Click event stops propagation to prevent triggering video playback
- Dimmed card appearance when marked not interested (only in non-filtered views)
- **UX rationale**: When users filter to see dismissed videos (`not_interested_filter=only`), they're likely looking to restore some, so the "+" button makes the action clearer

#### 4. Filter Management

**Updated useVideoFilters Hook:** `frontend/hooks/useVideoFilters.ts`

```typescript
export function useVideoFilters(): VideoFilters & VideoFiltersActions {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current URL parameters
  const filter = searchParams.get('filter') || 'unwatched';
  const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  const tagMode = (searchParams.get('tag_mode') as TagModeType) || TagMode.ANY;
  const searchQuery = searchParams.get('search') || '';

  // New parameter (defaults to exclude)
  const notInterestedFilter = (searchParams.get('not_interested_filter') as NotInterestedFilter)
    || NotInterestedFilter.EXCLUDE;

  const updateNotInterestedFilter = (newFilter: NotInterestedFilter) => {
    updateUrl({ not_interested_filter: newFilter });
  };

  return {
    filter,
    selectedTags,
    tagMode,
    searchQuery,
    notInterestedFilter, // new
    updateFilter,
    updateTags,
    updateTagMode,
    updateSearchQuery,
    updateNotInterestedFilter, // new
    addTag,
    removeTag,
    areFiltersEqual,
  };
}
```

**Filter Buttons Component:** `frontend/app/videos/components/FilterButtons.tsx`

```typescript
export function FilterButtons({
  totalCount,
  watchedCount,
  unwatchedCount,
  notInterestedCount, // new
  onScrollModeChange
}: FilterButtonsProps) {
  const { t } = useTranslation('videos');
  const {
    filter,
    notInterestedFilter,
    updateFilter,
    updateNotInterestedFilter,
    // ... other filters
  } = useVideoFilters();

  const watchFilters: Filter[] = [
    { name: 'unwatched', label: t('unwatched'), count: unwatchedCount },
    { name: 'watched', label: t('watched'), count: watchedCount },
    { name: 'all', label: t('allVideos'), count: totalCount },
  ];

  const notInterestedFilters: Filter[] = [
    { name: NotInterestedFilter.EXCLUDE, label: t('hideNotInterested'), count: 0 },
    { name: NotInterestedFilter.ONLY, label: t('notInterested'), count: notInterestedCount },
    { name: NotInterestedFilter.INCLUDE, label: t('includeNotInterested'), count: 0 },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* Watch status filters */}
      <div className="flex flex-wrap gap-4">
        {watchFilters.map(filterConf => {
          const isActive = filterConf.name === filter;
          return (
            <button
              onClick={() => updateFilter(filterConf.name)}
              aria-selected={isActive}
              className={/* styling */}
            >
              <span>{filterConf.label}</span>
              <span className="bg-opacity-20 bg-black px-2 rounded-full text-sm">
                {filterConf.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Not interested filters - separate row */}
      <div className="flex flex-wrap gap-4 border-t pt-4">
        {notInterestedFilters.map(filterConf => {
          const isActive = filterConf.name === notInterestedFilter;
          return (
            <button
              onClick={() => updateNotInterestedFilter(filterConf.name as NotInterestedFilter)}
              aria-selected={isActive}
              className={`
                ${isActive ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}
                /* other styling */
              `}
            >
              <span>{filterConf.label}</span>
              {filterConf.count > 0 && (
                <span className="bg-opacity-20 bg-black px-2 rounded-full text-sm">
                  {filterConf.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

#### 5. Video List Mutations

**Updated VideoList Component:** `frontend/app/videos/components/VideoList.tsx`

```typescript
export function VideoList() {
  const queryClient = useQueryClient();
  const filters = useVideoFilters();

  // Existing watch status mutation...
  const { mutate: toggleWatchStatus } = useMutation({
    mutationFn: (videoId: string) => {
      const video = videos.find((v: Video) => v.uuid === videoId);
      return updateVideoWatchStatus(videoId, !video?.is_watched);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos });
      queryClient.invalidateQueries({ queryKey: queryKeys.videoStats });
    },
  });

  // New not interested mutation
  const { mutate: toggleNotInterested } = useMutation({
    mutationFn: ({ videoId, isNotInterested }: { videoId: string; isNotInterested: boolean }) => {
      return updateVideoNotInterested(videoId, isNotInterested);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos });
      queryClient.invalidateQueries({ queryKey: queryKeys.videoStats });
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map(video => (
        <VideoCard
          key={video.uuid}
          video={video}
          onWatch={() => handleWatch(video.uuid)}
          onToggleWatched={(isWatched, notes) =>
            toggleWatchStatus(video.uuid)
          }
          onToggleNotInterested={(isNotInterested) =>
            toggleNotInterested({ videoId: video.uuid, isNotInterested })
          }
          notInterestedFilter={filters.notInterestedFilter}
        />
      ))}
    </div>
  );
}
```

### URL State Management

**URL Parameter Schema:**

```
/videos?filter=unwatched&not_interested_filter=exclude&tags=tutorial,react&tag_mode=all&search=nextjs
```

**Parameter Interactions:**

| filter      | not_interested_filter | Result                                          |
|-------------|----------------------|------------------------------------------------|
| unwatched   | exclude              | Unwatched videos, excluding not interested (default) |
| unwatched   | only                 | Unwatched videos that ARE not interested       |
| unwatched   | include              | All unwatched videos regardless of not interested |
| watched     | exclude              | Watched videos, excluding not interested       |
| all         | exclude              | All videos except not interested (default)     |
| all         | only                 | Show ONLY not interested videos                |
| all         | include              | Show absolutely all videos                     |

**Default Behavior:**
- `filter` defaults to `unwatched`
- `not_interested_filter` defaults to `exclude`
- Result: Users see unwatched videos they haven't dismissed (most common use case)

### Internationalization

**Updated Translations:** `frontend/locales/en/videos.json`

```json
{
  "allVideos": "All Videos",
  "watched": "Watched",
  "unwatched": "Unwatched",
  "markAsWatched": "Mark as watched",
  "markNotInterested": "Not interested in this video",
  "markInterested": "Mark as interested again",
  "undoNotInterested": "Undo not interested",
  "notInterested": "Not Interested",
  "hideNotInterested": "Hide dismissed",
  "includeNotInterested": "Include dismissed",
  "notInterestedCount": "Dismissed videos",
  "markedNotInterestedOn": "Dismissed on",
  "showDescription": "Show description",
  "hideDescription": "Hide description",
  "addNotes": "Add notes",
  "yourNotes": "Your notes:",
  "notesPlaceholder": "Add your notes about this video...",
  "saveMarkWatched": "Save & Mark Watched",
  "watchedOn": "Watched on",
  "views": "views"
}
```

---

## Implementation Phases

### Phase 1: Database and Backend API Foundation
```diff
! Status: Implemented
```

**Tasks:**
1. ✅ Create migration for `is_not_interested` and `not_interested_at` fields
2. ✅ Run migration and verify database schema
3. ✅ Update `UserVideo` model with new fields
4. ✅ Create `NotInterestedFilter` enum in validators
5. ✅ Implement `PUT /api/videos/{uuid}/not-interested` endpoint
6. ✅ Add `VideoListSerializer` fields for `is_not_interested` and `not_interested_at`
7. ✅ Write unit tests for new endpoint

**Acceptance Criteria:**
- ✅ Migration runs successfully without errors
- ✅ Endpoint accepts `is_not_interested` boolean and returns updated state
- ✅ Endpoint sets/clears `not_interested_at` timestamp appropriately
- ✅ Tests cover edge cases (toggle, idempotency, invalid input)

**Completed:** Phase 1 implementation finished with all acceptance criteria met

---

### Phase 2: Backend Filtering Logic
```diff
! Status: Implemented
```

**Tasks:**
1. ✅ Add `not_interested_filter` to `VideoSearchValidator` with default `EXCLUDE`
2. ✅ Implement `_apply_not_interested_filter()` method in `VideoSearchService`
3. ✅ Integrate filter into main `search()` method
4. ✅ Update stats endpoint to include `not_interested` count
5. ✅ Database index already present from Phase 1 migration
6. ✅ Test filtering combinations (watch_status + not_interested_filter)
7. ✅ Performance test query efficiency with large datasets

**Acceptance Criteria:**
- ✅ `not_interested_filter=only` returns only dismissed videos
- ✅ `not_interested_filter=exclude` excludes dismissed videos (default)
- ✅ `not_interested_filter=include` returns all videos
- ✅ Filter works correctly with watch_status, tags, and search filters
- ✅ Stats endpoint returns accurate not_interested count
- ✅ No N+1 query issues detected

**Completed:** Phase 2 implementation finished with all acceptance criteria met

---

### Phase 3: Frontend Types and API Service
```diff
! Status: Implemented
```

**Tasks:**
1. ✅ Update `Video` interface with `is_not_interested` and `not_interested_at` fields
2. ✅ Create `NotInterestedFilter` enum
3. ✅ Update `VideoFilters` interface with `notInterestedFilter` property
4. ✅ Implement `updateVideoNotInterested()` service function
5. ✅ Update `buildVideoQueryParams()` to include `not_interested_filter`
6. ✅ Add `NotInterestedResponse` interface
7. ✅ Update `VideoStats` interface with `not_interested` field

**Acceptance Criteria:**
- ✅ TypeScript compilation passes with no errors
- ✅ API service function correctly calls backend endpoint
- ✅ Query params include not_interested_filter when present
- ✅ Response types match backend API schema

**Completed:** Phase 3 implementation finished with all acceptance criteria met

---

### Phase 4: Video Card UI Component
```diff
! Status: Implemented
```

**Tasks:**
1. ✅ Add "X" button to top-right corner of video cards
2. ✅ Implement hover state (hidden by default, shown on hover)
3. ✅ Add click handler (no propagation stop needed - button positioned independently)
4. ✅ Add visual feedback when video is marked not interested (dimmed card with opacity-50)
5. ✅ Implement accessibility features (aria-label, keyboard focus, focus ring)
6. ✅ Add tooltip/title text
7. ✅ Context-aware icon (X for dismiss, Plus for restore)
8. ✅ Add i18n strings for button labels

**Acceptance Criteria:**
- ✅ Button visible on hover (desktop) via group-hover pattern
- ✅ Button stays visible when video is marked not interested
- ✅ Card appears dimmed (opacity-50) when marked not interested (except in not-interested-only view)
- ✅ Button accessible via keyboard navigation with focus ring
- ✅ Proper aria-label and title attributes for accessibility
- ✅ Separated into NotInterestedButton component for clarity

**Completed:** Phase 4 implementation finished with all acceptance criteria met

---

### Phase 5: Filter Management and State
**Status:** Pending

**Tasks:**
1. Update `useVideoFilters` hook with `notInterestedFilter` state
2. Add `updateNotInterestedFilter` action
3. Integrate with URL search params
4. Update `FilterButtons` component with not interested filter options
5. Fetch not_interested count from stats endpoint
6. Add filter button styling (red theme for dismissal)
7. Update `areFiltersEqual` comparison logic
8. Add i18n strings for filter labels

**Acceptance Criteria:**
- Not interested filter persists in URL
- Filter buttons update URL correctly
- Stats show accurate not interested count
- Filter state resets when navigating to other pages
- Clicking filter updates video list immediately
- Filter combinations work as expected

**Estimated Effort:** 3-4 hours

---

### Phase 6: React Query Integration
**Status:** Pending

**Tasks:**
1. Create mutation for toggling not interested status
2. Add mutation to `VideoList` component
3. Implement query invalidation on success
4. Pass `onToggleNotInterested` prop to VideoCard
5. Test optimistic updates behavior
6. Handle mutation errors gracefully
7. Update query keys to include notInterestedFilter

**Acceptance Criteria:**
- Mutation successfully updates video status
- Video list refreshes after mutation
- Stats update after mutation
- Error states handled with user feedback
- Query cache invalidation works correctly
- No race conditions or stale data

**Estimated Effort:** 2-3 hours

---

### Phase 7: Testing and Polish
**Status:** Pending

**Tasks:**
1. Write frontend unit tests for new components
2. Write integration tests for filter interactions
3. Test keyboard accessibility
4. Test mobile responsiveness
5. Test with large datasets (performance)
6. Add error boundary handling
7. Test edge cases (rapid clicking, network errors)
8. Update documentation

**Acceptance Criteria:**
- All tests pass
- Keyboard navigation works smoothly
- Mobile experience is intuitive
- Performance metrics meet standards
- Error states provide clear user feedback
- Documentation updated with new feature

**Estimated Effort:** 4-5 hours

---

## Performance Considerations

### Database Performance

**Query Optimization:**
- Use `EXISTS` subqueries for filtering to avoid joins
- Index on `(user, is_not_interested)` enables fast lookups
- Prefetch pattern prevents N+1 queries in serializers
- Stats query uses COUNT aggregations, not ORM iteration

**Expected Query Plan:**
```sql
-- Filter out not interested (default)
SELECT * FROM videos v
WHERE NOT EXISTS (
    SELECT 1 FROM user_videos uv
    WHERE uv.user_id = %s
    AND uv.video_id = v.uuid
    AND uv.is_not_interested = true
);
-- Uses: user_not_interested_idx
```

**Benchmarking:**
- Target: <100ms for video list with 10k videos
- Stats endpoint: <50ms for aggregation queries
- Mutation: <30ms for single update

### Frontend Performance

**React Query Caching:**
- 90-second stale time prevents unnecessary refetches
- Query key includes `notInterestedFilter` for cache isolation
- Invalidation strategy only refetches affected queries

**Component Rendering:**
- VideoCard memoization to prevent unnecessary re-renders
- Virtual scrolling considered for very large lists (future optimization)
- Lazy loading of thumbnail images

**Bundle Size:**
- No new dependencies required
- Icon component already imported (X icon from lucide-react)
- Estimated increase: <2KB gzipped

### API Efficiency

**Response Payload:**
- Not interested status adds minimal data per video (~50 bytes)
- No additional API calls needed (data included in existing list response)
- Prefetch strategy eliminates extra queries

**Network Optimization:**
- Mutation sends minimal payload (boolean flag only)
- Response includes only updated fields
- No file uploads or large payloads

---

## Testing Strategy

### Backend Testing

**Unit Tests:** `backend/videos/tests/test_not_interested.py`

```python
class NotInterestedEndpointTests(APITestCase):
    def test_mark_video_not_interested(self):
        """Test marking a video as not interested"""
        # Arrange: Create user and video
        # Act: PUT /api/videos/{id}/not-interested with is_not_interested=true
        # Assert: Response status 200, is_not_interested=true, timestamp set

    def test_undo_not_interested(self):
        """Test unmarking a video"""
        # Arrange: Video already marked not interested
        # Act: PUT with is_not_interested=false
        # Assert: is_not_interested=false, timestamp cleared

    def test_idempotency(self):
        """Test repeated calls with same value"""
        # Act: Mark not interested twice
        # Assert: No errors, timestamp unchanged on second call

    def test_get_or_create_behavior(self):
        """Test UserVideo creation on first call"""
        # Assert: UserVideo created if doesn't exist

    def test_invalid_video_id(self):
        """Test with non-existent video"""
        # Assert: 404 error

class NotInterestedFilteringTests(TestCase):
    def test_filter_only_not_interested(self):
        """Test not_interested_filter=only"""
        # Arrange: Mix of interested and not interested videos
        # Act: Query with filter=only
        # Assert: Only not interested videos returned

    def test_filter_exclude_not_interested(self):
        """Test not_interested_filter=exclude (default)"""
        # Assert: No not interested videos in results

    def test_filter_include_all(self):
        """Test not_interested_filter=include"""
        # Assert: All videos returned

    def test_combined_filters(self):
        """Test watch_status + not_interested_filter combination"""
        # Assert: Correct intersection of filters

    def test_query_performance(self):
        """Test no N+1 queries"""
        # Use django.test.utils.override_settings with query counting
        # Assert: Query count doesn't scale with result set size

class StatsEndpointTests(APITestCase):
    def test_not_interested_count(self):
        """Test stats include not_interested count"""
        # Arrange: Mark some videos not interested
        # Act: GET /api/videos/stats/
        # Assert: not_interested count accurate
```

**Performance Tests:**
```python
class PerformanceTests(TransactionTestCase):
    def test_large_dataset_filtering(self):
        """Test filtering with 10,000 videos"""
        # Measure query time and count
        # Assert: <100ms, <10 queries
```

### Frontend Testing

**Component Tests:** `frontend/__tests__/components/VideoCard.test.tsx`

```typescript
describe('VideoCard - Not Interested', () => {
  it('shows X button on hover', () => {
    // Render VideoCard
    // Simulate mouse enter
    // Assert: X button visible
  });

  it('calls onToggleNotInterested when X clicked', () => {
    // Render with mock callback
    // Click X button
    // Assert: Callback called with correct arguments
  });

  it('dims card when video is not interested', () => {
    // Render with is_not_interested=true
    // Assert: Opacity class applied
  });

  it('prevents event propagation on X click', () => {
    // Click X button
    // Assert: onWatch not called
  });

  it('accessible via keyboard', () => {
    // Tab to X button
    // Press Enter
    // Assert: Callback triggered
  });
});
```

**Hook Tests:** `frontend/__tests__/hooks/useVideoFilters.test.tsx`

```typescript
describe('useVideoFilters - Not Interested', () => {
  it('defaults to exclude not interested', () => {
    // Render hook without URL params
    // Assert: notInterestedFilter === NotInterestedFilter.EXCLUDE
  });

  it('updates URL when filter changed', () => {
    // Call updateNotInterestedFilter
    // Assert: Router push called with correct params
  });

  it('parses URL param correctly', () => {
    // Setup URL with not_interested_filter=only
    // Assert: Hook returns correct value
  });
});
```

**Integration Tests:** `frontend/__tests__/integration/video-list.test.tsx`

```typescript
describe('Video List Integration', () => {
  it('filters videos when not interested filter changed', async () => {
    // Render VideoList
    // Click "Not Interested" filter
    // Wait for API call
    // Assert: Correct API params sent
    // Assert: Filtered videos displayed
  });

  it('updates stats after marking not interested', async () => {
    // Mark video not interested
    // Wait for mutation and refetch
    // Assert: Stats count incremented
  });
});
```

### Manual Testing Checklist

**UI/UX Testing:**
- [ ] X button appears on hover (desktop)
- [ ] X button always visible on mobile
- [ ] X button has correct tooltip
- [ ] Card dims when marked not interested
- [ ] Clicking X doesn't play video
- [ ] Animation smooth and polished

**Filter Testing:**
- [ ] Filter buttons update URL correctly
- [ ] Back/forward browser navigation works
- [ ] Filters persist across page refreshes
- [ ] Multiple filters combine correctly
- [ ] Stats counts match filtered results

**Error Handling:**
- [ ] Network errors show user-friendly message
- [ ] Failed mutations don't corrupt UI state
- [ ] Race conditions handled gracefully
- [ ] Invalid API responses handled

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Screen reader announces status changes
- [ ] Focus indicators visible
- [ ] ARIA labels descriptive

**Performance:**
- [ ] Large lists scroll smoothly
- [ ] Mutations feel instant
- [ ] No visible loading flicker
- [ ] Mobile performance acceptable

---

## Risks and Mitigation

### Technical Risks

**Risk: Query Performance Degradation**
- **Likelihood:** Low
- **Impact:** High
- **Mitigation:**
  - Use EXISTS subqueries (proven pattern from watch status)
  - Add database index on `(user, is_not_interested)`
  - Performance test with 10k+ videos before deploying
  - Monitor slow query log after deployment

**Risk: Filter Complexity Confusion**
- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Clear naming: "Hide dismissed" vs "Not interested"
  - Visual separation between watch status and not interested filters
  - Default behavior matches user expectations (exclude dismissed)
  - Tooltips explain filter behavior

**Risk: State Synchronization Issues**
- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:**
  - Use existing query invalidation pattern (proven reliable)
  - TanStack Query handles race conditions automatically
  - Test rapid clicking and network errors explicitly

**Risk: Mobile UX Challenges**
- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Make X button always visible on mobile (no hover state)
  - Sufficient touch target size (44x44px minimum)
  - Test on actual devices, not just browser dev tools
  - Consider swipe gesture as alternative (future enhancement)

### UX Risks

**Risk: Accidental Dismissals**
- **Likelihood:** Medium
- **Impact:** Low
- **Mitigation:**
  - Easy undo: Click X again to restore
  - Visual feedback: Card dims immediately
  - Dedicated filter to review dismissed videos
  - Consider confirmation dialog for first-time users (optional)

**Risk: Filter Discoverability**
- **Likelihood:** Medium
- **Impact:** Low
- **Mitigation:**
  - Place not interested filters prominently
  - Show count badge to indicate dismissed videos exist
  - Consider onboarding tooltip for new users (future)
  - Clear visual hierarchy separating filter types

**Risk: Confusion with Watch Status**
- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Independent controls: Watch button vs X button
  - Different visual treatments (green for watched, red for dismissed)
  - Clear i18n strings explaining each action
  - Documentation explaining the difference

### Business Risks

**Risk: Increased Database Size**
- **Likelihood:** High (expected)
- **Impact:** Low
- **Mitigation:**
  - Two new fields minimal storage impact (~16 bytes per UserVideo)
  - UserVideo already has unique constraint (one row per user+video)
  - PostgreSQL handles millions of rows efficiently
  - Monitor database growth metrics

**Risk: Feature Adoption Low**
- **Likelihood:** Low
- **Impact:** Low
- **Mitigation:**
  - Track usage metrics (how many videos marked not interested)
  - A/B test filter visibility if needed
  - Solicit user feedback after deployment
  - Feature is low-cost to maintain even with low adoption

---

## Conclusion

### Summary

The "not interested" video flow provides users with a powerful content curation tool that:
- **Reduces cognitive load** by removing irrelevant content from default views
- **Matches user expectations** from YouTube's native interface
- **Maintains data integrity** by separating dismissal from watch status
- **Follows established patterns** for consistency and maintainability

### Implementation Value

**User Benefits:**
- Cleaner, more relevant video feed
- Faster discovery of desired content
- Reversible dismissal actions (undo-friendly)
- Transparent filter controls

**Technical Benefits:**
- Leverages existing architecture (no new dependencies)
- Performance-optimized from day one (EXISTS queries, indexes)
- Type-safe implementation (Pydantic + TypeScript)
- Comprehensive test coverage

**Maintenance Benefits:**
- Consistent with watch status patterns
- Clear separation of concerns
- Documented assumptions and edge cases
- Scalable to future enhancements (e.g., reasons for dismissal)

### Implementation Approach

The phased rollout strategy minimizes risk while delivering incremental value:
1. **Weeks 1-2:** Backend foundation (database + API)
2. **Week 2-3:** Frontend UI and state management
3. **Week 3-4:** Testing, polish, and deployment

Total estimated effort: **18-24 hours** of development time across 3-4 weeks.

### Future Enhancements

Potential follow-up features (out of scope for initial implementation):
- **Dismissal reasons:** Allow users to specify why (e.g., "Already watched elsewhere", "Not relevant", "Low quality")
- **Bulk actions:** Dismiss multiple videos at once
- **Smart recommendations:** Learn from dismissals to improve channel/tag suggestions
- **Temporary dismissal:** "Remind me later" option with automatic restoration
- **Analytics dashboard:** Show dismissal patterns over time
