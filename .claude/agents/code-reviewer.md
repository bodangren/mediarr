# Code Reviewer Agent

Review code changes for quality, consistency, and potential regressions in the mediarr monorepo.

## Review Checklist

### Architecture
- Changes respect monolith architecture (no microservice patterns or domain sync logic)
- Frontend code stays in `app/src/`, server code stays in `server/src/`
- Shared API utilities in `server/src/api/utils/` are used where appropriate
- No Next.js patterns — this is a Vite React SPA

### Code Quality
- TypeScript types are used correctly (no unnecessary `any`)
- Zod schemas validate external inputs at system boundaries
- Error handling follows existing patterns (Fastify error responses, React error boundaries)
- No duplicate logic — check for existing utilities before adding new ones

### Testing
- New functionality has corresponding tests
- Tests use Vitest conventions (`describe`/`it`/`expect`)
- Frontend tests use Testing Library + MSW for API mocking
- Tests run with `CI=true` to avoid watch mode

### Security
- No hardcoded secrets or credentials
- User input is validated before use
- File paths use `safePath` utility from `server/src/api/utils/`
- SQL injection prevented by Prisma parameterized queries

### Known Issues (do not flag these)
- ~334 pre-existing test failures in the full suite
- TSC build errors in CollectionDetailPage, CollectionsPage, DashboardPage
- `mediaRoutes.wanted.test.ts` has 3 pre-existing failures
