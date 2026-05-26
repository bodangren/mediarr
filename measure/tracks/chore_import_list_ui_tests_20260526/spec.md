# Spec: Import List UI Test Coverage

## Overview

The Import List feature allows users to automatically add media from external sources (TMDB Popular, TMDB Lists). The feature has 5 React components in `app/src/components/importlists/` with zero test files. This is the largest untested frontend feature area.

## Problem Statement

Knowledge graph analysis (2026-05-26) found these 5 component files with no corresponding `.test.tsx`:

| Component | Role | State? | API Calls? |
|-----------|------|--------|------------|
| `ExclusionManager` | Table of exclusion entries with remove buttons | No (presentational) | No |
| `ImportListList` | Card list of import lists with sync/edit/delete | No (presentational) | No |
| `ImportListModal` | Create/edit form modal with provider-specific fields | Yes (9 state vars) | No (delegates to parent) |
| `AddExclusionModal` | Search-and-select modal for adding exclusions | Yes (5 state vars) | Yes (`discoverApi.searchMovies`) |
| `ImportListSettings` | Orchestrator with tabs, modals, confirmations | Yes (9 state vars) | No (delegates to callbacks) |

## Component Hierarchy

```
ImportListSettings (orchestrator)
  ├── [Tab: "Import Lists"]
  │     └── ImportListList (presentational list)
  ├── [Tab: "Exclusions"]
  │     └── ExclusionManager (presentational table)
  ├── ImportListModal (create/edit form modal)
  ├── AddExclusionModal (search & select exclusion modal)
  └── ConfirmModal (x2, delete confirmations)
```

## Stories

### S1: ExclusionManager tests
As a **developer**, I want `ExclusionManager` to have component tests so that the exclusion table rendering and user interactions are verified.

**Acceptance Criteria:**
```gherkin
Given exclusions prop has 3 items
When ExclusionManager renders
Then it displays a table with 3 rows showing Title, TMDB ID columns

Given exclusions prop is empty
When ExclusionManager renders
Then it shows an empty-state Alert message

Given error prop is set
When ExclusionManager renders
Then it shows an error Alert

Given isLoading is true
When ExclusionManager renders
Then it shows a loading indicator

Given an exclusion row is displayed
When the user clicks the "Remove" button on row 2
Then onRemoveExclusion is called with the exclusion object from row 2

Given the component is rendered
When the user clicks "Add Exclusion" button
Then onAddExclusion is called
```

**Estimate:** S
**Priority:** Must

### S2: ImportListList tests
As a **developer**, I want `ImportListList` to have component tests so that the import list card rendering and user interactions are verified.

**Acceptance Criteria:**
```gherkin
Given lists prop has 2 items
When ImportListList renders
Then it displays 2 cards with name, provider type, quality profile, and last sync time

Given lists prop is empty
When ImportListList renders
Then it shows an empty-state Alert

Given error prop is set
When ImportListList renders
Then it shows an error Alert

Given a list card is displayed
When the user clicks "Sync"
Then onSync is called with that list object

Given a list card is displayed
When the user clicks "Edit"
Then onEdit is called with that list object

Given a list card is displayed
When the user clicks "Delete"
Then onDelete is called with that list object

Given a list with lastSyncAt = null
When ImportListList renders
Then it shows "Never" for last sync time
```

**Estimate:** S
**Priority:** Must

### S3: ImportListModal tests
As a **developer**, I want `ImportListModal` to have component tests so that the create/edit form and provider-specific fields are verified.

**Acceptance Criteria:**
```gherkin
Given isOpen is true and editList is null
When ImportListModal renders
Then it shows empty form fields and "Add Import List" button text

Given isOpen is true and editList has providerType "tmdb-popular"
When ImportListModal renders
Then it pre-fills name, provider, root folder, quality profile, and TMDB Popular fields

Given the user selects provider type "tmdb-list"
When the form re-renders
Then TMDB List ID field appears and TMDB Popular fields disappear

Given the user has filled in all required fields
When they click "Save Changes"
Then onSave is called with a CreateImportListInput matching the form values

Given required fields (name, rootFolderPath, qualityProfileId) are empty
When the user clicks "Save"
Then a validation Alert appears and onSave is not called

Given isOpen is false
When ImportListModal renders
Then the modal is not visible
```

**Estimate:** M
**Priority:** Must

### S4: AddExclusionModal tests
As a **developer**, I want `AddExclusionModal` to have component tests so that the search, selection, and add-to-exclusion flow is verified.

**Acceptance Criteria:**
```gherkin
Given isOpen is true
When AddExclusionModal renders
Then it shows a search input and search button

Given the user types a movie title and clicks Search
When the discoverApi.searchMovies call succeeds
Then search results are displayed in a list

Given search results are displayed
When the user clicks a result
Then it becomes selected (highlighted) and "Add Exclusion" button enables

Given a selected result that matches an existing exclusion's tmdbId
When the user views the result
Then it shows "Already excluded" and the Add button is disabled

Given the user clicks "Add Exclusion" with a selected result
When the onAdd callback fires
Then onAdd is called with { tmdbId, title } from the selected result

Given the API search fails
When the user searches
Then an error Alert is shown

Given existingExclusions has tmdbId 123
When search results include tmdbId 123
Then that result row is disabled with "Already excluded" label
```

**Estimate:** M
**Priority:** Must

### S5: ImportListSettings integration tests
As a **developer**, I want `ImportListSettings` to have integration tests so that the tab switching, modal orchestration, and delete confirmation flows are verified.

**Acceptance Criteria:**
```gherkin
Given ImportListSettings renders with lists and exclusions props
When the user clicks the "Exclusions" tab
Then ExclusionManager is rendered with the exclusions data

Given the "Import Lists" tab is active
When the user clicks "Add Import List"
Then ImportListModal opens with editList = null

Given a list card is displayed
When the user clicks "Edit"
Then ImportListModal opens with editList set to that list

Given ImportListModal's onSave fires with form data
When handleSaveList executes
Then onCreateList or onUpdateList is called (depending on edit state)
And the modal closes
And onRefreshLists is called

Given a list card is displayed
When the user clicks "Delete" and confirms
Then onDeleteList is called with the list id
And onRefreshLists is called

Given an exclusion row is displayed
When the user clicks "Remove" and confirms
Then onDeleteExclusion is called with the exclusion id
And onRefreshExclusions is called

Given the user clicks "Sync" on a list
When the sync callback fires
Then onSyncList is called with the list id
And syncingId is set during the call and cleared after
```

**Estimate:** M
**Priority:** Must

## Out of Scope
- Testing the API client layer (`importListsApi.ts`) — it's tested via route-level integration
- Testing `ConfirmModal` itself — it's a shared primitive with existing tests
- E2E browser testing of the import list flow
