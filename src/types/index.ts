export const MODULE_NAME = 'translate-all';

export interface TranslateConfigSettingConfig {
  'translate-all.apiKey': string;
  'translate-all.targetSystem': string;
  'translate-all.targetLanguage': string;
  'translate-all.targetModel': string;
  'translate-all.apiEndpoint': string;
  'translate-all.promptTemplatePath': string;
}

export type TranslateAllNamespace = typeof MODULE_NAME | ClientSettings.Namespace;

type GetKeys<
  N extends string,
  SettingPath extends PropertyKey,
> = SettingPath extends `${N}.${infer Name}` ? Name : never;
export type KeyFor<N extends TranslateAllNamespace> = GetKeys<
  N,
  keyof TranslateConfigSettingConfig
>;

export interface TranslateFunction {
  (
    app: JournalPageSheet | ItemSheet,
    html: JQuery<HTMLElement>,
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
