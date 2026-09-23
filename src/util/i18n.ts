// Thin wrappers over game.i18n so call sites read as a key and its data. A
// key that is not translated comes back as the key itself, which is what
// Foundry's own localize does, so a missing entry is visible rather than silent.

export function localize(key: string): string {
  return game.i18n?.localize(key) ?? key;
}

export function format(key: string, data: Record<string, string | number>): string {
  return game.i18n?.format(key, data) ?? key;
}
