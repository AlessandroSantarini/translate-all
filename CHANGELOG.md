# 2.1.8
- **Translate button is now an icon control**: the full-width "TRANSLATE DESCRIPTION" text button is replaced by a compact `fa-language` icon in the sheet header, matching the look of Foundry's own header controls. The label and tooltip are localized (they used to be a hardcoded English string), and the loading state is now a spinning icon instead of a "Translating…" text swap.

# 2.1.7
- **Target Model is now a free text field with suggestions**: the dropdown is replaced by a text input backed by a `<datalist>` fed from `<endpoint>/models`. Backends that do not expose `/models` (or have it disabled) no longer produce a dead end — type the model name and it is saved. The refresh button next to the field reloads the suggestion list and leaves whatever is typed alone, so a model your endpoint does not list is no longer silently swapped for one it does. Existing stored models continue to work unchanged.
- **Fixed the Target Model being silently blanked on Save**: on a world that loaded while `/models` was unreachable, opening module settings and pressing Save Changes used to overwrite the stored model with `""`, and every subsequent request went out with `"model": ""` and was rejected with an opaque 400. The text-input field takes its value from the stored setting instead of from a control that reports an empty string when it has no options, so the wipe cannot happen at all.
- No automatic re-query on endpoint change: it would send the current API key to whatever URL happens to be typed at that moment. Press the refresh button after changing the endpoint or the key.

# 2.1.6
- **Translate button moved into the editing view for journal pages**: on Foundry v14 the button used to appear once per page inside the journal entry's scrollable read view, and not at all in the window header. It now sits next to the sheet title in the page editor, the same place item sheets already use, so every document type has the control in one consistent spot. Open the page for editing to translate it.
- **The editor's current text is what gets translated**: unsaved edits in the open editor are used as the source instead of the text stored on the document, and are persisted through the normal output mode. This means "edit the page, then click Translate" no longer discards your pending edits, and a brand-new page that was never saved can now be translated as soon as you type something.
- **Duplicate mode saves the source before copying**: with unsaved editor text, the original document is updated with that text before the translated copy is created, so the copy's source always exists somewhere.
- **Fixed the pre-translation text resurfacing on reload**: the sheet is now closed before the document is written. Foundry saves an open editor as part of closing, and with the old order that save landed after the write and overwrote the translation with the original text.
- Removed the "extra button in journals" note from the README: it referred to the read-view render that is no longer offered a button.

# 2.1.5
- **Cache and TTS work over plain HTTP**: hashing now falls back to a pure-JS SHA-256 when `crypto.subtle` is unavailable (e.g. a GM connecting from a LAN device over HTTP, which is not a Secure Context). Previously the translation cache and the TTS Generate button both crashed with `Cannot read properties of undefined (reading 'digest')`, and on TTS the exception aborted button injection so no read-aloud controls appeared at all. Hashes match the ones produced under HTTPS, so existing cache entries and TTS filenames remain valid.
- **API errors now show the endpoint's real reason**: HTTP failures from the translation and `/models` calls include the OpenAI-compatible `error.message` body (e.g. `"you must provide a model parameter"`) instead of just a bare status code.
- **Clear message when the Target Model is empty**: translations no longer send a broken request when the model setting is blank; a toast prompts you to pick one in module settings.
- **Model list refresh preserves your selection**: the refresh button next to Target Model now keeps the saved model as an option even if the endpoint stops listing it (shown as `"<id> (not listed by endpoint)"`), so saving the form after a refresh cannot silently blank the setting.

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