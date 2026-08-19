- better button (use CSS and module style)
- transform CRLF to LF on pre-commit
- 5ed journal not working (markdowns type)
- richer caching system (supersedes the current client-side localStorage cache from 2.1.4)
  - persist the original text and its translation as a pair to the Foundry Data folder on disk, using the same file-based mechanism as the experimental TTS feature, rather than to browser localStorage
  - add a "Restore original" button next to the Translate button so a bad translation can be discarded and the source text restored in place
  - key entries by a hash of the source text so a translation produced by one user can be picked up by another user in the same world

Possible additional feature:
- generating images
- TTS support for D&D 5e
- streaming TTS playback (start audio while still generating)