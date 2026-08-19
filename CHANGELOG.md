# 2.1.4
- **Local translation cache**: successful translations are now cached in this browser and reused when the same text is translated again with the same prompt, model and endpoint, so the same content is not billed twice. Entries are keyed by a SHA-256 of prompt + model + endpoint, so changing any of them (language, system, custom prompt, target model, custom endpoint) produces a fresh entry rather than a stale hit. Storage is client-scoped, capped at 300 entries with oldest-first eviction, and never reaches the world database or other players.
  - New **Cache Translations Locally** toggle (on by default) in module settings turns the cache off.
  - New **Clear Cache** button next to the toggle discards every cached translation stored in this browser and reports how many were removed.

# 2.1.3
- **Client-scoped API keys**: the translation and TTS API keys are now stored per browser (client scope) instead of as a world setting, so they are no longer delivered to connected players. Each GM enters their own key, and a browser without the key cannot translate. Existing world-scoped keys are migrated to the current client on first load.
- **Default prompt preserves Foundry reference syntax**: the built-in translation prompt now instructs the model to reproduce `@UUID`, `@Check`, `@Damage`, `@Template`, `&Reference` and inline rolls verbatim (only the visible label between curly braces may be translated), preventing broken links in translated descriptions.
- **Custom API endpoint hardening**:
  - Trailing slashes on the endpoint URL are stripped and normalization is centralized, so `https://host/v1/` and `https://host/v1` behave identically for both translation and model listing.
  - Empty or missing endpoint / API key now produce clear toasts (`"API endpoint is not configured…"`, `"API key is not configured…"`) instead of failing later with a confusing URL error.
  - `401` / `403` responses from the endpoint are reported as `"API key rejected by the endpoint"` rather than a generic HTTP error.
  - New **refresh** button next to the **Target Model** dropdown re-queries `<endpoint>/models` using the values currently typed in the settings form, so you can reload the list after changing the endpoint or key without restarting the world.

# 2.1.2
- **Minimum Role to Translate** setting: choose the lowest user role (Player / Trusted Player / Assistant GM / Game Master) that sees the Translate button. Defaults to Game Master so the world API key stays in GM hands. Note: this is a UI-visibility gate rendered client-side, not a hard authorization boundary.
- Fixed PF2E journal translations being lost on reload: the PF2E write path was calling `updateSource()` (in-memory only) for journal page paths, so translations were visible until the next reload and then dropped — with the API call already billed. Both items and journal pages now go through `update()`.

# 2.1.1
- **Inline Custom Prompt** setting: write your translation prompt directly in module settings as a resizable multi-line textarea (up to 10,000 characters). Takes precedence over the Prompt Template File; leave both empty to use the default prompt.
- **Output Mode** setting: choose how translations are persisted for items, spells and journal pages:
  - **Replace the original text** (default) — overwrites the description in place, as before.
  - **Create a translated copy** — leaves the original untouched and clones the document with the target language appended to its name (same folder for world documents, same journal entry for pages).
  - **Append / Prepend translation** — keeps both texts in the same description separated by a horizontal rule.
- Fixed a typo in the default translation prompt.

# 2.1.0
- **Experimental:** Text-to-Speech for Pathfinder 2e read-aloud passages
  - Adds two buttons next to every `<p class="read-aloud">` paragraph (PF2E only)
  - **Generate** button calls an OpenAI-compatible `/audio/speech` endpoint and saves the resulting MP3 to a local Foundry folder (default `translateAll/textToSpeech`)
  - **Play** button (disabled until audio exists) supports play / pause / resume on the saved file
  - Audio files are named by SHA-256 hash of `text + voice + model + instructions`, so identical passages reuse the same file across sessions and clients
  - On sheet open, a single `FilePicker.browse` pre-enables Play for paragraphs whose audio was generated previously
  - New world settings: enable toggle, endpoint, API key, model (`tts-1`, `tts-1-hd`, `gpt-4o-mini-tts`), voice (11 OpenAI voices), free-form `instructions` (used by steerable models), audio folder path
  - Endpoint and API key fall back to the translation settings when left empty
- Aligned `module.json` version with `package.json`

# 2.0.1
- Added loading spinner on the Translate Description button while translation and document update are in progress
- Improved TypeScript typing across all handlers — removed `any` and unsafe casts in favour of structural interfaces (`SheetLikeApp`, `SheetLikeDocument`)
- Introduced generic `getSetting<T>` to eliminate call-site casts for settings retrieval
- Added runtime type guards for the `renderApplicationV2` hook
- Fixed TS deprecation warning for `baseUrl` in `tsconfig.json`

# 2.0.0
- Foundry V14

# 1.2.1
- added support for custom file prompt

# 1.2.0
- added support for different API endpoints

# 1.1.1
- added support journal for 5e
- added dropdown selecting GPT model

# 1.1.0
- added support for 5E items
- added dropdown for system selection

# 1.0.7
- fixed problem with last foundry version 13.346

# 1.0.6
- Adding Github action to push release

# 1.0.5
- First working release
- Removed debug

# 1.0.1
- Kick off