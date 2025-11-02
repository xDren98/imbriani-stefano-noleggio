# Backend Apps Script - Patch Log

## v2025-11-02-a
- Add `Clienti` directory support: `getClienteByCF`, `upsertClienti`.
- `creaPrenotazione`: call `upsertClienti` after append.
- ID policy unchanged (numeric). Optional: switch to `BOOK-YYYY-NNN` in next patch.

## How to apply
- Open Apps Script project.
- Paste code blocks from SETUP.md into your file at indicated markers (doGet switch and handleCreaPrenotazione tail).
- Deploy as web app (same URL), no scope changes required.
