# Dreamstragm

English, mobile-first dream journal prototype. Uses native HTML, CSS and JavaScript with IndexedDB. A small Node server calls the OpenAI Responses API for tidy-up and the Images API for illustrations; there is no frontend framework.

## Local preview

Use Node 24+: run `pnpm install --frozen-lockfile`, then `pnpm start` and open http://localhost:5174/ . Stop the old Python preview first. The Node service serves an explicit frontend whitelist and the tidy-up, illustration and dream chat endpoints on this computer only. Environment files, server code and Git metadata are not served. No production deployment has been made.

## What works now

Dreams are saved in IndexedDB on this browser and address. Refreshing and reopening keeps saved originals, confirmed text, tags, text history, image files and reflection cards. Each dream has one stable ID; attachments keep their dream and source text version. Editing the current entry preserves the first original. Saving another image or card keeps the earlier ones.

Local Circle posts and comments also persist as independent snapshots. They are not sent to a server or other people. Tags-only posts do not include private dream text. Deleting a private dream does not remove its separately shared snapshot.

Tidy-up now calls a real server endpoint that uses the official OpenAI SDK. Without server credentials it reports a configuration error, with no demo fallback. Voice recording/transcription, reflection cards and relationship analysis remain demonstrations. White noise is real browser-synthesised audio. Weather is manually chosen. There is no account authentication, cloud archive or real community. Live gpt-6-luna verification passed on November 7, 2026: two fictional English/Chinese requests and one complete browser tidy-up/save/reload flow. Broader quality evaluation and physical-phone testing remain pending.

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

## Interface language

Settings → Interface language switches between English and 简体中文 immediately. English remains the default; the choice is remembered locally per browser/origin. If saving the preference is blocked, switching still works for the current tab with a notice. English retains the bundled Gaegu font; Chinese uses system Chinese fonts, whose appearance varies by device.

Only explicit interface copy, accessible labels, prompts, known errors, date displays and Markdown headings are localized. User writing, stored sample entries, tag names, saved cards, posts, chat messages, IDs and backup contents stay unchanged. Language preferences are separate from the IndexedDB archive and are not included in its backup or cleared with dream data. AI output language and automatic translation are not part of this iteration.

New UI copy should use `I18n.t` / `L` and a corresponding Chinese entry in `i18n.js`; never pass arbitrary user text through the dictionary. New business values must remain stable, with a separately translated display label.

Tests: `node --test tests/i18n.test.cjs`; `tests/language-browser.cjs` checks switching/reload, unchanged database snapshot, preserved user markup/text and chat, Chinese errors and preference-write failure.

## AI tidy-up

Before a request, input is saved locally as an unfinished draft tied to the same dream ID. Review and edit the proposed text, explicitly choose tags, then confirm a new text version. The original is never overwritten. An unfinished input can be resumed from dream details after a failure or refresh. Unconfirmed model output is not automatically persisted.

Set `OPENAI_API_KEY` and `OPENAI_MODEL` only in the server environment or a Git-ignored `.env`, following the placeholder `.env.example`. Current candidate: `gpt-6-luna`, Standard service tier with reasoning effort set to none. See [configuration, costs, limitations and verification](docs/AI_TIDY.md). The server is local-only; deploying a paid API endpoint requires a separately reviewed hosting/access plan.

`pnpm test` does not call OpenAI. Browser tests use explicit test fixtures for successful AI output. Running `pnpm test:live` makes two real tidy-up requests with fictional notes.


## AI illustrations

From a saved dream, open **Explore this dream → Illustrate your dream**. The scene starts with the original dream text. Edit it, choose a style, then create one image. The selected description and style are sent to OpenAI when you generate. Save the result to attach the JPEG with its original-text version reference to the dream in IndexedDB. The result page offers JPEG download, system sharing where file sharing is supported, and a separate local Circle post preview.

The server uses `OPENAI_API_KEY` and defaults to `gpt-image-2.5-flare`. Set `OPENAI_IMAGE_MODEL` in the server environment to override it. Image requests use square medium-quality JPEGs. The local endpoint allows one generation at a time and six attempts in ten minutes. The [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation) describes project access requirements.

## Dream conversations

Open a dream, select **Explore this dream → Explore your dream → Freud, Jung or Folklore**, and send a message. The app sends the selected original dream and current conversation to OpenAI using the existing server-side key and text model. For originals above 8,000 characters, paste the excerpt you want to discuss. Each message supports up to 1,500 characters. A conversation supports 12 replies and can be reset with **Start again**.

Chat lives in the open page, and reopening a guide or refreshing starts a new session. The fixed server prompt guides exploratory reflection and accepts the user's corrections. The sample reflection card remains a separate demo.
