# Pipeline Metrics

> Definitions: see retrospective skill Phase 2, item 5.
>
> - **TDD bugs caught:** Count of bugs where a test revealed the issue BEFORE the implementation was committed.
> - **Review unique issues:** Count of issues found by `/code-review-and-fix` that were NOT already caught by tests.
> - **Deprecation flags:** Stage names where the "Value" column was rated "ceremonial." Only flag stages rated ceremonial in 3+ retrospectives.

| Date       | Feature                  | TDD bugs caught | Review unique issues                                              | Deprecation flags |
| ---------- | ------------------------ | --------------- | ----------------------------------------------------------------- | ----------------- |
| 2026-03-19 | profile-polaroid         | 0               | 15 (1 Critical, 7 Important, 5 Minor + 2 re-verify)               | none              |
| 2026-03-23 | favorites-ui-reconstruct | 0               | 26 (4 Critical, 14 Important, 8 Minor; 2 false positives skipped) | none              |
