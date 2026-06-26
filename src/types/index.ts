export const MODULE_NAME = 'translate-all';

declare global {
  interface SettingConfig {
    'translate-all.targetSystem': SupportedSystems;
    'translate-all.apiKey': string;
    'translate-all.apiEndpoint': string;
    'translate-all.targetLanguage': SupportedLanguages;
    'translate-all.targetModel': string;
    'translate-all.promptTemplatePath': string;
    'translate-all.ttsEnabled': boolean;
    'translate-all.ttsApiEndpoint': string;
    'translate-all.ttsApiKey': string;
    'translate-all.ttsModel': string;
    'translate-all.ttsVoice': string;
    'translate-all.ttsInstructions': string;
    'translate-all.ttsFolderPath': string;
  }

  namespace ClientSettings {
    interface RegisterOptions<T extends Type> {
      masked?: boolean;
      filePicker?: boolean;
    }
  }
}

export interface SheetLikeDocument {
  text?: { content?: string };
  system?: unknown;
  update?: (data: Record<string, string>) => unknown;
  updateSource?: (data: Record<string, string>) => unknown;
  render?(force?: boolean): void;
  sheet?: { close?(...args: unknown[]): unknown } | null;
}

export interface SheetLikeApp {
  document?: SheetLikeDocument;
  object?: SheetLikeDocument;
  options?: object;
  element?: HTMLElement | JQuery<HTMLElement>;
  render(...args: unknown[]): unknown;
  close(...args: unknown[]): unknown;
}

export interface TranslateFunction {
  (
    app: SheetLikeApp,
    html: JQuery<HTMLElement> | HTMLElement,
    description: string,
    path: string,
  ): Promise<void>;
}

export enum SupportedSystems {
  DND5E = 'D&D5E',
  PATHFINDER2E = 'PF2E',
}

export enum SupportedLanguages {
  ENGLISH = 'english',
  ITALIAN = 'italian',
}

export enum SupportedEntries {
  JOURNAL = 'journal',
  ITEM = 'item',
}

export const Directories = {
  [SupportedSystems.DND5E]: {
    [SupportedEntries.JOURNAL]: 'text.content',
    [SupportedEntries.ITEM]: 'system.description.value',
  },
  [SupportedSystems.PATHFINDER2E]: {
    [SupportedEntries.JOURNAL]: 'text.content',
    [SupportedEntries.ITEM]: 'system.description.value',
  },
};
