import { KeyFor, SupportedModels, SupportedSystems, TranslateAllNamespace } from "../types";

export class TranslateAllSettingHandler {
  gameSettings: Game["settings"] = game.settings!;
  readonly settings = {
    targetSystem: {
      name: "translate-all.settings.game.system.name",
      hint: "translate-all.settings.game.system.hint",
      scope: "world",
      config: true,
      type: String,
      default: SupportedSystems.PATHFINDER2E, // Default to Pathfinder 2e
      choices: {
        [SupportedSystems.DND5E]: "D&D 5e",
        [SupportedSystems.PATHFINDER2E]: "Pathfinder 2e",
      },
    },
    apiKey: {
      name: "translate-all.settings.apiKey.name",
      hint: "translate-all.settings.apiKey.hint",
      scope: "world",
      config: true,
      type: String,
      default: "",
      masked: true,
    },
    targetLanguage: {
      name: "translate-all.settings.language.name",
      hint: "translate-all.settings.language.hint",
      scope: "world",
      config: true,
      type: String,
      default: "Italian", // Default to Italian
      masked: true,
    },
    targetModel: {
      name: "translate-all.settings.model.name",
      hint: "translate-all.settings.model.hint",
      scope: "world",
      config: true,
      type: String,
      default: "gpt-4o-mini", // Default to gpt-4o-mini
      choices: {
        [SupportedModels.GPT_4O_MINI]: "GPT-4o Mini",
        [SupportedModels.GPT_4_1]: "GPT-4.1",
        [SupportedModels.GPT_4_1_MINI]: "GPT-4.1 Mini",
        [SupportedModels.GPT_4_1_NANO]: "GPT-4.1 Nano",
        [SupportedModels.GPT_4_TURBO]: "GPT-4 Turbo",
        [SupportedModels.GPT_3_5_TURBO]: "GPT-3.5 Turbo",
      },
    },
  };

  constructor() {}

  init(): void {
    this._registerSettings();
  }

  private _registerSettings(): void {
    this._register(
      "translate-all" as TranslateAllNamespace,
      "targetSystem" as KeyFor<TranslateAllNamespace>,
      this.settings.targetSystem,
    );
    this._register(
      "translate-all" as TranslateAllNamespace,
      "apiKey" as KeyFor<TranslateAllNamespace>,
      this.settings.apiKey,
    );
    this._register(
      "translate-all" as TranslateAllNamespace,
      "targetLanguage" as KeyFor<TranslateAllNamespace>,
      this.settings.targetLanguage,
    );
    this._register(
      "translate-all" as TranslateAllNamespace,
      "targetModel" as KeyFor<TranslateAllNamespace>,
      this.settings.targetModel,
    );
  }

  // TODO: Fix this type casting
  _register(namespace: TranslateAllNamespace, key: KeyFor<TranslateAllNamespace>, config: any): void {
    this.gameSettings.register(namespace as "core", key as KeyFor<"core">, config);
  }

  // TODO: Fix this type casting
  static getSetting(
    namespace: TranslateAllNamespace,
    key: KeyFor<TranslateAllNamespace>,
  ): string | boolean | number | object | undefined {
    const gameSettings = game.settings!;
    return gameSettings.get(namespace as "core", key as KeyFor<"core">);
  }
}
