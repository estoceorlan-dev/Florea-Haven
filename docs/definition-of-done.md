# Feature Definition of Done

This checklist applies to every Floréa Haven feature. A phase is complete only when every applicable item is satisfied; an item may be marked not applicable only with a reason in the implementation plan or review notes.

## Scope and contract

- Acceptance criteria describe the user-visible result and important failure cases.
- The work stays within the accepted MVP decision record or records an approved scope change.
- API requests, responses, validation, authorization, and error behavior match the API contract.
- No unresolved decision remains for a dependent phase.

## Data and backend

- Durable schema changes use an ordered migration and work against a fresh PostgreSQL database.
- Database constraints protect durable invariants; API validation provides useful client errors.
- SQL is parameterized, ownership comes from the authenticated session, and role checks run on the server.
- Multi-record operations that must succeed together use a transaction and have rollback coverage.
- The API does not trust client-supplied prices, totals, roles, stock, or ownership IDs.
- Relevant API integration and business-rule tests pass.

## Frontend

- Loading, empty, success, validation, conflict, unauthorized, forbidden, not-found, and server-error states are handled where applicable.
- Forms retain useful input after recoverable errors and prevent accidental duplicate submission.
- The feature is keyboard-operable, has visible focus, uses semantic labels/headings, and provides meaningful image alternatives.
- The feature works at mobile, tablet, and desktop widths without hiding required actions or information.
- Relevant component and workflow tests pass.

## Quality, security, and operations

- `npm run lint`, `npm test`, `npm run build`, and `npm run format:check` pass.
- A manual happy-path check and the most important failure-path check pass using the complete UI/API flow.
- Persistent features receive a PostgreSQL smoke test, not only an in-memory test.
- No credentials, JWTs, password hashes, personal delivery data, stack traces, or internal database errors are logged or committed.
- Environment variables, migrations, seed behavior, setup instructions, and operational notes are updated when affected.
- The default branch remains deployable and another developer can verify the feature from documented steps.

## Phase gate

Before a phase is marked complete:

1. Its task checklist and exit criteria are reviewed against the working application.
2. Automated checks pass from the repository root.
3. Required manual and persistent-database checks are recorded in the progress tracker.
4. Known follow-up work is explicitly deferred to a later phase rather than silently omitted.
