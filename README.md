# Dreamstragm

English, mobile-first dream journal prototype. Runs with native HTML, CSS and JavaScript; no framework or runtime dependency installation.

## Local preview

Run `python3 scripts/preview.py` in this directory and open http://localhost:5174/ . The preview serves a fixed frontend file list on this computer only. It does not expose environment files or Git metadata. There is no production deployment.

## What works now

Dreams are saved in IndexedDB on this browser and address. Refreshing and reopening keeps saved originals, confirmed text, tags, text history, image files and reflection cards. Each dream has one stable ID; attachments keep their dream and source text version. Editing the current entry preserves the first original. Saving another image or card keeps the earlier ones.

Local Circle posts and comments also persist as independent snapshots. They are not sent to a server or other people. Tags-only posts do not include private dream text. Deleting a private dream does not remove its separately shared snapshot.

Voice recording/transcription, tidy-up, interpretation, illustration generation and relationship analysis remain demonstrations. White noise is real browser-synthesised audio. Weather is manually chosen. There is no OpenAI connection, account authentication, backend, cloud sync or real community in this branch.

## Data management

Settings → Data & reset provides a full JSON backup, restore and confirmed deletion. Backups include private writing and attachment files; keep them private. Restore replaces this browser’s archive only after confirmation and validation (maximum 30 MB). Deleting all data stays empty after refresh; examples are seeded once only.

Markdown exports remain available for Obsidian or manual import elsewhere. Use the JSON backup for complete text history and images. Data is bound to the browser profile and origin: different ports or domains do not share an archive. Clearing browser data, closing an incognito session or device loss may remove it. Unsaved drafts and chat messages are not automatically persisted; edited records warn before leaving.

## UI

The local English Figma handoff supplies the Gaegu typography, SVG icons, door and stairs, hand-drawn voice action and Journal / Explore / Circle navigation. The pixel assistant and voice bubble are retained. Fonts are bundled locally with their SIL Open Font License. The original app’s functionality is preserved; no Claude backend was imported.

## Verification

- `node --test tests/storage.test.cjs tests/ambient.test.cjs`
- `tests/storage-browser.cjs`: actual IndexedDB persistence, refresh/reopen, immutable original, versioned attachments, local snapshots, backups, quota errors and protected startup errors.
- `tests/ui-smoke.cjs`: existing main flows and navigation.
- `tests/handoff-layout.cjs`: homepage fonts, SVGs, geometry and history scrolling.

Browser scripts require Playwright and Chromium in the test environment. `PLAYWRIGHT_MODULE` and `CHROME_PATH` can point to existing installations; these are not App runtime dependencies. Start the preview server first. Tests use fictional records in isolated browser contexts.

Implementation and limits: [Local storage](docs/LOCAL_STORAGE.md). Design measurements: [English handoff](docs/design/home-en-handoff.json).
