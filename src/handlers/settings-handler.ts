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
    ttsEnabled: {
      name: "translate-all.settings.tts.enabled.name",
      hint: "translate-all.settings.tts.enabled.hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false,
    },
    ttsApiEndpoint: {
      name: "translate-all.settings.tts.apiEndpoint.name",
      hint: "translate-all.settings.tts.apiEndpoint.hint",
      scope: "world",
      config: true,
      type: String,
      default: "https://api.openai.com/v1",
    },
    ttsApiKey: {
      name: "translate-all.settings.tts.apiKey.name",
      hint: "translate-all.settings.tts.apiKey.hint",
      scope: "world",
      config: true,
      type: String,
      default: "",
      masked: true,
    },
    ttsModel: {
      name: "translate-all.settings.tts.model.name",
      hint: "translate-all.settings.tts.model.hint",
      scope: "world",
      config: true,
      type: String,
      default: "tts-1",
      choices: {
        "tts-1": "OpenAI tts-1",
        "tts-1-hd": "OpenAI tts-1-hd",
        "gpt-4o-mini-tts": "OpenAI gpt-4o-mini-tts",
      },
    },
    ttsVoice: {
      name: "translate-all.settings.tts.voice.name",
      hint: "translate-all.settings.tts.voice.hint",
      scope: "world",
      config: true,
      type: String,
      default: "alloy",
      choices: {
        alloy: "Alloy",
        ash: "Ash",
        ballad: "Ballad",
        coral: "Coral",
        echo: "Echo",
        fable: "Fable",
        onyx: "Onyx",
        nova: "Nova",
        sage: "Sage",
        shimmer: "Shimmer",
        verse: "Verse",
      },
    },
    ttsInstructions: {
      name: "translate-all.settings.tts.instructions.name",
      hint: "translate-all.settings.tts.instructions.hint",
      scope: "world",
      config: true,
      type: String,
      default:
        "Speak as a dramatic tabletop RPG narrator reading a boxed read-aloud passage: measured pacing, vivid tone, slight tension, and clear diction.",
    },
    ttsFolderPath: {
      name: "translate-all.settings.tts.folderPath.name",
      hint: "translate-all.settings.tts.folderPath.hint",
      scope: "world",
      config: true,
      type: String,
      default: "translateAll/textToSpeech",
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

    gameSettings.register("translate-all", "ttsEnabled", this.settings.ttsEnabled);
    gameSettings.register("translate-all", "ttsApiEndpoint", this.settings.ttsApiEndpoint);
    gameSettings.register("translate-all", "ttsApiKey", this.settings.ttsApiKey);
    gameSettings.register("translate-all", "ttsModel", this.settings.ttsModel);
    gameSettings.register("translate-all", "ttsVoice", this.settings.ttsVoice);
    gameSettings.register("translate-all", "ttsInstructions", this.settings.ttsInstructions);
    gameSettings.register("translate-all", "ttsFolderPath", this.settings.ttsFolderPath);
  }

  static getSetting<K extends ClientSettings.KeyFor<"translate-all">>(
    namespace: "translate-all",
    key: K,
  ): ClientSettings.SettingInitializedType<"translate-all", K> {
    return game.settings!.get(namespace, key);
  }
}
