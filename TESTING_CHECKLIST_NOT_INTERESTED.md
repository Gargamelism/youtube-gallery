# Not Interested Feature - Manual Testing Checklist

This document provides comprehensive manual testing steps for the "Not Interested" video flow feature.

## Automated Tests Status

✅ **Unit Tests**
- `NotInterestedButton.test.tsx` - 16 test cases covering all button states and interactions
- `useVideoFilters.test.ts` - 14 test cases covering filter state management
- `FilterButtons.test.tsx` - 15 test cases covering filter UI and interactions

✅ **Backend Tests**
- `test_not_interested.py` - 23 test cases covering endpoint, filtering, and performance

---

## Manual Testing Checklist

### 1. UI/UX Testing

#### Not Interested Button on Video Cards

- [ ] **Desktop hover behavior**
  - [ ] X button is hidden by default
  - [ ] X button appears on card hover
  - [ ] X button has smooth opacity transition
  - [ ] Hover effect works consistently across all cards

- [ ] **Mobile touch behavior**
  - [ ] X button always visible on mobile (no hover state)
  - [ ] Button has adequate touch target size (44x44px minimum)
  - [ ] No accidental triggers when scrolling

- [ ] **Button states**
  - [ ] X icon shows for unmarked videos (dismiss action)
  - [ ] Plus icon shows when viewing not interested videos (restore action)
  - [ ] Button stays visible after marking as not interested
  - [ ] Red theme (bg-red-100) for dismissed videos
  - [ ] Green theme (bg-green-100) for restore action

- [ ] **Visual feedback**
  - [ ] Card dims (opacity-50) when marked not interested
  - [ ] Card opacity normal when viewing not interested filter
  - [ ] Smooth transitions for all state changes
  - [ ] No layout shifts when button appears

#### Filter Buttons

- [ ] **Three filter options render correctly**
  - [ ] "Hide dismissed" (EXCLUDE) - default selected
  - [ ] "Not Interested" (ONLY) - shows count badge
  - [ ] "Include dismissed" (INCLUDE)

- [ ] **Count display**
  - [ ] Not interested count shows on ONLY filter
  - [ ] Count updates after marking video as not interested
  - [ ] Count badge has proper styling
  - [ ] Zero count doesn't show badge

- [ ] **Filter separation**
  - [ ] Not interested filters in separate row
  - [ ] Border-top visual separator
  - [ ] Proper spacing (pt-4)

- [ ] **Active state styling**
  - [ ] Red background (bg-red-100) for active state
  - [ ] Blue background for watch status filters
  - [ ] Clear visual distinction between active/inactive

---

### 2. Functional Testing

#### Basic Operations

- [ ] **Mark video as not interested**
  - [ ] Click X button on unwatched video
  - [ ] Video immediately dims
  - [ ] Video disappears from list (default EXCLUDE filter)
  - [ ] Stats count increments

- [ ] **Unmark video as not interested**
  - [ ] Switch to "Not Interested" filter (ONLY)
  - [ ] Click Plus button on dismissed video
  - [ ] Video returns to normal state
  - [ ] Video reappears in default view
  - [ ] Stats count decrements

- [ ] **Filter switching**
  - [ ] EXCLUDE: Hides dismissed videos (default)
  - [ ] ONLY: Shows only dismissed videos
  - [ ] INCLUDE: Shows all videos regardless of status

#### Filter Combinations

- [ ] **Watch status + Not interested filters**
  - [ ] Unwatched + EXCLUDE: Shows unwatched, non-dismissed videos
  - [ ] Unwatched + ONLY: Shows unwatched videos that are dismissed
  - [ ] Watched + EXCLUDE: Shows watched, non-dismissed videos
  - [ ] All + EXCLUDE: Shows all non-dismissed videos
  - [ ] All + ONLY: Shows only dismissed videos

- [ ] **Tag filters + Not interested**
  - [ ] Tag filtering works with EXCLUDE mode
  - [ ] Tag filtering works with ONLY mode
  - [ ] Tag filtering works with INCLUDE mode

- [ ] **Search + Not interested**
  - [ ] Search works correctly with all not interested modes
  - [ ] Results respect both search and not interested filters

---

### 3. Keyboard Accessibility Testing

#### Navigation

- [ ] **Tab navigation**
  - [ ] Tab key moves focus through all interactive elements
  - [ ] Focus order is logical (top to bottom, left to right)
  - [ ] Focus visible on X/Plus button
  - [ ] Focus visible on filter buttons

- [ ] **X/Plus button**
  - [ ] Tab to focus button
  - [ ] Enter key triggers click
  - [ ] Space key triggers click
  - [ ] Focus ring visible (red for X, green for Plus)
  - [ ] Focus persists through state changes

- [ ] **Filter buttons**
  - [ ] Tab through watch status filters
  - [ ] Tab through not interested filters
  - [ ] Enter/Space activates filter
  - [ ] aria-selected state updates correctly

#### Screen Reader Support

- [ ] **X/Plus button**
  - [ ] aria-label: "Not interested in this video"
  - [ ] aria-label: "Mark as interested again" (restore mode)
  - [ ] title attribute provides tooltip
  - [ ] State changes announced

- [ ] **Filter buttons**
  - [ ] Filter name announced
  - [ ] Count announced (when present)
  - [ ] Selected state announced (aria-selected)

---

### 4. Mobile Responsiveness Testing

#### Test on actual devices or use browser dev tools with these viewport sizes:
- iPhone SE (375px)
- iPhone 12 Pro (390px)
- Pixel 5 (393px)
- iPad Mini (768px)
- iPad Pro (1024px)

