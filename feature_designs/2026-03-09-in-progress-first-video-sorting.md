# In-Progress-First Video Sorting

## Table of Contents
- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Current System Analysis](#current-system-analysis)
- [Technical Design](#technical-design)
  - [Database Schema Changes](#database-schema-changes)
  - [Backend API Design](#backend-api-design)
  - [Frontend Architecture](#frontend-architecture)
  - [URL State Management](#url-state-management)
  - [Internationalization](#internationalization)
- [Implementation Phases](#implementation-phases)
- [Performance Considerations](#performance-considerations)
- [Testing Strategy](#testing-strategy)
- [Risks and Mitigation](#risks-and-mitigation)
- [Conclusion](#conclusion)

---

## Overview

This feature introduces a new default sort order for the video list: **"In Progress First"**. Videos where the user has started watching (i.e., `watch_progress_seconds > 0`) but have not yet been marked as watched or "not interested" are surfaced at the top of the list. All other videos follow in their existing order. A sort selector UI is added to the filter bar, giving users control over the active sort order.

---

## Problem Statement

**Current Pain Points:**

1. **Lost In-Progress Videos**: Users who have partially watched a video have no way to quickly resume it. The default sort (`-published_at`) buries in-progress videos among dozens of unwatched ones.
2. **No Sort Controls**: The UI provides no sorting controls; ordering is fixed to newest-first with no user override.
3. **Friction in Resuming Viewing**: To find an in-progress video a user must scroll or search manually, creating unnecessary friction in the core watch loop.
4. **Opaque Progress State**: The system already tracks `watch_progress_seconds` per user, but this data has no influence on list ordering, making it effectively invisible at the list level.

---

## Solution Overview

**Key Capabilities:**

- **New Default Sort — "In Progress First"**: Videos with `watch_progress_seconds > 0`, `is_watched = false`, and `is_not_interested` not `true` are placed at the top of the list. Within the in-progress group, videos are ordered by most-recently-updated progress descending (so the one the user was watching most recently appears first). All remaining videos are ordered by `-published_at`.
- **Sort Selector UI**: A compact dropdown in the filter bar allows the user to switch between available sort modes. The selected sort is persisted in the URL.
- **Backwards-Compatible**: When no sort parameter is present in the URL the backend and frontend both default to "in progress first", so existing bookmarks and shared URLs continue to work without a jarring change.

**Available Sort Modes (initial set):**

| Sort Key | Label | Backend Ordering |
|---|---|---|
| `in_progress_first` | In Progress First *(default)* | progress priority asc, `-updated_at` for in-progress group, `-published_at` for rest |
| `newest` | Newest First | `-published_at` |

---

## Current System Analysis

### Backend

- **Default ordering**: `["-published_at"]` on `Video.Meta` class and as `ordering = ["-published_at"]` on `VideoViewSet`.
- **`VideoViewSet`** (`backend/videos/views.py`): uses DRF filter backends `[DjangoFilterBackend, SearchFilter, OrderingFilter]`. `ordering_fields = ["title", "published_at", "view_count", "like_count"]`. No progress-based ordering exists. `get_queryset()` instantiates `VideoSearchService(user)` per-request (not stored as instance attribute).
- **`VideoSearchService`** (`backend/videos/services/search.py`): constructor takes a `User` object (`self.user`). Main method is `search_videos(tag_names, tag_mode, watch_status, not_interested_filter)`. All user-scoped filtering uses `Exists()` subqueries with `OuterRef("pk")` — NOT JOIN-based annotations. The `Prefetch("user_videos", queryset=UserVideo.objects.filter(user=self.user))` only affects data returned for serialization; it does NOT filter the main queryset JOIN.
- **`VideoSearchParams`** (`backend/videos/validators.py`): Pydantic model with `from_request(request)` classmethod. Fields: `tags`, `tag_mode`, `watch_status`, `not_interested_filter`, `user`.
- **`UserVideo`** model fields relevant to this feature:
  - `watch_progress_seconds` — IntegerField, default 0
  - `is_watched` — BooleanField
  - `is_not_interested` — NullableBooleanField (can be True/False/None)
  - `updated_at` — DateTimeField (auto-updated on every save, from `TimestampMixin`)
- Existing DB index: `(user, watch_progress_seconds)` on `UserVideo` — already in place.

### Frontend

- **`VideoFilters` interface** (`frontend/types.ts`, lines 137–143): `{ filter, selectedTags, tagMode, searchQuery, notInterestedFilter }` — **`sort` field is absent and must be added**.
- **`useVideoFilters` hook** (`frontend/hooks/useVideoFilters.ts`): reads URL params, provides typed update methods (`updateFilter`, `updateTags`, etc.). Internally defines a local `updateUrl(updates)` alias that wraps `navigateWithUpdatedParams(router, pathname, searchParams, updates)` from `@/utils/urlHelpers`. All individual update functions (e.g. `updateFilter`, `updateNotInterestedFilter`) go through `updateAllFilters`, which calls `updateUrl`. `areFiltersEqual()` checks all filter fields — **must be extended to include `sort`**.
- **`buildVideoQueryParams`** (`frontend/services/videos.ts`): maps `VideoFilters & PaginationParams` to backend query string. Frontend `filter` → backend `watch_status`. **`sort` mapping must be added**.
- **`useInfiniteVideos` hook** (`frontend/hooks/useInfiniteVideos.ts`): builds React Query key via `queryKeys.videosWithFilter(filters)` — the entire `filters` object is part of the key. Adding `sort` to `VideoFilters` automatically changes the cache key when sort changes; **no changes needed to the hook or query config**.
- **Filter bar** (`frontend/app/videos/components/FilterButtons.tsx`): renders watch-status buttons, not-interested buttons, and `<SearchAndTagFilter>`. Uses `useVideoFilters()` directly. `SortSelector` should be added inside this component's JSX.
- **`Video` type** (`frontend/types.ts`): already includes `watch_progress_seconds` and `watch_percentage` — no changes needed.

---

## Technical Design

### Database Schema Changes

No schema changes are required. All necessary fields (`watch_progress_seconds`, `is_watched`, `is_not_interested`, `updated_at`) already exist on `UserVideo`.

---

### Backend API Design

#### Ordering Strategy

The "in progress first" sort cannot be expressed as a simple field ordering because the relevant data lives in the user-scoped `UserVideo` relation, not on the `Video` model directly.

**Critical constraint**: `VideoSearchService` uses `Prefetch("user_videos", queryset=UserVideo.objects.filter(user=self.user))` which runs a **separate query** for serialization — it does NOT filter the main queryset's JOIN. An annotation using `user_videos__watch_progress_seconds__gt=0` would perform an unfiltered JOIN across ALL users' `UserVideo` rows, incorrectly promoting other users' in-progress videos. This is the same reason all existing filters (`_apply_watch_status_filter`, `_apply_not_interested_filter`) use `Exists()` + `OuterRef` subqueries rather than direct annotations.

**Correct approach — mirror the existing filter pattern:**

```python
from django.db.models import Exists, OuterRef, Case, When, IntegerField, Value, Subquery, DateTimeField
from users.models import UserVideo

# Subquery: does this user have in-progress data for this video?
in_progress_exists = Exists(
    UserVideo.objects.filter(
        video=OuterRef("pk"),
        user=self.user,
        watch_progress_seconds__gt=0,
        is_watched=False,
    ).exclude(is_not_interested=True)
)

# Subquery: retrieve the updated_at of the matching in-progress UserVideo (for tiebreak sort)
in_progress_updated_at = Subquery(
    UserVideo.objects.filter(
        video=OuterRef("pk"),
        user=self.user,
        watch_progress_seconds__gt=0,
        is_watched=False,
    ).exclude(is_not_interested=True).values("updated_at")[:1],
    output_field=DateTimeField(),
)

queryset = queryset.annotate(
    progress_priority=Case(
        When(in_progress_exists, then=Value(0)),
        default=Value(1),
        output_field=IntegerField(),
    ),
    progress_updated_at=in_progress_updated_at,
)
```

**Final ordering applied:**

```python
queryset.order_by("progress_priority", "-progress_updated_at", "-published_at")
```

- `progress_priority=0`: in-progress videos — sorted by most-recently-updated `updated_at` descending.
- `progress_priority=1`: all other videos — `progress_updated_at` is NULL, so they fall to the bottom; secondary sort is `-published_at`.
- NULL values for `progress_updated_at` sort last in PostgreSQL for `DESC NULLS LAST` — which is the default for `ORDER BY ... DESC` in PostgreSQL. No extra handling needed.

#### New Ordering Parameter

The `VideoViewSet` currently reads the `ordering` query param via DRF's `OrderingFilter`. We will add a parallel `sort` param that handles the custom sort modes, keeping DRF's `ordering` as a low-level escape hatch.

**Query param**: `sort` (string, optional, default: `in_progress_first`)

**Accepted values**: `in_progress_first`, `newest`

#### Changes to `VideoSearchService`

Add `apply_ordering(self, queryset, sort_mode)` method to the `VideoSearchService` class in `backend/videos/services/search.py`. `self.user` is already available from the constructor — no `user` parameter needed.

```python
def apply_ordering(self, queryset: QuerySet, sort_mode: str) -> QuerySet:
    if sort_mode == "newest":
        return queryset.order_by("-published_at")
    # Default: in_progress_first — uses Exists/Subquery to stay user-scoped
    in_progress_filter = dict(
        video=OuterRef("pk"),
        user=self.user,
        watch_progress_seconds__gt=0,
        is_watched=False,
    )
    in_progress_exists = Exists(
        UserVideo.objects.filter(**in_progress_filter).exclude(is_not_interested=True)
    )
    in_progress_updated_at = Subquery(
        UserVideo.objects.filter(**in_progress_filter)
        .exclude(is_not_interested=True)
        .values("updated_at")[:1],
        output_field=DateTimeField(),
    )
    return queryset.annotate(
        progress_priority=Case(
            When(in_progress_exists, then=Value(0)),
            default=Value(1),
            output_field=IntegerField(),
        ),
        progress_updated_at=in_progress_updated_at,
    ).order_by("progress_priority", "-progress_updated_at", "-published_at")
```

**Imports to add** to `search.py`:
```python
from django.db.models import Case, DateTimeField, Exists, IntegerField, OuterRef, Subquery, Value, When
```

> `UserVideo` is already imported in `search.py` via `from users.models import User, UserChannel, UserVideo, UserChannelTag` — no additional import needed. Only the `django.db.models` symbols above need to be added to the existing import line.

#### Changes to `VideoViewSet`

Modify `get_queryset()` in `backend/videos/views.py`. The method currently instantiates `VideoSearchService(user)` locally — we extend it to also call `apply_ordering`:

```python
def get_queryset(self) -> QuerySet[Video]:
    search_params = VideoSearchParams.from_request(self.request)
    user = cast(User, self.request.user)
    search_service = VideoSearchService(user)
    try:
        sort_params = VideoSortParams.model_validate({"sort": self.request.query_params.get("sort", "in_progress_first")})
    except PydanticValidationError as e:
        errors = {str(error["loc"][0]): error["msg"] for error in e.errors()}
        raise ValidationError(errors)
    queryset = search_service.search_videos(
        tag_names=search_params.tags,
        tag_mode=search_params.tag_mode,
        watch_status=search_params.watch_status,
        not_interested_filter=search_params.not_interested_filter,
    )
    return search_service.apply_ordering(queryset, sort_params.sort)
```

> `PydanticValidationError` is already imported in `views.py` as `from pydantic import ValidationError as PydanticValidationError`, and DRF's `ValidationError` is imported as `from rest_framework.exceptions import ValidationError`. This exact try/except pattern mirrors the existing `watch_progress` action (lines 253–256). Invalid `sort` values return **400**, not 422 — the project has no custom exception handler that converts Pydantic errors to 422. When `sort` is absent, `model_validate` receives `"in_progress_first"` as the default, so no error is raised.

The existing `OrderingFilter` backend and `ordering_fields`/`ordering` attributes on the viewset remain in place but are now superseded for list views — `apply_ordering` sets the final `order_by` which takes precedence. They can be removed in a follow-up cleanup if desired.

**Import**: Extend the existing `from .validators import VideoSearchParams, WatchStatus, WatchProgressUpdateParams` line to include `VideoSortParams`.

#### Input Validation

Add `VideoSortParams` to `backend/videos/validators.py` after the existing Pydantic models. `Literal` must be added to the existing `from typing import List, Optional, Self` line (becomes `from typing import List, Literal, Optional, Self`):

```python
class VideoSortParams(BaseModel):
    sort: Literal["in_progress_first", "newest"] = "in_progress_first"
```

Invalid values raise a Pydantic `ValidationError`. Since `model_validate` is called with a dict containing the raw string from `query_params.get("sort", "in_progress_first")`, the default `"in_progress_first"` is used when the param is absent, preventing a `ValidationError` for missing params. An intentionally invalid value (e.g., `?sort=hacked_field`) raises a 422 through DRF's exception handler.

---

### Frontend Architecture

#### TypeScript Types (`frontend/types.ts`)

Add `VideoSortMode` type, `VIDEO_SORT_OPTIONS` constant, and `sort` field to `VideoFilters`. The `VideoSortMode` type and constant are co-located with the other video-related types in `types.ts` (following the existing pattern of `TagMode`, `NotInterestedFilter` etc.).

```typescript
// Add after the NotInterestedFilter enum (around line 126)
export type VideoSortMode = 'in_progress_first' | 'newest';

export const VIDEO_SORT_OPTIONS: { value: VideoSortMode; labelKey: string }[] = [
  { value: 'in_progress_first', labelKey: 'sort.inProgressFirst' },
  { value: 'newest',            labelKey: 'sort.newest' },
];

// Extend VideoFilters interface (currently lines 137-143)
export interface VideoFilters {
  filter: string;
  selectedTags: string[];
  tagMode: TagModeType;
  searchQuery: string;
  notInterestedFilter: NotInterestedFilter;
  sort: VideoSortMode;  // <-- new field
}
```

#### `useVideoFilters` Hook Changes (`frontend/hooks/useVideoFilters.ts`)

Add `sort` URL param reading, `updateSort` action, and update `areFiltersEqual`. Follow the exact pattern of existing params (`notInterestedFilter` is the closest match for a typed enum-like field):

```typescript
// Add to VideoFiltersActions interface
updateSort: (newSort: VideoSortMode) => void;

// Inside useVideoFilters():
const sort = (searchParams.get('sort') as VideoSortMode) || 'in_progress_first';

const updateSort = (newSort: VideoSortMode) => {
  updateUrl({ sort: newSort, page: undefined }); // reset page on sort change
};

// Update areFiltersEqual to include sort:
return (
  filter === otherFilters.filter &&
  areTagsEqual &&
  tagMode === otherFilters.tagMode &&
  searchQuery === otherFilters.searchQuery &&
  notInterestedFilter === otherFilters.notInterestedFilter &&
  sort === otherFilters.sort  // <-- new
);

// Add to return object:
return { ..., sort, updateSort };
```

> **Note on `updateUrl`**: Inside `useVideoFilters`, there is already a local `updateUrl` alias (lines 36–38) that wraps `navigateWithUpdatedParams(router, pathname, searchParams, updates)`. `updateSort` calls this directly (not via `updateAllFilters`) so it can also pass `page: undefined` to reset pagination.
>
> **Note on `undefined` vs `null`**: `updateUrlParams` (in `frontend/utils/urlHelpers.ts`) treats `undefined` values as `params.delete(key)`. Passing `page: undefined` removes the page param. Confirmed in `urlHelpers.ts` lines 19–21.
>
> **Note on `sort` survival across other filter changes**: `updateUrlParams` starts from `new URLSearchParams(searchParams.toString())` — all existing params are copied before applying updates. `updateAllFilters` only sets `filter`, `tags`, `tag_mode`, `search`, `not_interested_filter` — it never touches `sort`, so `sort` is automatically preserved when any other filter changes. No changes to `updateAllFilters` are needed.

#### `buildVideoQueryParams` Changes (`frontend/services/videos.ts`)

The function signature accepts `VideoFilters & PaginationParams`. Since `sort` is now part of `VideoFilters`, it is automatically available. Add one line:

```typescript
// Add after the searchQuery param block:
queryParams.set('sort', params.sort);
```

The backend receives `sort` as the query parameter name. This maps directly to `self.request.query_params.get("sort", "in_progress_first")` in the viewset.

#### Sort Selector Component (`frontend/app/videos/components/SortSelector.tsx`)

New file, sibling to `FilterButtons.tsx` in `frontend/app/videos/components/`:

```typescript
'use client';

import { useTranslation } from 'react-i18next';
import { VideoSortMode, VIDEO_SORT_OPTIONS } from '@/types';

interface SortSelectorProps {
  sort: VideoSortMode;
  onSortChange: (sort: VideoSortMode) => void;
}

export const SortSelector = ({ sort, onSortChange }: SortSelectorProps) => {
  const { t } = useTranslation('videos');
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="text-sm text-gray-600 dark:text-gray-400">{t('sort.label')}</label>
      <select
        id="sort-select"
        value={sort}
        onChange={e => onSortChange(e.target.value as VideoSortMode)}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      >
        {VIDEO_SORT_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
};
```

**Integration into `FilterButtons.tsx`**: Import `SortSelector` and add inside the returned JSX. The current structure (lines 63–108) is: watch-status buttons → not-interested buttons → `<SearchAndTagFilter>`. Insert the sort row **after the not-interested buttons block and before `<SearchAndTagFilter>`**, consuming `sort` and `updateSort` from the existing `useVideoFilters()` call at line 31:

```typescript
// Inside FilterButtons JSX, after the not-interested div:
<div data-testid="sort-selector-row" className="flex items-center border-t pt-4">
  <SortSelector sort={sort} onSortChange={updateSort} />
</div>
```

`sort` and `updateSort` are destructured from the `useVideoFilters()` call already at the top of `FilterButtons`.

---

### URL State Management

The `sort` parameter is appended to the existing URL param scheme:

```
/videos?filter=unwatched&sort=in_progress_first&tags=react&page=1
```

- Changing the sort resets `page` to `null` (first page) to avoid stale pagination.
- If `sort` is absent, both frontend and backend treat it as `in_progress_first`.
- Bookmarked or shared URLs without a `sort` param continue to work and get the new default behaviour.

---

### Internationalization

New keys added to `frontend/locales/en/videos.json` (merge into the existing flat JSON structure, following the `search` and `scrollMode` nested-object pattern):

```json
{
  "sort": {
    "label": "Sort by",
    "inProgressFirst": "In Progress First",
    "newest": "Newest First"
  }
}
```

The `labelKey` values in `VIDEO_SORT_OPTIONS` (`"sort.inProgressFirst"`, `"sort.newest"`, etc.) match these keys exactly when translated with `t('sort.inProgressFirst')` inside the `videos` namespace.

---

## Implementation Phases

Each phase follows **red-green TDD**: write failing tests first, then write only enough implementation to make them pass. Phases 1 and 2 are **independently parallelizable**. Phase 3 depends on Phase 2 being complete.

---

### Phase 1 — Backend Ordering *(parallelizable with Phase 2)*

#### 1a — RED: Write failing backend tests

Create `backend/videos/tests/test_video_sorting.py`. All tests in this file will fail immediately because `VideoSortParams` and `apply_ordering` do not yet exist.

**`VideoSortParams` validator tests** — import `VideoSortParams` (will cause `ImportError` → red):
- Valid values `"in_progress_first"` and `"newest"` are accepted.
- Missing `sort` key defaults to `"in_progress_first"`.
- Invalid value `"hacked_field"` raises `ValidationError`.

**`VideoSearchService.apply_ordering` unit tests** — create test `User`, `Channel`, `Video`, and `UserVideo` fixtures using Django's `TestCase`:
- `newest`: two videos with different `published_at` — assert newer appears first.
- `in_progress_first` — five-video fixture:
  - Video A: no `UserVideo` record → priority 1.
  - Video B: `watch_progress_seconds=60`, `is_watched=False`, `is_not_interested=None` → priority 0 (promoted).
  - Video C: `watch_progress_seconds=60`, `is_watched=True` → priority 1 (already watched).
  - Video D: `watch_progress_seconds=60`, `is_watched=False`, `is_not_interested=True` → priority 1 (dismissed).
  - Video E: `watch_progress_seconds=60`, `is_watched=False`, `is_not_interested=False` → priority 0 (promoted).
  - Assert B and E appear before A, C, D in the result.
  - Give E a more recent `updated_at` than B — assert E appears before B.
- **Multi-user isolation**: create second user with in-progress `UserVideo` for Video A — assert Video A still has priority 1 for the first user.

**`VideoViewSet` integration tests** — use DRF's `APIClient`, authenticate as test user:
- `GET /api/videos/?sort=in_progress_first` with in-progress seed data — assert first result UUID matches the in-progress video.
- `GET /api/videos/?sort=newest` — assert first result is the newest-published video.
- `GET /api/videos/?sort=invalid_value` — assert response status is 400.

Run `python manage.py test videos.tests.test_video_sorting` — all tests fail (red).

#### 1b — GREEN: Implement backend ordering

**File: `backend/videos/validators.py`**
1. Extend `from typing import List, Optional, Self` → `from typing import List, Literal, Optional, Self`.
2. Add after existing validators:
   ```python
   class VideoSortParams(BaseModel):
       sort: Literal["in_progress_first", "newest"] = "in_progress_first"
   ```

**File: `backend/videos/services/search.py`**
3. Add to existing `django.db.models` import line: `Case`, `DateTimeField`, `IntegerField`, `Subquery`, `Value`, `When`. (`Exists` and `OuterRef` are already imported; `UserVideo` is already imported via the existing `from users.models import User, UserChannel, UserVideo, UserChannelTag` line — no new users import needed.)
4. Add `apply_ordering(self, queryset, sort_mode)` method to `VideoSearchService` (full implementation in Technical Design section above).

**File: `backend/videos/views.py`**
5. Extend `from .validators import VideoSearchParams, WatchStatus, WatchProgressUpdateParams` → add `VideoSortParams`.
6. Modify `get_queryset()` to parse `sort` param and call `search_service.apply_ordering(queryset, sort_params.sort)`.

Run `python manage.py test videos.tests.test_video_sorting` — all tests pass (green).

---

### Phase 2 — Frontend Sort State *(parallelizable with Phase 1)*

#### 2a — RED: Write failing frontend tests

**`useVideoFilters` hook tests** — create `frontend/hooks/__tests__/useVideoFilters.test.ts` (directory and file do not yet exist). Tests fail because `sort` and `updateSort` don't exist on the hook yet:
- `sort` defaults to `'in_progress_first'` when `?sort` is absent from URL.
- After `updateSort('newest')`, the URL contains `sort=newest`.
- After `updateSort('newest')`, the URL does not contain a `page` param.
- `areFiltersEqual` returns `false` when `sort` differs between two filter objects.

**`buildVideoQueryParams` tests** — create `frontend/services/__tests__/videos.test.ts` (no existing test file for this module):
- Given `sort: 'in_progress_first'`, output contains `sort=in_progress_first`.
- Given `sort: 'newest'`, output contains `sort=newest`.

Run `npm run test` — new assertions fail (red).

#### 2b — GREEN: Implement frontend sort state

**File: `frontend/types.ts`**
1. Add `VideoSortMode` type and `VIDEO_SORT_OPTIONS` constant after `NotInterestedFilter`.
2. Add `sort: VideoSortMode` to `VideoFilters` interface.

**File: `frontend/hooks/useVideoFilters.ts`**
3. Import `VideoSortMode` from `@/types`.
4. Add `updateSort: (newSort: VideoSortMode) => void` to `VideoFiltersActions` interface.
5. Parse `sort` from URL with default `'in_progress_first'`.
6. Implement `updateSort` calling `updateUrl({ sort: newSort, page: undefined })`.
7. Add `sort === otherFilters.sort` to `areFiltersEqual` and `sort, updateSort` to the return object.

**File: `frontend/services/videos.ts`**
8. Add `queryParams.set('sort', params.sort)` to `buildVideoQueryParams`.

**File: `frontend/locales/en/videos.json`**
9. Add the `sort` object with two label strings (see Internationalization section).

Run `npm run test` — all tests pass (green).

---

### Phase 3 — Sort Selector UI *(depends on Phase 2)*

#### 3a — RED: Write failing component test

Create `frontend/app/videos/components/__tests__/SortSelector.test.tsx`. Tests fail because the component doesn't exist yet:
- Renders a `<select>` with exactly two `<option>` elements.
- Selecting `"Newest First"` calls `onSortChange` with `'newest'`.
- `<label>` is associated with `<select>` via matching `htmlFor`/`id` (`sort-select`).

Run `npm run test` — three new tests fail (red).

#### 3b — GREEN: Implement sort selector UI

**File: `frontend/app/videos/components/SortSelector.tsx`** *(new file)*
1. Create `SortSelector` component (full implementation in Technical Design section above).

**File: `frontend/app/videos/components/FilterButtons.tsx`**
2. Import `SortSelector` from `./SortSelector`.
3. Destructure `sort` and `updateSort` from the existing `useVideoFilters()` call at the top of the component.
4. Add `<div data-testid="sort-selector-row" className="flex items-center border-t pt-4"><SortSelector sort={sort} onSortChange={updateSort} /></div>` after the not-interested filter row inside the wrapper `div`.

Run `npm run test` — all tests pass (green).

---

## Performance Considerations

### Database

- The `(user, watch_progress_seconds)` index on `UserVideo` already supports the `Exists` subquery for the in-progress priority annotation. The index covers the `user` + `watch_progress_seconds` filter efficiently.
- The `Exists` subquery is correlated (uses `OuterRef("pk")`), so it is run once per row in the outer queryset — typical for this pattern and acceptable for paginated results.
- The `Subquery` for `progress_updated_at` runs the same correlated subquery pattern. Both subqueries share the same filter conditions and could theoretically be merged, but Django's ORM does not support reusing a single subquery for both `Exists` and value extraction — keeping them separate is necessary.
- No additional DB index is needed beyond what already exists.
- **Potential issue**: for users with many thousands of subscribed videos, the `Exists` subquery runs on every row in the outer page. Since the outer queryset is already user-and-subscription-filtered, the count should be manageable. Monitor if query time degrades.

### Frontend

- The sort param is included in the React Query key via `buildVideoQueryParams`, ensuring separate cache entries per sort mode — no cross-contamination between sorted views.
- Changing sort resets pagination to page 1, which prevents fetching a stale page offset against a reordered list.

---

## Testing Strategy

### Backend

Tests should be added in `backend/videos/tests/` following the existing test file pattern (e.g., alongside `test_serializer_optimization.py`).

- **`VideoSortParams` Pydantic validator** (`backend/videos/validators.py`):
  - Valid values (`"in_progress_first"`, `"newest"`) are accepted.
  - Invalid value raises `ValidationError` (not silently coerced — the viewset handles the default before validation).

- **`VideoSearchService.apply_ordering` unit tests** — requires test `User`, `Channel`, `Video`, and `UserVideo` fixtures:
  - `newest`: assert ordering is `-published_at` (newer video appears first).
  - `in_progress_first` — test cases:
    - Video A: `watch_progress_seconds=0` (no progress) — should appear after in-progress videos.
    - Video B: `watch_progress_seconds=60`, `is_watched=False`, `is_not_interested=None` — **promoted**.
    - Video C: `watch_progress_seconds=60`, `is_watched=True` — **not promoted** (already watched).
    - Video D: `watch_progress_seconds=60`, `is_watched=False`, `is_not_interested=True` — **not promoted**.
    - Video E: `watch_progress_seconds=60`, `is_watched=False`, `is_not_interested=False` — **promoted**.
    - Among promoted videos: Video B has `updated_at` earlier than E — assert E appears before B.
  - Multi-user isolation: create a second user with `UserVideo` for Video A with progress — assert Video A still has `priority=1` for the first user.

- **`VideoViewSet` integration test** (`GET /api/videos/?sort=in_progress_first`):
  - Authenticate as test user, seed videos with varied UserVideo states.
  - Assert first video in response is the in-progress one.
  - Assert `?sort=newest` returns newest-published video first.

### Frontend

Tests should be added in `__tests__` directories following the existing Jest + React Testing Library setup.

- **`useVideoFilters` hook** (`frontend/hooks/__tests__/useVideoFilters.test.ts`):
  - `sort` defaults to `'in_progress_first'` when absent from URL.
  - After `updateSort('newest')`, URL contains `sort=newest`.
  - After `updateSort('newest')`, `page` param is removed/reset.
  - `areFiltersEqual` returns `false` when `sort` differs between two filter objects.

- **`buildVideoQueryParams`** (`frontend/services/__tests__/videos.test.ts` — new file, no existing test):
  - Assert `sort=in_progress_first` appears in output when `sort` is `'in_progress_first'`.
  - Assert `sort=newest` appears in output when `sort` is `'newest'`.

- **`SortSelector` component** (`frontend/app/videos/components/__tests__/SortSelector.test.tsx`):
  - Renders a `<select>` with two `<option>` elements.
  - Selecting `"Newest First"` calls `onSortChange` with `'newest'`.
  - `<label>` is associated with `<select>` via matching `htmlFor`/`id` (`sort-select`).

---

## Risks and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `Exists` subquery causes N+1 correlated queries | Low | Medium | `Exists` generates a single correlated subquery in SQL per annotation, not N separate queries. Verify with Django's `connection.queries` or `assertNumQueries` in tests. |
| Cross-user data leakage via annotation | Low | High | Subquery explicitly filters by `user=self.user` — same pattern as all existing `_apply_*_filter` methods. Covered by multi-user isolation test. |
| `progress_updated_at` NULL ordering surprises | Low | Low | PostgreSQL `ORDER BY ... DESC` places NULLs last by default (`NULLS LAST`). Non-in-progress videos have NULL `progress_updated_at` and will naturally sort after in-progress ones. |
| Sort param not validated, allows arbitrary field ordering | Low | Medium | Pydantic `Literal["in_progress_first", "newest"]` rejects unknown values with a `ValidationError`. The viewset wraps `model_validate` in a try/except that re-raises as DRF `ValidationError` — invalid input returns 400 (matching the existing `watch_progress` pattern). |
| `VideoFilters` type change breaks `areFiltersEqual` comparisons | Medium | Low | `areFiltersEqual` must be updated to include `sort` — detailed in Phase 2 implementation steps. Missing this causes stale cache hits when changing sort. |
| `VIDEO_SORT_OPTIONS` placed in `types.ts` mixes runtime values with type definitions | Low | Low | Existing project already places `NotInterestedFilter` enum and similar runtime constants in `types.ts`. Consistent with convention. |

---

## Conclusion

This feature closes a meaningful gap in the watch workflow: videos a user has already started watching are currently invisible at the list level despite the system tracking their progress. The "In Progress First" default sort surfaces this data where it matters most, with minimal implementation cost — no schema changes, no new models, and a small UI addition. The phased approach allows backend and frontend work to proceed independently and be validated at each step.
