# Channel Tagging and Tag Filtering Feature Design

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Current System Analysis](#current-system-analysis)
  - [Existing Architecture](#existing-architecture)
  - [Current Filtering Implementation](#current-filtering-implementation)
- [Technical Design](#technical-design)
  - [1. Database Schema](#1-database-schema)
  - [2. Backend API Design](#2-backend-api-design)
  - [3. Frontend Architecture](#3-frontend-architecture)
  - [4. URL State Management](#4-url-state-management)
  - [5. Internationalization](#5-internationalization)
- [Implementation Phases](#implementation-phases)
- [Performance Considerations](#performance-considerations)
- [Testing Strategy](#testing-strategy)
- [Success Metrics](#success-metrics)
- [Risks and Mitigation](#risks-and-mitigation)
- [Future Enhancements](#future-enhancements)
- [Conclusion](#conclusion)

## Overview

This document outlines the implementation plan for adding channel tagging and tag-based filtering capabilities to the YouTube Gallery application. Users will be able to create custom tags for organizing their subscribed channels and filter videos based on these channel tags.

## Problem Statement

Currently, users can only filter videos by watch status (watched/unwatched/all). With large numbers of subscribed channels, users need better organizational tools to:
- Categorize channels by topic, content type, or personal preference
- Quickly find videos from specific channel categories
- Manage their video consumption workflow more efficiently

## Solution Overview

Implement a user-specific channel tagging system with:
- Custom tag creation with color coding
- Tag assignment to subscribed channels
- Tag-based video filtering alongside existing filters
- Intuitive UI for tag management and filtering

## Current System Analysis

### Existing Architecture
- **Frontend**: Next.js 15 with TypeScript, TailwindCSS, TanStack Query
- **Backend**: Django REST API with PostgreSQL
- **Filtering**: URL-based filter parameters with watch status filtering
- **Data Model**: User-Channel-Video relationships with UserChannel and UserVideo models

### Current Filtering Implementation
- Filter buttons in `FilterButtons.tsx` with URL search params
- API endpoint supports `/videos/{filter}` where filter = watched/unwatched/all
- VideoList component queries based on filter parameter
- Watch status tracking via UserVideo model

## Technical Design

### 1. Database Schema

#### New Models (backend/users/models.py)

```python
class ChannelTag(TimestampMixin):
    """User-defined tags for organizing channels"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="channel_tags")
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default="#3B82F6")  # Hex color code
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = "channel_tags"
        unique_together = ("user", "name")
        ordering = ["name"]

class UserChannelTag(TimestampMixin):
    """Many-to-many relationship between user channels and tags"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_channel = models.ForeignKey("UserChannel", on_delete=models.CASCADE, related_name="channel_tags")
    tag = models.ForeignKey("ChannelTag", on_delete=models.CASCADE, related_name="channel_assignments")
    
    class Meta:
        db_table = "user_channel_tags"
        unique_together = ("user_channel", "tag")
```

#### Database Migration
- Add new tables: `channel_tags` and `user_channel_tags`
- Add indexes on frequently queried fields (user, tag combinations)
- Ensure referential integrity with existing models

### 2. Backend API Design

#### Tag Management Endpoints

```python
# URLs: backend/users/urls.py
GET    /api/auth/tags/                    # List user's tags
POST   /api/auth/tags/                    # Create new tag
GET    /api/auth/tags/{id}/               # Get specific tag
PUT    /api/auth/tags/{id}/               # Update tag
DELETE /api/auth/tags/{id}/               # Delete tag
```

#### Channel Tag Assignment Endpoints

```python
PUT    /api/auth/channels/{id}/tags/      # Assign/remove tags from channel
GET    /api/auth/channels/{id}/tags/      # Get channel's tags
```

#### Enhanced Filtering Endpoints

```python
GET    /api/videos?tags=tag1,tag2&tag_mode=any&watch_status=unwatched
GET    /api/videos?tags=tag1,tag2&tag_mode=all&watch_status=watched
GET    /api/channels?tags=tag1,tag2
```

#### Serializers

```python
class ChannelTagSerializer(serializers.ModelSerializer):
    channel_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChannelTag
        fields = ['id', 'name', 'color', 'description', 'channel_count', 'created_at']
    
    def get_channel_count(self, obj):
        return obj.channel_assignments.count()

class UserChannelSerializer(serializers.ModelSerializer):
    tags = ChannelTagSerializer(source='channel_tags.tag', many=True, read_only=True)
    
    class Meta:
        model = UserChannel
        fields = ['id', 'channel', 'channel_title', 'is_active', 'tags', 'subscribed_at']
```

#### View Logic

```python
class ChannelTagViewSet(viewsets.ModelViewSet):
    serializer_class = ChannelTagSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ChannelTag.objects.filter(user=self.request.user).prefetch_related('channel_assignments')

class VideoListView(generics.ListAPIView):
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Existing watch status filter logic
        watch_status = self.kwargs.get('watch_status', 'all')
        
        # New tag filtering
        tag_names = self.request.query_params.get('tags', '').split(',')
        tag_mode = self.request.query_params.get('tag_mode', 'any')
        
        if tag_names and tag_names[0]:  # If tags are provided
            if tag_mode == 'all':
                # Videos from channels that have ALL specified tags
                queryset = queryset.filter(
                    channel__user_subscriptions__channel_tags__tag__name__in=tag_names,
                    channel__user_subscriptions__channel_tags__tag__user=self.request.user
                ).annotate(
                    tag_count=Count('channel__user_subscriptions__channel_tags__tag', distinct=True)
                ).filter(tag_count=len(tag_names))
            else:  # tag_mode == 'any'
                # Videos from channels that have ANY of the specified tags
                queryset = queryset.filter(
                    channel__user_subscriptions__channel_tags__tag__name__in=tag_names,
                    channel__user_subscriptions__channel_tags__tag__user=self.request.user
                )
        
        return queryset.distinct()
```

### 3. Frontend Architecture

#### TypeScript Types (types.ts)

```typescript
export enum TagMode {
  ALL = 'all',
  ANY = 'any'
}

export type TagModeType = TagMode.ALL | TagMode.ANY;

export interface ChannelTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  channel_count: number;
  created_at: string;
}

// Update existing Channel interface
export interface Channel {
  id: string;
  channel_id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  tags: ChannelTag[]; // Add tags field
  // ... other existing fields
}

// Update existing Video interface  
export interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  watched: boolean;
  channel_tags: ChannelTag[]; // Add channel tags field
  // ... other existing fields
}

export interface TagFilterParams {
  tags?: string[];
  tag_mode?: TagModeType;
  watch_status?: string; // existing watch status filter
}

export interface TagCreateRequest {
  name: string;
  color: string;
  description?: string;
}

export interface TagAssignmentRequest {
  tag_ids: string[];
}
```

#### API Service Functions (services/api.ts)

```typescript
// Tag Management
export async function fetchChannelTags(): Promise<ApiResponse<ChannelTag[]>> {
  const response = await fetch(`${API_BASE_URL}/auth/tags`, {
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<ChannelTag[]>(response);
}

export async function createChannelTag(tag: TagCreateRequest): Promise<ApiResponse<ChannelTag>> {
  const response = await fetch(`${API_BASE_URL}/auth/tags`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(tag),
  });
  return ResponseHandler.handle<ChannelTag>(response);
}

export async function updateChannelTag(id: string, tag: Partial<TagCreateRequest>): Promise<ApiResponse<ChannelTag>> {
  const response = await fetch(`${API_BASE_URL}/auth/tags/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(tag),
  });
  return ResponseHandler.handle<ChannelTag>(response);
}

export async function deleteChannelTag(id: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_BASE_URL}/auth/tags/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<void>(response);
}

// Channel Tag Assignment
export async function assignChannelTags(channelId: string, tagIds: string[]): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_BASE_URL}/auth/channels/${channelId}/tags`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ tag_ids: tagIds }),
  });
  return ResponseHandler.handle<void>(response);
}

// Enhanced Video Fetching
export async function fetchVideosWithTags(params: TagFilterParams): Promise<ApiResponse<VideoResponse>> {
  const queryParams = new URLSearchParams();
  
  if (params.watch_status && params.watch_status !== 'all') {
    queryParams.set('watch_status', params.watch_status);
  }
  
  if (params.tags && params.tags.length > 0) {
    queryParams.set('tags', params.tags.join(','));
    queryParams.set('tag_mode', params.tag_mode || TagMode.ANY);
  }
  
  let url = `${API_BASE_URL}/videos`;
  if (queryParams.toString()) {
    url += `?${queryParams.toString()}`;
  }
  
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<VideoResponse>(response);
}
```

#### Core Components

##### 1. TagManager Component

```typescript
// components/tags/TagManager.tsx
interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onTagsChange: () => void;
}

export function TagManager({ isOpen, onClose, onTagsChange }: TagManagerProps) {
  // Tag CRUD operations
  // Color picker for tag creation
  // List of existing tags with edit/delete options
  // Form validation for tag names (unique, length limits)
}
```

##### 2. TagSelector Component

```typescript
// components/tags/TagSelector.tsx
interface TagSelectorProps {
  channelId: string;
  selectedTags: ChannelTag[];
  onTagsChange: (tags: ChannelTag[]) => void;
}

export function TagSelector({ channelId, selectedTags, onTagsChange }: TagSelectorProps) {
  // Multi-select dropdown with tag creation option
  // Search/filter through existing tags
  // Visual tag representation with colors
}
```

##### 3. TagBadge Component

```typescript
// components/tags/TagBadge.tsx
interface TagBadgeProps {
  tag: ChannelTag;
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}

export function TagBadge({ tag, size = 'md', removable, onRemove, onClick }: TagBadgeProps) {
  // Colored badge with tag name
  // Optional remove button for editing contexts
  // Clickable for filtering contexts
}
```

##### 4. TagFilter Component

```typescript
// components/tags/TagFilter.tsx
interface TagFilterProps {
  selectedTags: string[];
  tagMode: TagModeType;
  onTagsChange: (tags: string[]) => void;
  onTagModeChange: (mode: TagModeType) => void;
}

export function TagFilter({ selectedTags, tagMode, onTagsChange, onTagModeChange }: TagFilterProps) {
  // Tag selection chips
  // AND/OR toggle for tag mode
  // Quick clear all option
}
```

#### Enhanced Existing Components

##### FilterButtons Enhancement

```typescript
// app/videos/components/FilterButtons.tsx
// Update existing FilterButtonsProps interface
interface FilterButtonsProps {
  // ... existing props
  availableTags: ChannelTag[];
  selectedTags: string[];
  tagMode: TagModeType;
  onTagFilterChange: (tags: string[], mode: TagModeType) => void;
}

export function FilterButtons(props: FilterButtonsProps) {
  // Existing watch status filters (unwatched, watched, all)
  // New tag filter section below or beside existing filters
  // Combined URL state management for both filter types
}
```

##### VideoCard Enhancement

```typescript
// app/videos/components/VideoCard.tsx - Add to existing component
// Display channel tags as small colored badges near channel title
// Show at most 3 tags with "+" indicator for more
// Clickable tags to quickly filter by that tag
```

##### ChannelSubscriptions Enhancement

```typescript
// components/channels/ChannelSubscriptions.tsx
// Add tag assignment interface to each channel card
// Tag assignment interface should enable creating a new tag that is immediately assigned to the channel
// Bulk tag operations for multiple channels
// Tag-based grouping/sorting options
```

### 4. URL State Management

#### Enhanced Search Parameters
```typescript
// Current: /videos?filter=unwatched
// New: /videos?watch_status=unwatched&tags=tech,tutorial&tag_mode=any

interface VideoPageSearchParams {
  watch_status?: 'watched' | 'unwatched' | 'all';
  tags?: string; // comma-separated tag names
  tag_mode?: TagModeType;
  page?: string;
}
```

#### State Management Logic
```typescript
// app/videos/components/VideoList.tsx
export function VideoList() {
  const searchParams = useSearchParams();
  const watchStatus = searchParams.get('watch_status') || 'unwatched';
  const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  const tagMode = (searchParams.get('tag_mode') as TagModeType) || TagMode.ANY;
  
  const { data: videosResponse } = useQuery({
    queryKey: ['videos', watchStatus, tags, tagMode],
    queryFn: () => fetchVideosWithTags({ watch_status: watchStatus, tags, tag_mode: tagMode }),
  });
  
  // Component logic
}
```

### 5. Internationalization

#### New i18n Keys (locales/en/tags.json)
```json
{
  "tags": "Tags",
  "createTag": "Create Tag",
  "editTag": "Edit Tag",
  "deleteTag": "Delete Tag",
  "tagName": "Tag Name",
  "tagColor": "Tag Color",
  "tagDescription": "Description",
  "assignTags": "Assign Tags",
  "removeTags": "Remove Tags",
  "filterByTags": "Filter by Tags",
  "tagMode": {
    "any": "Any of these tags",
    "all": "All of these tags"
  },
  "noTags": "No tags assigned",
  "tagAlreadyExists": "Tag with this name already exists",
  "confirmDeleteTag": "Delete this tag? It will be removed from all channels.",
  "tagUsageCount": "Used on {{count}} channel(s)"
}
```

#### Updated Video i18n (locales/en/videos.json)
```json
{
  "existing keys": "...",
  "filterByChannelTags": "Filter by channel tags",
  "channelTags": "Channel tags",
  "taggedChannels": "{{count}} tagged channels"
}
```

## Implementation Phases

### Phase 1: Database and Backend Foundation ✅ **Completed**
1. ✅ Create database models for ChannelTag and UserChannelTag
2. ✅ Generate and apply Django migrations
3. ✅ Implement serializers for tag models
4. ✅ Create basic CRUD views for tag management
5. ✅ Add URL patterns for tag endpoints

**Implementation Notes:**
- Models added to `backend/users/models.py` with proper relationships and constraints
- ChannelTagSerializer includes `channel_count` field for UI display
- UserChannelSerializer enhanced with `tags` field for channel tag display
- ChannelTagViewSet provides full CRUD operations with user filtering
- URL patterns follow existing users app convention (individual paths vs router)
- Available endpoints: GET/POST `/api/auth/tags`, GET/PUT/DELETE `/api/auth/tags/{id}`

### Phase 2: API Integration and Enhanced Filtering ✅ **Completed**
1. ✅ Extend video list views with tag filtering logic
2. ✅ Add tag assignment endpoints for channels
3. ✅ Update channel serializers to include tag information
4. ✅ Implement tag-based query optimization
5. ✅ Add comprehensive API testing

**Implementation Notes:**
- VideoSearchService created with single-query optimization using EXISTS and COUNT
- Pydantic validation implemented (TagAssignmentParams, VideoSearchParams) with user context
- Tag filtering supports both "any" (OR) and "all" (AND) modes via query parameters
- VideoViewSet integrated with search service for all filtering operations (list, watched, unwatched)
- Tag assignment endpoints: PUT/GET `/api/auth/channels/{id}/tags` with proper validation  
- VideoListSerializer enhanced with `channel_tags` field showing assigned tags
- Available query parameters: `?tags=tech,tutorial&tag_mode=all&watch_status=unwatched`
- Comprehensive test suite created (`backend/users/test_tag_functionality.py`) with 30+ test cases covering model validation, API endpoints, tag filtering, query optimization, and error handling

### Phase 3: Frontend Types and Services ✅ **Completed**
1. ✅ Update TypeScript interfaces for tag support
2. ✅ Create API service functions for tag operations
3. ✅ Add React Query hooks for tag data management
4. ✅ Implement error handling for tag operations

**Implementation Notes:**
- TypeScript interfaces updated in `types.ts`: `ChannelTag`, `TagMode`, `TagFilterParams`, `TagCreateRequest`, `TagAssignmentRequest`
- Enhanced existing `Video` and `UserChannel` interfaces with tag support (`channel_tags`, `tags` fields)
- API service functions implemented in `services/api.ts` for tag CRUD operations and tag-filtered video fetching
- React Query hooks created in `components/tags/mutations.ts` with optimistic updates and proper cache management
- Error handling system with i18n support: `TagError` class and translation keys in `locales/en/tags.json`
- All functions follow existing code patterns (direct function references vs arrow function wrappers for React Query)
- Consistent naming conventions: `fetchChannelTagsById`, `useChannelTags`, etc.

### Phase 4: Core Tag Components ✅ **Completed**
1. ✅ Build TagBadge component with color support
2. ✅ Create TagManager modal for tag CRUD operations
3. ✅ Implement TagSelector for channel tag assignment
4. ✅ Build TagFilter component for video filtering
5. ✅ Add comprehensive component testing

**Implementation Notes:**
- **Modular Architecture**: TagManager broken into smaller focused components (TagForm, TagList, TagItem)
- **TagBadge**: Reusable component with size variants (sm/md/lg), optional click/remove functionality, and accessibility support
- **TagManager**: Modal with CRUD operations, random color selection for new tags, and live preview
- **TagSelector**: Dropdown with search functionality, optimistic updates, and create-new-tag integration
- **TagFilter**: Collapsible filter interface with tag mode selection (ANY/ALL) and clear functionality
- **Component Features**: All components include identifying CSS classes, i18n support, TypeScript interfaces, and proper error handling
- **Accessibility**: Keyboard navigation, ARIA labels, focus management, and screen reader support
- **Integration**: React Query mutations with cache invalidation and optimistic updates
- **Export Structure**: Centralized exports via `components/tags/index.ts` for clean imports

### Phase 5: UI Integration
1. Enhance FilterButtons with tag filtering interface
2. Add tag display to VideoCard component
3. Integrate tag management into ChannelSubscriptions
4. Update video list filtering logic
5. Implement URL state management for tag filters

### Phase 6: Internationalization and Polish
1. Add tag-related i18n strings
2. Implement loading states and error handling
3. Add tag usage analytics and insights
4. Performance optimization for tag queries
5. User acceptance testing and feedback

### Phase 7: Advanced Features (Future)
1. Tag suggestions based on channel content
2. Tag-based notification preferences
3. Export/import tag configurations
4. Tag sharing between users
5. Advanced tag analytics dashboard

## Performance Considerations

### Database Optimization
- Add composite indexes on frequently queried field combinations
- Use select_related and prefetch_related for tag queries
- Implement pagination for tag-heavy views
- Consider tag usage denormalization for frequently accessed counts

### Frontend Optimization
- Implement tag caching with React Query
- Use virtualization for large tag lists
- Debounce tag search and filter operations
- Lazy load tag management components

### API Efficiency
- Batch tag assignment operations
- Use efficient filtering queries with EXISTS clauses
- Implement response caching for stable tag data
- Optimize serializer field selection

## Testing Strategy

### Backend Testing
- Unit tests for tag model constraints and methods
- API endpoint tests for tag CRUD operations
- Integration tests for tag filtering logic
- Performance tests for complex tag queries

### Frontend Testing
- Component tests for all tag-related components
- Integration tests for tag filtering workflows
- E2E tests for complete tag management scenarios
- Accessibility testing for tag interfaces

## Success Metrics

### User Engagement
- Adoption rate of tag creation and usage
- Average number of tags per user
- Tag-based filtering usage statistics
- User session length improvements

### Performance Metrics
- Tag query response times
- Video filtering performance with tags
- Tag management operation speeds
- Overall application performance impact

### User Experience
- Tag discoverability and usage patterns
- User feedback on tag organization effectiveness
- Reduction in video browsing time
- Tag management workflow efficiency

## Risks and Mitigation

### Technical Risks
- **Database performance impact**: Mitigate with proper indexing and query optimization
- **Complex filtering logic**: Implement comprehensive testing and gradual rollout
- **Frontend complexity**: Use component composition and clear state management

### User Experience Risks
- **Feature complexity**: Provide clear onboarding and intuitive UI design
- **Tag management overhead**: Make tag operations quick and bulk-actionable
- **Filter confusion**: Maintain clear visual distinction between filter types

### Business Risks
- **Low adoption**: Implement usage analytics and iterative improvements
- **Performance degradation**: Monitor key metrics and optimize proactively
- **Maintenance burden**: Ensure comprehensive documentation and testing

## Future Enhancements

### Short Term (Next 3 months)
- Smart tag suggestions based on channel titles and descriptions
- Tag-based video recommendations
- Quick tag templates for common categories

### Medium Term (3-6 months)
- Tag hierarchy and nested tags
- Tag-based notification settings
- Advanced tag analytics and insights

### Long Term (6+ months)
- Machine learning-powered tag suggestions
- Collaborative tag sharing features
- Integration with external categorization systems

## Conclusion

This channel tagging and filtering feature will significantly enhance the user experience by providing flexible organization tools for video content. The phased implementation approach ensures backward compatibility while delivering immediate value to users. The technical design leverages existing patterns and infrastructure for maintainable, scalable implementation.