#### Layout Tests

- [ ] **Video cards**
  - [ ] X/Plus button always visible (no hover)
  - [ ] Button positioned correctly in top-right
  - [ ] Button doesn't overlap video title
  - [ ] Adequate spacing from edges

- [ ] **Filter buttons**
  - [ ] Watch status filters wrap properly on small screens
  - [ ] Not interested filters wrap properly
  - [ ] Buttons stack vertically on very small screens
  - [ ] Touch targets meet 44x44px minimum
  - [ ] No horizontal scroll

#### Touch Interactions

- [ ] **X/Plus button**
  - [ ] Single tap marks/unmarks
  - [ ] No accidental triggers
  - [ ] Visual feedback on tap (active state)
  - [ ] Works while scrolling list

- [ ] **Filter buttons**
  - [ ] Single tap switches filter
  - [ ] Active state visible
  - [ ] No delay in response

---

### 5. Performance Testing

#### Large Datasets

- [ ] **With 100+ videos**
  - [ ] Video list loads quickly (< 2 seconds)
  - [ ] Filtering is instant (no lag)
  - [ ] Marking as not interested is instant
  - [ ] Smooth scrolling maintained

- [ ] **With 1000+ videos (infinite scroll)**
  - [ ] Pagination works correctly
  - [ ] Not interested filter applies to all pages
  - [ ] No memory leaks during long sessions
  - [ ] Scroll position maintained after mutations

#### Network Conditions

Test with Chrome DevTools Network throttling:

- [ ] **Slow 3G**
  - [ ] Loading states show properly
  - [ ] Mutations queue correctly
  - [ ] No race conditions
  - [ ] Proper error handling

- [ ] **Offline**
  - [ ] Error message displays
  - [ ] Mutations fail gracefully
  - [ ] Can retry when back online

---

### 6. State Management & Persistence

#### URL State

- [ ] **Filter in URL**
  - [ ] `not_interested_filter=exclude` (default)
  - [ ] `not_interested_filter=only`
  - [ ] `not_interested_filter=include`

- [ ] **Persistence**
  - [ ] Filter persists on page refresh
  - [ ] Filter persists in browser back/forward
  - [ ] Sharing URL shares exact filter state

#### React Query Cache

- [ ] **Mutation success**
  - [ ] Videos query invalidated
  - [ ] Stats query invalidated
  - [ ] List updates immediately
  - [ ] Count updates immediately

- [ ] **Multiple tabs**
  - [ ] Changes in one tab don't affect another tab's cache
  - [ ] Manual refresh updates both tabs

---

### 7. Error Handling

#### API Errors

- [ ] **500 Server Error**
  - [ ] Error message displayed to user
  - [ ] Video state doesn't change
  - [ ] Can retry operation

- [ ] **404 Video Not Found**
  - [ ] Appropriate error message
  - [ ] Video removed from list

- [ ] **401 Unauthorized**
  - [ ] Redirects to login
  - [ ] State preserved after re-auth

#### Edge Cases

- [ ] **Rapid clicking**
  - [ ] Doesn't create duplicate requests
  - [ ] State updates correctly
  - [ ] No race conditions

- [ ] **Network timeout**
  - [ ] Shows loading state
  - [ ] Eventually shows error
  - [ ] Allows retry

---

### 8. Cross-Browser Testing

Test on:

- [ ] **Chrome** (latest)
  - [ ] All features work
  - [ ] Styles render correctly
  - [ ] Animations smooth

- [ ] **Firefox** (latest)
  - [ ] All features work
  - [ ] Styles render correctly
  - [ ] Focus rings visible

- [ ] **Safari** (latest)
  - [ ] All features work
  - [ ] Styles render correctly
  - [ ] iOS Safari tested

- [ ] **Edge** (latest)
  - [ ] All features work
  - [ ] Styles render correctly

---

### 9. Regression Testing

Ensure existing features still work:

- [ ] **Watch/Unwatch videos**
  - [ ] Toggle watch status
  - [ ] Watched filter still works
  - [ ] Watch count updates

- [ ] **Tag filtering**
  - [ ] Tag selection works
  - [ ] Tag mode (ANY/ALL) works
  - [ ] Tag combinations work

- [ ] **Search**
  - [ ] Search results accurate
  - [ ] Search with filters works

- [ ] **Pagination/Infinite scroll**
  - [ ] Load more works
  - [ ] Scroll position restored
  - [ ] Auto-scroll mode works

---

## Test Completion Checklist

### Before Release

- [ ] All automated tests passing (`npm run test`)
- [ ] All manual test sections completed
- [ ] No console errors or warnings
- [ ] No accessibility violations (axe DevTools)
- [ ] Performance metrics acceptable (Lighthouse)
- [ ] Backend tests passing (`python manage.py test`)

### Post-Release Monitoring

- [ ] Monitor error logs for not-interested endpoint
- [ ] Track feature usage (% of users using not interested)
- [ ] Gather user feedback
- [ ] Monitor performance metrics

---

## Known Limitations

Document any known issues or limitations:

1. **Hover on mobile**: No hover state on mobile devices (by design)
2. **Bulk operations**: No multi-select for bulk not interested actions (future enhancement)
3. **Undo**: No undo notification/toast (can manually restore)

---

## Bug Reporting Template

If issues are found during testing:

```
**Environment:**
- Browser:
- OS:
- Screen size:

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**


**Actual Result:**


**Screenshots:**


**Console Errors:**

```
