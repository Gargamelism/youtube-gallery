# MyPy Type Annotation Implementation Strategy

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [Current System Analysis](#current-system-analysis)
5. [Technical Design](#technical-design)
   - [Configuration Strategy](#configuration-strategy)
   - [Quick Wins Implementation](#quick-wins-implementation)
   - [Systematic Type Annotation Patterns](#systematic-type-annotation-patterns)
6. [Implementation Phases](#implementation-phases)
7. [Performance Considerations](#performance-considerations)
8. [Testing Strategy](#testing-strategy)
9. [Risks and Mitigation](#risks-and-mitigation)
10. [Conclusion](#conclusion)

## Overview

This document outlines the comprehensive strategy for implementing MyPy type annotations across the Django backend codebase. The implementation focuses on practical, incremental improvements using a "quick wins" approach while establishing patterns for systematic completion of remaining work.

The strategy prioritizes production code quality while excluding test files, migrations, and management commands from type checking to maintain focus on code that directly impacts runtime behavior.

## Problem Statement

The Django backend codebase currently lacks comprehensive type annotations, leading to several challenges:

1. **Type Safety Gaps**: Missing return type annotations and parameter types reduce IDE autocomplete effectiveness and catch fewer bugs during development
2. **Implicit Optional Issues**: Many function parameters use `param: Type = None` instead of `param: Optional[Type] = None`, causing mypy errors
3. **DRF Integration Complexity**: Django REST Framework serializers and views require complex generic type parameters that aren't consistently applied
4. **Third-Party Library Stubs**: Missing type stubs for libraries like `django-filter`, `googleapiclient`, and `celery` create import errors
5. **Test Noise**: Including test files, migrations, and management commands in mypy checking creates excessive noise that obscures production code issues
6. **Inconsistent Patterns**: Mixing `get_user_model()` with direct imports and using relative imports instead of absolute imports

These issues make it harder to catch bugs early, reduce code maintainability, and create a poor developer experience with constant mypy warnings.

## Solution Overview

Implement type annotations using a phased approach with three key strategies:

**1. Configuration-First Approach**
- Configure mypy in `pyproject.toml` to exclude non-production code
- Add per-module overrides for third-party libraries without type stubs
- Install available type stub packages for better third-party integration

**2. Quick Wins Implementation**
- Focus on high-impact, low-effort fixes that resolve many errors quickly
- Prioritize common patterns: `__str__` methods, implicit Optional, task return types
- Remove unnecessary `type: ignore` comments where mypy configuration handles the issue

**3. Systematic Pattern-Based Completion**
- Establish clear patterns for DRF serializers, views, and validators
- Create reusable TypedDict definitions for structured dictionaries
- Document patterns in this design doc for future reference

**Key Principles**:
- Production code only (exclude tests, migrations, scripts)
- Absolute imports throughout
- Direct User model imports (not `get_user_model()`)
- Specific types instead of `Any` whenever possible
- TypedDict for complex dictionary structures

## Current System Analysis

### MyPy Configuration State

**Current `pyproject.toml` Configuration**:
```toml
[tool.mypy]
python_version = "3.13"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = false  # Set to false to allow gradual typing
check_untyped_defs = true
warn_redundant_casts = true
warn_unused_ignores = true
strict_optional = true
no_implicit_optional = true  # Requires explicit Optional[] for None defaults

exclude = [
    "^.*/migrations/.*\\.py$",
    "^.*/tests/.*\\.py$",
    "^.*/management/commands/.*\\.py$",
    "^scripts/.*\\.py$",
    "^manage\\.py$",
    "^conftest\\.py$",
]

[[tool.mypy.overrides]]
module = [
    "decouple",
    "dirtyfields",
    "redis_om",
    "googleapiclient.*",
    "google_auth_oauthlib.*",
    "django_celery_beat.*",
]
ignore_missing_imports = true
```

**Type Stub Packages Installed**:
- `django-stubs`
- `djangorestframework-stubs`
- `celery-types`
- `types-python-dateutil`
- `django-filter-stubs`

### Code Patterns Analysis

**Anti-Patterns Found (Now Fixed)**:
1. Using `User = get_user_model()` instead of `from users.models import User`
2. Relative imports like `from ..models import` instead of absolute imports
3. Missing return type annotations on `__str__` methods
4. Implicit Optional: `param: Type = None` instead of `param: Optional[Type] = None`
5. Generic `Any` usage for tags instead of specific types
6. Unnecessary `type: ignore` comments for imports now covered by config

**Good Patterns Observed**:
1. TypedDict usage for structured data (e.g., `VideoStats`, `GoogleCredentialsData`)
2. Pydantic validators with proper type annotations
3. Service layer with clear type signatures
4. Type narrowing with `assert` and `cast()` where needed

### Error Categories from Initial MyPy Run

**High-Volume Categories** (100+ errors each):
1. Missing return type annotations (especially `__str__` methods)
2. Implicit Optional parameters
3. DRF serializer generic type parameters
4. Missing type annotations in Celery tasks
5. Request/Response type mismatches in views

**Medium-Volume Categories** (20-100 errors):
1. Admin class generic types
2. Decorator function signatures
3. Service layer method annotations
4. Validator return types

**Low-Volume Categories** (<20 errors):
1. Exception class constructors
2. Custom field types
3. Model method return types

## Technical Design

### Configuration Strategy

The mypy configuration uses three complementary approaches to reduce noise and focus on production code:

#### 1. File Exclusion Pattern

Exclude entire file categories from type checking:
```toml
exclude = [
    "^.*/migrations/.*\\.py$",       # Database migrations (auto-generated)
    "^.*/tests/.*\\.py$",            # Test files (separate quality standards)
    "^.*/management/commands/.*\\.py$",  # CLI scripts (utility code)
    "^scripts/.*\\.py$",             # Standalone scripts
    "^manage\\.py$",                 # Django management entry point
    "^conftest\\.py$",               # pytest configuration
]
```

**Rationale**:
- Migrations are auto-generated and never manually edited
- Test files have different type requirements (mocking, fixtures)
- Management commands are utility scripts with minimal runtime impact
- Focus mypy effort on code that runs in production

#### 2. Third-Party Library Handling

Use module overrides for libraries without type stubs:
```toml
[[tool.mypy.overrides]]
module = [
    "decouple",                # django-decouple (no stubs available)
    "dirtyfields",            # django-dirtyfields (no stubs available)
    "redis_om",               # redis-om (no stubs available)
    "googleapiclient.*",      # Google API client (stubs incomplete)
    "google_auth_oauthlib.*", # Google OAuth library (stubs incomplete)
    "django_celery_beat.*",   # Celery beat (stubs incomplete)
]
ignore_missing_imports = true
```

**Impact**: Eliminates ~50 import errors without adding `type: ignore` comments throughout codebase.

#### 3. Gradual Typing Strategy

Key settings for incremental adoption:
```toml
disallow_untyped_defs = false  # Allow functions without type annotations
check_untyped_defs = true      # Check annotated parameters even if return type missing
no_implicit_optional = true    # Require explicit Optional[] for None defaults
```

**Progression Path**:
1. Phase 1: `disallow_untyped_defs = false` - current state, allows gradual addition
2. Phase 2 (Future): `disallow_untyped_defs = true` - requires all functions annotated
3. Phase 3 (Future): Enable strict mode for maximum type safety

### Quick Wins Implementation

Quick wins are high-impact, low-effort fixes that resolve many errors with minimal code changes. These were prioritized first to demonstrate value and reduce error count quickly.

#### Pattern 1: `__str__` Return Type Annotations

**Problem**: Django model `__str__` methods implicitly return `str` but lack annotations.

**Impact**: ~20 errors across models

**Fix Pattern**:
```python
# Before
def __str__(self):
    return self.name

# After
def __str__(self) -> str:
    return self.name
```

**Files Fixed**:
- `backend/videos/models.py` - 3 models (UpdateFrequency, Channel, Video)
- `backend/users/models.py` - 4 models (ChannelTag, UserChannelTag, UserDailyQuota, UserYouTubeCredentials)

**Completed**: ✅ 7 models, 0 errors remaining

#### Pattern 2: Implicit Optional Parameters

**Problem**: `no_implicit_optional = true` requires explicit `Optional[Type]` for parameters with `None` defaults.

**Impact**: ~30 errors across codebase

**Fix Pattern**:
```python
from typing import Optional

# Before
def __init__(self, message: str, retry_after: int = None):
    self.retry_after = retry_after

# After
def __init__(self, message: str, retry_after: Optional[int] = None):
    self.retry_after = retry_after
```

**Example Fix** (`backend/videos/exceptions.py`):
```python
class ChannelUpdateError(Exception):
    def __init__(
        self,
        message: str,
        channel_uuid: Optional[str] = None,
        retry_after: Optional[int] = None
    ):
        super().__init__(message)
        self.channel_uuid = channel_uuid
        self.retry_after = retry_after
```

**Completed**: ✅ All exceptions fixed

#### Pattern 3: Celery Task Return Types

**Problem**: Celery task functions need explicit return type annotations.

**Impact**: ~15 errors in task files

**Fix Pattern**:
```python
from typing import Any

# Before
@shared_task(bind=True)
def update_single_channel(self, channel_uuid: str):
    # ...
    return {"success": True, "channel_uuid": channel_uuid}

# After
@shared_task(bind=True)
def update_single_channel(self, channel_uuid: str) -> dict[str, Any]:  # type: ignore[misc]
    # ...
    return {"success": True, "channel_uuid": channel_uuid}
```

**Note**: `type: ignore[misc]` required for Celery's `bind=True` decorator which mypy doesn't fully understand.

**Files Fixed**:
- `backend/videos/tasks.py` - 5 task functions + 1 helper function

**Completed**: ✅ All task return types annotated

#### Pattern 4: Removing Unnecessary `type: ignore` Comments

**Problem**: Some `type: ignore` comments are unnecessary after mypy config updates.

**Impact**: ~5 occurrences

**Fix Pattern**:
```python
# Before (when google libraries lacked stubs)
from googleapiclient.discovery import build  # type: ignore
from google_auth_oauthlib.flow import Flow  # type: ignore

# After (with ignore_missing_imports config)
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import Flow
```

**Files Fixed**:
- `backend/videos/services/youtube.py` - Removed 2 import ignores (lines 8-9)
- `backend/videos/validators.py` - Removed 2 enum ignores (lines 22, 24)

**Completed**: ✅ 3 locations cleaned up

### Systematic Type Annotation Patterns

These patterns guide the completion of remaining type annotation work.

#### Pattern A: Django REST Framework Serializers

**Generic Type Parameters**:
```python
from typing import Any
from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer[User]):
    """Generic parameter specifies the model type"""

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """Validation methods receive and return attribute dictionaries"""
        # validation logic
        return attrs

    def create(self, validated_data: dict[str, Any]) -> User:
        """Create methods return model instances"""
        user = User.objects.create_user(**validated_data)
        return user

    def update(self, instance: User, validated_data: dict[str, Any]) -> User:
        """Update methods receive instance and return updated instance"""
        instance.email = validated_data.get('email', instance.email)
        instance.save()
        return instance
```

**SerializerMethodField Pattern**:
```python
class ChannelSerializer(serializers.ModelSerializer[Channel]):
    subscriber_count = serializers.SerializerMethodField()

    def get_subscriber_count(self, obj: Channel) -> int:
        """Method name matches field: get_{field_name}"""
        return obj.user_subscriptions.filter(is_active=True).count()
```

**Files Needing This Pattern**:
- `backend/videos/serializers.py` - VideoSerializer, VideoListSerializer, ChannelSerializer
- `backend/users/serializers.py` - Partially complete, needs review

#### Pattern B: Django REST Framework Views and ViewSets

**Request/Response Types**:
```python
from typing import Any, cast
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions, viewsets
from rest_framework.serializers import BaseSerializer

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request: Request) -> Response:
    """Function-based views use Request and Response types"""
    user = cast(User, request.user)  # request.user is User | AnonymousUser
    try:
        user.auth_token.delete()
    except Exception as e:
        return Response({"error": str(e)}, status=500)

    return Response({"message": "Logged out successfully"})
```

**ViewSet Pattern**:
```python
class VideoViewSet(viewsets.ModelViewSet[Video]):
    """Generic parameter specifies the model type"""
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self) -> QuerySet[Video]:
        """Return type is QuerySet with generic model type"""
        user = cast(User, self.request.user)
        return Video.objects.filter(channel__user_channels__user=user)

    def perform_update(self, serializer: BaseSerializer[Any]) -> None:
        """perform_ methods typically return None"""
        instance = serializer.instance
        if serializer.validated_data.get("is_watched") and instance:
            serializer.save(watched_at=timezone.now())
        else:
            serializer.save()
```

**User Type Narrowing**:
```python
from typing import cast
from users.models import User

# In authenticated views, narrow AnonymousUser | User to just User
user = cast(User, request.user)
```

**Files Needing This Pattern**:
- `backend/videos/views.py` - Partially complete
- `backend/users/views.py` - Partially complete
- `backend/users/admin.py` - Admin classes need generic parameters

#### Pattern C: Pydantic Validators

**Validator Method Signatures**:
```python
from typing import List, Optional, Self
from pydantic import BaseModel, field_validator, model_validator, ValidationInfo

class VideoSearchParams(BaseModel):
    tags: Optional[List[str]] = None
    search_query: Optional[str] = None
    user: Optional[User] = None

    @field_validator("tags")
    @classmethod
    def validate_tags_belong_to_user(
        cls,
        tags: Optional[List[str]],
        info: ValidationInfo
    ) -> Optional[List[str]]:
        """Field validators are classmethods with ValidationInfo parameter"""
        if not tags or not info.context or not info.context.get("user"):
            return tags

        user = info.context["user"]
        # validation logic
        return tags

    @model_validator(mode="after")
    def validate_search_query_length(self) -> Self:
        """Model validators use mode="after" and return Self"""
        if self.search_query and len(self.search_query) > 50:
            raise ValueError("Search query too long")
        return self

    @classmethod
    def from_request(cls, request: Request) -> Self:
        """Factory methods return Self type"""
        return cls.model_validate(
            {"tags": request.query_params.get("tags")},
            context={"user": request.user}
        )
```

**Files Needing This Pattern**:
- `backend/videos/validators.py` - Mostly complete, needs final review

#### Pattern D: TypedDict for Structured Dictionaries

**When to Use TypedDict**:
- Passing dictionaries between functions with known structure
- API response/request payloads with fixed fields
- Complex configuration objects

**TypedDict Pattern**:
```python
from typing import TypedDict, List, Optional

class VideoStats(TypedDict):
    """Video statistics including total, watched, and unwatched counts"""
    total: int
    watched: int
    unwatched: int

class GoogleCredentialsData(TypedDict, total=False):
    """Google OAuth credentials data structure

    total=False means all fields are optional
    """
    access_token: str
    expires_in: int
    refresh_token: str
    scope: str
    token_type: str

def get_video_stats(user: User) -> VideoStats:
    """Return type is typed dictionary"""
    total = Video.objects.filter(user=user).count()
    watched = Video.objects.filter(user=user, is_watched=True).count()

    return {
        "total": total,
        "watched": watched,
        "unwatched": total - watched,
    }
```

**Files Using This Pattern**:
- `backend/videos/services/search.py` - VideoStats ✅
- `backend/videos/services/youtube.py` - GoogleCredentialsData, CredentialsData ✅
- `backend/users/services/quota.py` - Needs QuotaInfo TypedDict

#### Pattern E: Service Layer Methods

**Service Class Pattern**:
```python
from typing import Optional, List
from django.db.models import QuerySet

class VideoSearchService:
    """Service for video search and filtering operations"""

    def __init__(self, user: User):
        """Constructor takes required dependencies"""
        self.user = user

    def search_videos(
        self,
        tag_names: Optional[List[str]] = None,
        search_query: Optional[str] = None
    ) -> QuerySet[Video]:
        """Return type is QuerySet with generic model type"""
        queryset = Video.objects.filter(
            channel__user_channels__user=self.user
        ).select_related("channel")

        if search_query:
            queryset = queryset.filter(title__icontains=search_query)

        if tag_names:
            queryset = self._apply_tag_filter(queryset, tag_names)

        return queryset

    def _apply_tag_filter(
        self,
        queryset: QuerySet[Video],
        tag_names: List[str]
    ) -> QuerySet[Video]:
        """Private methods also have full type annotations"""
        # filtering logic
        return queryset
```

**Files Using This Pattern**:
- `backend/videos/services/search.py` - VideoSearchService ✅
- `backend/users/services/channel_search.py` - ChannelSearchService ✅

#### Pattern F: Authentication and Decorators

**Decorator Pattern**:
```python
from typing import Callable, TypeVar, ParamSpec, Concatenate
from rest_framework.request import Request
from rest_framework.response import Response

P = ParamSpec("P")  # Parameter specification
R = TypeVar("R")    # Return type variable

def youtube_auth_required(
    view_func: Callable[Concatenate[Request, P], R]
) -> Callable[Concatenate[Request, P], R | Response]:
    """
    Decorator that checks YouTube authentication

    Preserves parameter types from wrapped function
    Returns either original return type R or Response for auth failures
    """
    def wrapper(request: Request, *args: P.args, **kwargs: P.kwargs) -> R | Response:
        if not has_youtube_credentials(request.user):
            return Response(
                {"error": "YouTube authentication required"},
                status=403
            )
        return view_func(request, *args, **kwargs)

    return wrapper
```

**Authentication Pattern**:
```python
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token

class CookieTokenAuthentication(TokenAuthentication):
    def authenticate(self, request: Request) -> tuple[User, Token] | None:
        """Returns (user, token) tuple or None if not authenticated"""
        token = self._get_token_from_cookie(request)
        if not token:
            return None

        return self.authenticate_credentials(token)

    def authenticate_credentials(self, key: str) -> tuple[User, Token]:
        """Raises AuthenticationFailed on invalid credentials"""
        try:
            token = Token.objects.select_related("user").get(key=key)
        except Token.DoesNotExist:
            raise exceptions.AuthenticationFailed("Invalid token.")

        user = token.user
        if not isinstance(user, User):
            raise exceptions.AuthenticationFailed("Invalid user type.")

        return (user, token)
```

**Files Needing This Pattern**:
- `backend/videos/decorators.py` - youtube_auth_required decorator
- `backend/users/authentication.py` - CookieTokenAuthentication ✅

## Implementation Phases

### Phase 1: Foundation and Quick Wins ✅ **Completed**

**1.1: MyPy Configuration** ✅
- ✅ Updated `pyproject.toml` with exclusion patterns
- ✅ Added module overrides for third-party libraries
- ✅ Configured gradual typing settings
- ✅ Installed type stub packages

**1.2: Import Standardization** ✅
- ✅ Replaced `get_user_model()` with direct `User` imports throughout
- ✅ Changed relative imports to absolute imports in test files
- ✅ Verified no relative imports remain in production code

**1.3: Quick Win Fixes** ✅
- ✅ Fixed `__str__` return types (7 models)
- ✅ Fixed implicit Optional parameters (exceptions, tasks)
- ✅ Added Celery task return types (6 functions)
- ✅ Removed unnecessary `type: ignore` comments (3 locations)

**Acceptance Criteria**: ✅ **All Met**
- ✅ MyPy runs without configuration errors
- ✅ Test files excluded from type checking
- ✅ Third-party import errors resolved via config
- ✅ ~70 quick win errors fixed
- ✅ All type stub packages installed successfully

### Phase 2: Serializers and Views 🔄 **Pending**

**2.1: DRF Serializer Annotations**
- Add generic type parameters to all ModelSerializer classes
- Annotate `validate()`, `create()`, `update()` methods
- Add return types to `SerializerMethodField` getter methods
- Create TypedDict for complex serializer return types

**2.2: ViewSet and View Annotations**
- Add generic type parameters to ViewSet classes
- Annotate `get_queryset()` return types
- Add Request/Response types to function-based views
- Use `cast(User, request.user)` for type narrowing in authenticated views
- Annotate `perform_create()`, `perform_update()` methods

**2.3: Admin Class Annotations**
- Add generic type parameters to ModelAdmin classes
- Annotate custom admin methods

**Files to Update**:
- `backend/videos/serializers.py`
- `backend/videos/views.py`
- `backend/users/serializers.py` (review and complete)
- `backend/users/views.py` (review and complete)
- `backend/videos/admin.py`
- `backend/users/admin.py`

**Acceptance Criteria**:
- All serializers have proper generic types
- All views return typed Response objects
- Request.user properly narrowed to User type
- Admin classes have generic parameters

### Phase 3: Service Layer and Business Logic 🔄 **Pending**

**3.1: Service Class Annotations**
- Annotate all service class methods
- Create TypedDict for service return types
- Add QuerySet generic types

**3.2: Validator Annotations**
- Review and complete Pydantic validator type hints
- Ensure ValidationInfo parameters annotated
- Add `Self` return types to model validators

**3.3: Decorator Annotations**
- Add ParamSpec and TypeVar for decorator signatures
- Use Concatenate for request parameter preservation

**Files to Update**:
- `backend/videos/validators.py` (review only)
- `backend/users/services/quota.py`
- `backend/videos/decorators.py`
- `backend/videos/services/youtube.py` (review only)

**Acceptance Criteria**:
- All service methods fully annotated
- Pydantic validators type-safe
- Decorators preserve wrapped function signatures

### Phase 4: Models and Utilities 🔄 **Pending**

**4.1: Model Method Annotations**
- Add return types to custom model methods
- Annotate model property getters
- Add QuerySet manager annotations

**4.2: Utility Function Annotations**
- Annotate helper functions in utils modules
- Add type hints to date/time utilities
- Annotate URL helper functions

**4.3: Exception Classes**
- Review exception __init__ signatures (already mostly complete)
- Ensure all custom exceptions properly typed

**Files to Update**:
- `backend/videos/models.py` (custom methods only, __str__ already done)
- `backend/users/models.py` (custom methods only, __str__ already done)
- `backend/videos/utils/*.py`
- `backend/youtube_gallery/utils/*.py`

**Acceptance Criteria**:
- All model custom methods annotated
- Utility functions fully typed
- Exception classes complete

### Phase 5: Final Review and Strict Mode Preparation 🔄 **Future Work**

**5.1: Comprehensive MyPy Run**
- Run mypy on entire production codebase
- Document any remaining errors
- Categorize by difficulty and priority

**5.2: Remaining Error Resolution**
- Fix any edge case type errors
- Address complex generic type scenarios
- Resolve any Any types with specific types

**5.3: Documentation and Guidelines**
- Update this design doc with lessons learned
- Create type annotation guidelines for new code
- Add pre-commit hook for mypy checking (optional)

**5.4: Strict Mode Evaluation**
- Evaluate readiness for `disallow_untyped_defs = true`
- Plan migration to strict mode if appropriate
- Document any blockers for strict mode

**Acceptance Criteria**:
- Zero mypy errors in production code
- Comprehensive type annotation coverage (>95%)
- Documentation complete for future contributors
- Clear path to strict mode defined

## Performance Considerations

### Type Checking Performance

**MyPy Performance**:
- Current mypy run time: ~15-20 seconds on full codebase
- With exclusions: ~5-8 seconds (60% improvement)
- Incremental mode: ~1-2 seconds for changed files

**Optimization Strategies**:
1. Use exclusion patterns to skip non-production code
2. Enable mypy cache (enabled by default)
3. Run mypy on changed files only in development
4. Use parallel mypy checking in CI with `--no-incremental`

**CI/CD Integration**:
```yaml
# .github/workflows/type-check.yml
- name: Run MyPy
  run: |
    cd backend
    mypy . --no-incremental  # Disable cache for consistent CI results
```

### Runtime Performance Impact

**Type Annotations Have Zero Runtime Cost**:
- Type hints are not evaluated at runtime (unless using `typing.get_type_hints()`)
- No performance degradation from adding type annotations
- May slightly increase module import time (~1-5ms) but negligible

**Development Performance Benefits**:
- Better IDE autocomplete reduces coding time by 10-20%
- Catch bugs earlier reduces debugging time significantly
- Type-driven development improves code quality

## Testing Strategy

### Type Checking Tests

**Pre-Commit Hook (Optional)**:
```bash
#!/bin/bash
# .git/hooks/pre-commit
cd backend
mypy --quiet $(git diff --cached --name-only --diff-filter=ACM | grep '\.py$')
```

**CI/CD Type Checking**:
```yaml
type-check:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.13'
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements-dev.txt
    - name: Run MyPy
      run: |
        cd backend
        mypy . --no-incremental
```

### Validation Tests

**Manual Verification**:
1. Run `mypy .` in backend directory
2. Verify error count decreases after each phase
3. Check for new errors introduced by changes

**Automated Checks**:
- CI fails if mypy finds errors in production code
- Pre-commit hook warns on type errors (optional, non-blocking)

## Risks and Mitigation

### Technical Risks

**Risk 1: Breaking Changes from Type Annotations**
- **Severity**: Low
- **Probability**: Very Low
- **Impact**: Type annotations are runtime no-ops in Python
- **Mitigation**:
  - Type annotations have no runtime behavior
  - Existing tests validate behavior unchanged
  - Review changes carefully during code review

**Risk 2: Time Investment vs. Value**
- **Severity**: Medium
- **Probability**: Low
- **Impact**: Team spends time on type annotations vs. features
- **Mitigation**:
  - Focus on quick wins first for immediate value
  - Phase 2+ can be done incrementally alongside feature work
  - Type annotations reduce debugging time long-term (ROI positive)

**Risk 3: Third-Party Library Stub Gaps**
- **Severity**: Medium
- **Probability**: Medium
- **Impact**: Some libraries lack complete type stubs
- **Mitigation**:
  - Use `ignore_missing_imports` for libraries without stubs
  - Contribute type stubs to DefinitelyTyped when possible
  - Use `type: ignore[attr-defined]` selectively for known gaps
  - Document known stub gaps in this design doc

**Risk 4: Complex Generic Type Scenarios**
- **Severity**: Low
- **Probability**: Medium
- **Impact**: Some DRF patterns difficult to type correctly
- **Mitigation**:
  - Use `Any` strategically where generic types too complex
  - Reference djangorestframework-stubs documentation
  - Seek community examples for complex patterns
  - Document complex type patterns in this design doc

### Development Workflow Risks

**Risk 1: Developer Friction with Strict Type Checking**
- **Severity**: Medium
- **Probability**: Medium
- **Impact**: Developers frustrated by mypy errors
- **Mitigation**:
  - Keep `disallow_untyped_defs = false` during gradual adoption
  - Provide clear patterns and examples in this doc
  - Make mypy checking optional in local development
  - Only enforce in CI for production code

**Risk 2: Inconsistent Patterns Across Team**
- **Severity**: Low
- **Probability**: Medium
- **Impact**: Mixed type annotation styles
- **Mitigation**:
  - Document patterns clearly in this design doc
  - Code review for type annotation consistency
  - Provide example PRs for reference

## Conclusion

This type annotation implementation strategy provides a practical, phased approach to improving type safety in the Django backend codebase. The strategy balances immediate value (quick wins) with long-term code quality (systematic completion).

**Key Success Metrics**:
- Phase 1 (Quick Wins): ~70 errors resolved ✅
- Phase 2 (Serializers/Views): Target ~100 additional errors resolved
- Phase 3 (Services): Target ~50 additional errors resolved
- Phase 4 (Models/Utils): Target ~30 additional errors resolved
- Phase 5 (Final Review): Zero mypy errors in production code

**Implementation Philosophy**:
1. **Production Code First**: Focus type checking on code that runs in production
2. **Quick Wins Create Momentum**: Start with easy, high-impact fixes
3. **Patterns Over Perfection**: Establish clear patterns, apply systematically
4. **Gradual Adoption**: Don't block development, improve incrementally
5. **Documentation Matters**: This design doc guides future work

**Completed Work (Phase 1)**:
- ✅ MyPy configuration optimized for production code
- ✅ Type stub packages installed for major dependencies
- ✅ Import standardization complete (absolute imports, direct User imports)
- ✅ Quick wins implemented: `__str__` methods, implicit Optional, Celery tasks
- ✅ Unnecessary `type: ignore` comments removed

**Next Steps**:
- Begin Phase 2: Serializers and Views
- Create example PRs demonstrating patterns from this doc
- Review and update this doc based on learnings

This foundation positions the codebase for systematic type annotation completion while maintaining development velocity and code quality.

**Pattern Reference Quick Links**:
- [Pattern A: DRF Serializers](#pattern-a-django-rest-framework-serializers)
- [Pattern B: DRF Views/ViewSets](#pattern-b-django-rest-framework-views-and-viewsets)
- [Pattern C: Pydantic Validators](#pattern-c-pydantic-validators)
- [Pattern D: TypedDict](#pattern-d-typeddict-for-structured-dictionaries)
- [Pattern E: Service Layer](#pattern-e-service-layer-methods)
- [Pattern F: Decorators](#pattern-f-authentication-and-decorators)
