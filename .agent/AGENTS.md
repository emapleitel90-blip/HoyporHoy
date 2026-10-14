# Agent Guidelines & Model Routing

## Execution Rules
- **Minimal Changes:** Make localized, minimal changes. Reuse existing components and dependencies.
- **Tenant Isolation & Security:** Preserve all tenant isolation (`studioId`) and security policies across queries and mutations.
- **Token Economy:** Read only task-relevant files. Run targeted validation commands. Keep summaries concise.
- **Source Code Safety:** Do not perform unrelated refactoring. Preserve all existing functionality.

## Model Selection & Routing
- **Flash (Default):** Manager view / orchestration, standard development, frontend UI, standard backend endpoints, and routine testing (e.g. Gemini Flash).
- **Advanced (Critical Logic):** Authentication, tenant isolation, and database schema migrations (e.g. Claude Sonnet / Gemini Pro).
- **Deep Think (Escalation Only):** Major architectural decisions and complex analysis (e.g. Claude Opus).
