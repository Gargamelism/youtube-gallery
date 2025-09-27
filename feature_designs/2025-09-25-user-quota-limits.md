# User Quota Limits Feature Design

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [Current System Analysis](#current-system-analysis)
5. [Technical Design](#technical-design)
6. [Implementation Phases](#implementation-phases)
7. [Performance Considerations](#performance-considerations)
8. [Testing Strategy](#testing-strategy)
9. [Success Metrics](#success-metrics)
10. [Risks and Mitigation](#risks-and-mitigation)
11. [Conclusion](#conclusion)

## Overview

Add daily quota limits per user to prevent individual users from exhausting the shared YouTube API quota pool. Users will have a personal daily limit based on token/quota consumption rather than simple operation counts, allowing efficient users to import more while limiting resource-intensive operations.

## Problem Statement

Currently, the application uses a global quota tracker that manages YouTube API usage across all users. This creates several issues:

- **Shared Resource Abuse**: A single user importing large channels can exhaust quota for all users
- **No User Accountability**: Heavy usage cannot be traced to specific users
- **Unfair Resource Distribution**: Users importing small channels are limited by those importing large ones
- **No Usage Visibility**: Users cannot see their personal quota consumption

## Solution Overview

Implement per-user daily quota tracking that:

- **Token-Based Limits**: Track actual YouTube API quota consumption per user, not operation counts
- **Daily Reset**: Quota limits reset at midnight UTC for fair daily access
- **Graceful Degradation**: Block new operations when user quota exceeded, with clear error messages
- **Usage Transparency**: Provide users with real-time quota usage information

## Current System Analysis

### Existing Quota System

The application already has comprehensive quota tracking via `QuotaTracker` class in `backend/videos/services/quota_tracker.py`:

- **Redis-Based Storage**: Uses Redis-OM for persistent daily quota tracking
- **Operation Cost Mapping**: Defines quota costs for different YouTube API operations:
  - `channels.list`: 1 quota unit
  - `search.list`: 100 quota units
  - `videos.list`: 1 quota unit
  - `playlistItems.list`: 1 quota unit
- **Smart Batching**: Optimizes batch sizes based on remaining quota
- **Global Limits**: Currently tracks system-wide usage (default 10,000 units/day)

### Channel Import Flow

Channel imports happen through `ChannelViewSet.fetch_from_youtube()`:

1. User submits channel ID via POST `/api/videos/channels/fetch-from-youtube/`
2. YouTube authentication verified via `@youtube_auth_required` decorator
3. `YouTubeService.import_or_create_channel()` called with global quota tracker
4. Quota costs vary significantly based on channel size (large channels consume more quota)

### User Model Structure

User models in `backend/users/models.py` provide foundation for per-user tracking:

- **User Model**: UUID-based primary keys with timestamps
- **UserChannel**: Many-to-many relationship tracking user-channel subscriptions
- **YouTube Integration**: Encrypted credential storage via `UserYouTubeCredentials`

## Technical Design

### Database Schema Changes

Create new model for per-user quota tracking:

```python
# backend/users/models.py

class UserDailyQuota(TimestampMixin):
    """Track daily quota usage per user"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_quotas")
    date = models.DateField(default=timezone.now)
    quota_used = models.IntegerField(default=0)
    operations_count = models.JSONField(default=dict)  # Track operation types

    class Meta:
        db_table = "user_daily_quotas"
        unique_together = ("user", "date")
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["date"]),
        ]
```

### Backend API Design

#### Enhanced Quota Tracker

Create `UserQuotaTracker` class extending existing functionality:

```python
# backend/videos/services/user_quota_tracker.py

class UserQuotaTracker(QuotaTracker):
    """Per-user quota tracking with daily limits"""

    DEFAULT_USER_DAILY_LIMIT = 1000  # Conservative per-user limit

    def __init__(self, user, user_daily_limit: int = None):
        super().__init__(daily_quota_limit=10000)  # Keep global limit
        self.user = user
        self.user_daily_limit = user_daily_limit or self.DEFAULT_USER_DAILY_LIMIT

    def can_make_request(self, operation: str = "channels.list") -> bool:
        # Check both global and user quota
        global_ok = super().can_make_request(operation)
        user_ok = self._can_user_make_request(operation)
        return global_ok and user_ok

    def record_usage(self, operation: str = "channels.list", quota_cost: int = None):
        # Record both global and user usage
        super().record_usage(operation, quota_cost)
        self._record_user_usage(operation, quota_cost)
```

#### Updated View Logic

Modify `ChannelViewSet.fetch_from_youtube()` to use user-specific quota:

```python
# backend/videos/views.py

@action(detail=False, methods=["post"])
@youtube_auth_required
def fetch_from_youtube(self, request):
    """Import channel from YouTube with per-user quota limits"""
    channel_id = request.data.get("channel_id")
    if not channel_id:
        raise ValidationError({"channel_id": "This field is required."})

    try:
        # Use user-specific quota tracker instead of global
        user_quota_tracker = UserQuotaTracker(user=request.user)
        youtube_service = YouTubeService(
            credentials=request.youtube_credentials,
            quota_tracker=user_quota_tracker
        )
        channel = youtube_service.import_or_create_channel(channel_id)
        serializer = self.get_serializer(channel, context={"request": request})
        return Response(serializer.data)

    except UserQuotaExceededError as e:
        return Response({
            "error": "Daily quota limit exceeded",
            "quota_info": e.quota_info,
            "message": f"You've used {e.quota_info['used']}/{e.quota_info['limit']} quota units today"
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
```

#### New API Endpoints

Add quota information endpoint:

```python
# backend/users/views.py

@action(detail=False, methods=["get"])
def quota_usage(self, request):
    """Get current user's quota usage information"""
    user_quota_tracker = UserQuotaTracker(user=request.user)
    usage_info = user_quota_tracker.get_user_usage_summary()

    return Response({
        "daily_limit": usage_info["daily_limit"],
        "used": usage_info["daily_usage"],
        "remaining": usage_info["remaining"],
        "percentage_used": usage_info["percentage_used"],
        "status": usage_info["status"],
        "operations_breakdown": usage_info["operations_count"],
        "resets_at": "midnight UTC"
    })
```

### Frontend TypeScript Types

```typescript
// types.ts

export interface UserQuotaInfo {
  daily_limit: number;
  used: number;
  remaining: number;
  percentage_used: number;
  status: 'normal' | 'moderate' | 'high' | 'critical';
  operations_breakdown: Record<string, number>;
  resets_at: string;
}

export interface QuotaExceededError {
  error: string;
  quota_info: UserQuotaInfo;
  message: string;
}
```

### Frontend Components

Simple quota indicator component:

```typescript
// components/QuotaIndicator.tsx

interface QuotaIndicatorProps {
  quotaInfo: UserQuotaInfo;
  className?: string;
}

export function QuotaIndicator({ quotaInfo, className }: QuotaIndicatorProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  return (
    <div className={`p-2 rounded-md ${getStatusColor(quotaInfo.status)} ${className}`}>
      <div className="text-sm font-medium">
        Daily Quota: {quotaInfo.used}/{quotaInfo.daily_limit} ({quotaInfo.percentage_used}%)
      </div>
      <div className="text-xs text-gray-500">
        {quotaInfo.remaining} remaining • Resets at midnight UTC
      </div>
    </div>
  );
}
```

### Error Handling

Frontend quota error handling:

```typescript
// services/api.ts

export async function importChannel(channelId: string): Promise<Channel> {
  try {
    const response = await apiClient.post('/videos/channels/fetch-from-youtube/', {
      channel_id: channelId
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 429 && error.response.data?.quota_info) {
      // Handle quota exceeded error specifically
      throw new QuotaExceededError(error.response.data);
    }
    throw error;
  }
}
```

## Implementation Phases

### Phase 1: Database and Core Logic (**Implemented**)
- ✅ Create `UserDailyQuota` model with migration
- ✅ Implement `UserQuotaTracker` service class
- ✅ Enhanced `QuotaTracker` with public `get_quota_status()` method using enum and match/case
- ✅ Create custom `UserQuotaExceededError` exception

**Implementation Details:**
- Added `UserDailyQuota` model to `users/models.py` with optimized indexes
- Created `UserQuotaTracker` in `videos/services/user_quota_tracker.py` extending base `QuotaTracker`
- Enhanced base `QuotaTracker` with `QuotaStatus` enum and modern match/case syntax
- Added `UserQuotaExceededError` exception in `videos/exceptions.py`
- Migration pending: Run `docker-compose run --rm backend python manage.py makemigrations users`

### Phase 2: Backend API Integration (**Implemented**)
- ✅ Update `ChannelViewSet.fetch_from_youtube()` to use per-user quota
- ✅ Add user quota usage endpoint (`/api/auth/quota-usage/`)
- ✅ Implement proper error responses for quota exceeded scenarios
- ✅ Update existing tests to cover user quota logic

**Implementation Details:**
- Updated `videos/views.py` to use `UserQuotaTracker` instead of global `QuotaTracker`
- Added `UserQuotaExceededError` handling with HTTP 429 status code and detailed quota information
- Created `/api/auth/quota-usage/` endpoint in `users/views.py` returning real-time quota status
- Added URL routing for quota usage endpoint in `users/urls.py`
- Updated `test_channel_import_view_quota.py` to test user-specific quota logic
- Added comprehensive test coverage for `UserQuotaExceededError` scenarios
- Quota usage endpoint returns ISO UTC timestamp for `resets_at` field

### Phase 3: Frontend Integration (**Implemented**)
- ✅ Add quota info types and API service methods
- ✅ Create `QuotaIndicator` component for usage display
- ✅ Update channel import form with quota-aware error handling
- ✅ Add quota usage display to user dashboard/settings

**Implementation Details:**
- Added `UserQuotaInfo` and `QuotaExceededError` types to `types.ts` with `HttpStatusCode` enum
- Created `fetchUserQuotaUsage()` API service in `services/auth.ts`
- Built `QuotaIndicator` and `QuotaIndicatorCompact` components in `components/quota/` with shared color system
- Added quota-aware error handling in `ImportChannelModal` with `QuotaExceededError` class
- Created `/settings` page with full quota indicator display
- Added compact circular quota indicator to channels page with real-time updates (30s refresh)
- Implemented query invalidation to refetch quota after channel imports
- Added proper i18n support with `quota.json` and `settings.json` localization files
- Created barrel exports and organized components in dedicated quota folder

## Performance Considerations

### Database Efficiency
- **Optimized Indexes**: Added composite index on `(user, date)` for fast daily quota lookups
- **Long-term Storage**: Retain quota records indefinitely for billing analysis and user usage patterns
- **Minimal Queries**: Single query per quota check using existing user context

### Redis Integration
- **Real-time Tracking**: Redis for high-frequency quota updates during active usage
- **Daily Persistence**: Celery periodic task to sync Redis quota data to PostgreSQL at end-of-day
- **Hybrid Fallback**: Real-time reads from Redis, historical data from PostgreSQL for billing analysis
- **Atomic Operations**: Ensure quota updates are atomic to prevent race conditions

### API Efficiency
- **Minimal Overhead**: Quota checks add single database query to existing import flow
- **Batch Operations**: Maintain existing batch optimization logic for efficient API usage
- **Error Response Speed**: Fast quota exceeded responses to prevent unnecessary processing

## Testing Strategy

### Backend Testing
- **Unit Tests**: Cover `UserQuotaTracker` class methods and edge cases
- **Integration Tests**: Test quota enforcement in channel import flow
- **Database Tests**: Verify quota model constraints and indexing performance
- **Quota Reset Tests**: Test midnight UTC reset functionality

### Frontend Testing
- **Component Tests**: Test `QuotaIndicator` component rendering and state handling
- **API Integration Tests**: Mock quota exceeded responses and verify error handling
- **User Flow Tests**: End-to-end tests for quota-limited channel import scenarios

### Performance Testing
- **Concurrent User Testing**: Verify quota tracking accuracy under concurrent imports
- **Database Load Testing**: Confirm quota queries perform well with large user bases
- **Quota Boundary Testing**: Test behavior at exactly quota limit boundaries

## Success Metrics

### User Experience Metrics
- **Import Success Rate**: Maintain >95% successful channel imports within quota limits
- **Error Clarity**: User understanding of quota limits and remaining allowance
- **Usage Distribution**: More equitable quota usage across user base

### System Health Metrics
- **Global Quota Conservation**: Reduction in total daily YouTube API quota consumption
- **User Quota Utilization**: Average daily quota usage per active user
- **Heavy User Identification**: Track users consistently hitting quota limits

### Performance Metrics
- **Quota Check Latency**: <50ms additional latency for quota validation
- **Database Query Efficiency**: Single additional query per import operation
- **Error Response Time**: <200ms response time for quota exceeded errors

## Risks and Mitigation

### Technical Risks

**Risk**: Database performance impact from frequent quota updates
**Mitigation**: Optimized indexing, consider Redis caching for high-frequency operations

**Risk**: Race conditions in concurrent quota updates
**Mitigation**: Database-level constraints, atomic update operations

**Risk**: Quota tracking accuracy under high concurrency
**Mitigation**: Comprehensive testing, database transaction isolation

### User Experience Risks

**Risk**: User confusion about quota limits and resets
**Mitigation**: Clear error messages, prominent quota usage display, documentation

**Risk**: Legitimate users hitting limits due to large channel imports
**Mitigation**: Conservative initial limits, monitoring for adjustment needs

### Business Risks

**Risk**: Reduced user engagement due to quota restrictions
**Mitigation**: Start with generous limits, gather usage data for optimization

**Risk**: Support burden from quota-related user complaints
**Mitigation**: Self-service quota usage information, clear documentation

## Conclusion

The user quota limits feature addresses critical resource management issues while maintaining system performance and user experience. By leveraging the existing robust quota tracking infrastructure and extending it with per-user limits, we can ensure fair resource distribution without compromising the application's core functionality.

The phased implementation approach allows for gradual rollout and monitoring, while the token-based quota system ensures that efficient users aren't penalized for others' resource-intensive operations. This solution provides a foundation for sustainable growth while protecting shared YouTube API resources.