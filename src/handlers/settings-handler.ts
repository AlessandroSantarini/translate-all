import { Translator } from "../translator";
import { SupportedLanguages, SupportedSystems } from "../types";

export class TranslateAllSettingHandler {
  readonly settings = {
    targetSystem: {
      name: "translate-all.settings.game.system.name",
      hint: "translate-all.settings.game.system.hint",
      scope: "world",
      config: true,
      type: String,
      default: SupportedSystems.PATHFINDER2E,
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
      default: SupportedLanguages.ITALIAN,
      masked: true,
    },
    targetModel: {
      name: "translate-all.settings.model.name",
      hint: "translate-all.settings.model.hint",
      scope: "world",
      config: true,
      type: String,
      default: "gpt-4o-mini",
      choices: {} as Record<string, string>,
    },
    promptTemplatePath: {
      name: "translate-all.settings.promptTemplatePath.name",
      hint: "translate-all.settings.promptTemplatePath.hint",
      scope: "world",
      config: true,
      type: String,
      filePicker: true,
      default: "",
    },
  } as const satisfies Record<string, ClientSettings.RegisterOptions<ClientSettings.Type>>;

  async init(): Promise<void> {
    const gameSettings = game.settings!;

    gameSettings.register("translate-all", "targetSystem", this.settings.targetSystem);
    gameSettings.register("translate-all", "apiKey", this.settings.apiKey);
    gameSettings.register("translate-all", "apiEndpoint", this.settings.apiEndpoint);
    gameSettings.register("translate-all", "targetLanguage", this.settings.targetLanguage);

    const models = await Translator.getModels();
    const targetModelConfig = {
      ...this.settings.targetModel,
      choices: models ?? this.settings.targetModel.choices,
    };
    gameSettings.register("translate-all", "targetModel", targetModelConfig);
    gameSettings.register("translate-all", "promptTemplatePath", this.settings.promptTemplatePath);
  }

  static getSetting<K extends ClientSettings.KeyFor<"translate-all">>(
    namespace: "translate-all",
    key: K,
  ): ClientSettings.SettingInitializedType<"translate-all", K> {
    return game.settings!.get(namespace, key);
  }
}
