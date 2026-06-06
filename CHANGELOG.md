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