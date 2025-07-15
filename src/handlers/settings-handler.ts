import { Translator } from "../translator";
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
    apiEndpoint: {
      name: "translate-all.settings.apiEndpoint.name",
      hint: "translate-all.settings.apiEndpoint.hint",
      scope: "world",
      config: true,
      type: String,
      default: "https://api.openai.com/v1",
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
      default: "gpt-4o-mini",
    },
  };

  constructor() {}

  async init(): Promise<void> {
    await this._registerSettings();
  }

  private async _registerSettings(): Promise<void> {
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
      "apiEndpoint" as KeyFor<TranslateAllNamespace>,
      this.settings.apiEndpoint,
    );
    this._register(
      "translate-all" as TranslateAllNamespace,
      "targetLanguage" as KeyFor<TranslateAllNamespace>,
      this.settings.targetLanguage,
    );
    const models = await Translator.getModels();
    if (models) {
      this.settings.targetModel.choices = models;
    }
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
