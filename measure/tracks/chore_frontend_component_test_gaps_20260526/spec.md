# Spec: Frontend Component Test Coverage Gaps

## Overview

Knowledge graph analysis (2026-05-26) found 30+ frontend components without tests. This track targets the 15 highest-impact ones grouped by domain: movie management modals, table primitives, search result cells, and global providers.

## Problem Statement

Untested components are a refactoring risk. Changing shadcn/ui versions, React APIs, or Tailwind classes can silently break these components without CI catching it.

### Target components (priority groups)

**Group A: Movie management modals** (user-facing, high interaction density)
| Component | File | Why |
|-----------|------|-----|
| `EditMovieModal` | `app/src/components/movie/EditMovieModal.tsx` | Edit movie metadata — form validation, save flow |
| `ManualMatchDialog` | `app/src/components/movie/ManualMatchDialog.tsx` | Manual match UI — search, select, confirm |
| `MovieBulkEditModal` | `app/src/components/movie/MovieBulkEditModal.tsx` | Bulk edit — multiple selection, partial updates |
| `OrganizePreviewModal` | `app/src/components/movie/OrganizePreviewModal.tsx` | Preview file moves — file list, confirm/cancel |

**Group B: Table primitives** (shared infrastructure)
| Component | File | Why |
|-----------|------|-----|
| `DataTable` | `app/src/components/primitives/DataTable.tsx` | Core data table — sorting, pagination, selection |
| `TablePager` | `app/src/components/primitives/TablePager.tsx` | Pagination controls |
| `TableOptionsModal` | `app/src/components/primitives/TableOptionsModal.tsx` | Column visibility, density toggle |

**Group C: Search result cells** (used in interactive search)
| Component | File | Why |
|-----------|------|-----|
| `AgeCell` | `app/src/components/search/AgeCell.tsx` | Age display cell |
| `PeersCell` | `app/src/components/search/PeersCell.tsx` | Seeder/leecher display |
| `QualityBadge` | `app/src/components/search/QualityBadge.tsx` | Quality badge |
| `ReleaseTitle` | `app/src/components/search/ReleaseTitle.tsx` | Release title with truncation |

**Group D: Providers & misc**
| Component | File | Why |
|-----------|------|-----|
| `ToastProvider` | `app/src/components/providers/ToastProvider.tsx` | Toast notification system |
| `AppProviders` | `app/src/components/providers/AppProviders.tsx` | Root provider wrapper |
| `FilterDropdown` | `app/src/components/filters/FilterDropdown.tsx` | Filter dropdown |
| `MetricCard` | `app/src/components/primitives/MetricCard.tsx` | Dashboard metric card |

## Stories

### S1: Movie management modal tests
As a **developer**, I want movie management modals to have component tests so that form validation, save flows, and user interactions are verified.

**Acceptance Criteria:**
```gherkin
Given EditMovieModal with an existing movie
When the user modifies the title and clicks Save
Then onUpdate is called with the changed fields

Given MovieBulkEditModal with 3 selected movies
When the user changes quality profile and clicks Apply
Then bulkUpdate is called for all 3 movies

Given OrganizePreviewModal with 5 files to move
When the user clicks Confirm
Then the organize apply endpoint is called

Given ManualMatchDialog with search results
When the user selects a match and confirms
Then the match is applied to the unmatched item
```

**Estimate:** M
**Priority:** Must

### S2: Table primitive tests
As a **developer**, I want table primitives to have component tests so that sorting, pagination, and column visibility are verified.

**Acceptance Criteria:**
```gherkin
Given DataTable with 25 rows and pageSize 10
When it renders
Then it shows page 1 with 10 rows and pagination controls

Given TablePager on page 2 of 3
When the user clicks "Next"
Then onPageChange is called with 3

Given TableOptionsModal with 5 columns
When the user unchecks column 3
Then onColumnToggle is called with column 3's id
```

**Estimate:** M
**Priority:** Should

### S3: Search cell component tests
As a **developer**, I want search result cell components to have tests so that data rendering and edge cases are verified.

**Acceptance Criteria:**
```gherkin
Given AgeCell with ageHours = 2
When it renders
Then it shows "2 hours" (full word, pluralised: "1 hour" / "2 hours")

Given AgeCell with ageHours < 1
When it renders
Then it shows "X minutes" rounded to the nearest minute (e.g. "30 minutes")

Given PeersCell with seeders = 10, leechers = 2
When it renders
Then it shows two icons — a green up-arrow next to "10" (Seeders) and a red down-arrow next to "2" (Leechers)

Given PeersCell with both seeders and leechers undefined or null
When it renders
Then it shows a "-" placeholder

Given QualityBadge with qualityName "1080p"
When it renders
Then it shows a badge with "1080p" in a high-tier (green) colour class for resolution >= 1080

Given ReleaseTitle with a 200-character title
When it renders
Then the title is truncated with a "Show more" button (no native ellipsis; uses line-clamp + show-more)
```

**Estimate:** S
**Priority:** Should

### S4: Provider component tests
As a **developer**, I want provider components to have tests so that context provisioning and toast display are verified.

**Acceptance Criteria:**
```gherkin
Given ToastProvider wrapping a child
When a toast is triggered via the context
Then the toast renders with correct message and variant

Given AppProviders wrapping children
When it renders
Then all required contexts are provided (QueryClient, Router, Theme, Toast)
```

**Estimate:** S
**Priority:** Could

### S5: Miscellaneous component tests
As a **developer**, I want FilterDropdown and MetricCard to have tests so that filter selection and metric display are verified.

**Acceptance Criteria:**
```gherkin
Given FilterDropdown with 3 options
When the user selects option 2
Then onChange is called with option 2's value

Given MetricCard with value 42 and label "Movies"
When it renders
Then it shows "42" and "Movies"
```

**Estimate:** S
**Priority:** Could

## Out of Scope
- Testing components that already have tests (ActivityQueuePage, DashboardPage, etc.)
- E2E browser testing
- Visual regression testing
