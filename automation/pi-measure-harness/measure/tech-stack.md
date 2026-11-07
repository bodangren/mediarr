# Tech Stack

- TypeScript ESM Pi extension loaded by `@earendil-works/pi-coding-agent`.
- Node.js 22+ runtime.
- YAML frontmatter parsing for packaged agent definitions.
- JSON/JSONL durable task receipts and child-process event logs.
- Node's built-in test runner and TypeScript type checking.
- Git revision evidence for repository-bound execution.

## Design Constraints

- The package must remain usable across arbitrary project repositories.
- Framework policy must not depend on a product's domain, language, or commands.
- Project-local resources are loaded only through Pi's trust model.
- A harness version must pin its agents, skills, schemas, and extension behavior.
