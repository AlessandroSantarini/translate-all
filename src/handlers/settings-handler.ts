import { Translator } from "../translator";
import { MAX_CUSTOM_PROMPT_LENGTH, OutputModes, SupportedLanguages, SupportedSystems } from "../types";

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
    // Client scope: Foundry delivers world settings to every connected
    // client, which would hand the key to the players.
    apiKey: {
      name: "translate-all.settings.apiKey.name",
      hint: "translate-all.settings.apiKey.hint",
      scope: "client",
      config: true,
      type: String,
      default: "",
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
    },
    outputMode: {
      name: "translate-all.settings.outputMode.name",
      hint: "translate-all.settings.outputMode.hint",
      scope: "world",
      config: true,
      type: String,
      default: OutputModes.REPLACE,
      choices: {
        [OutputModes.REPLACE]: "Replace the original text",
        [OutputModes.DUPLICATE]: "Create a translated copy",
        [OutputModes.APPEND]: "Append translation after the original",
        [OutputModes.PREPEND]: "Prepend translation before the original",
      },
    },
    minimumRole: {
      name: "translate-all.settings.minimumRole.name",
      hint: "translate-all.settings.minimumRole.hint",
      scope: "world",
      config: true,
      // Stored as a string because Foundry setting choices are string keyed;
      // compared numerically against CONST.USER_ROLES in canUserTranslate.
      type: String,
      // Translating spends the configured API key, so the default keeps that
      // in the hands of the GM.
      default: String(CONST.USER_ROLES.GAMEMASTER),
      choices: {
        [String(CONST.USER_ROLES.PLAYER)]: "Player",
        [String(CONST.USER_ROLES.TRUSTED)]: "Trusted Player",
        [String(CONST.USER_ROLES.ASSISTANT)]: "Assistant GM",
        [String(CONST.USER_ROLES.GAMEMASTER)]: "Game Master",
      },
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
    customPrompt: {
      name: "translate-all.settings.customPrompt.name",
      hint: "translate-all.settings.customPrompt.hint",
      scope: "world",
      config: true,
      type: String,
      default: "",
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
      scope: "client",
      config: true,
      type: String,
      default: "",
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
    gameSettings.register("translate-all", "outputMode", this.settings.outputMode);
    gameSettings.register("translate-all", "minimumRole", this.settings.minimumRole);

    const models = await Translator.getModels();
    const targetModelConfig = {
      ...this.settings.targetModel,
      choices: models ?? this.settings.targetModel.choices,
    };
    gameSettings.register("translate-all", "targetModel", targetModelConfig);
    gameSettings.register("translate-all", "customPrompt", this.settings.customPrompt);
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

  // Replaces the single-line text input of the customPrompt setting with a
  // multiline textarea. The textarea keeps the input's name so the settings
  // form submits it unchanged.
  static enhanceCustomPromptField(html: unknown): void {
    const root = TranslateAllSettingHandler.resolveRootElement(html);
    if (!root) return;

    const input = root.querySelector<HTMLInputElement>('input[name="translate-all.customPrompt"]');
    if (!input) return;

    const textarea = document.createElement("textarea");
    textarea.name = input.name;
    textarea.value = input.value;
    textarea.rows = 5;
    textarea.maxLength = MAX_CUSTOM_PROMPT_LENGTH;
    textarea.className = input.className;
    textarea.style.width = "100%";
    textarea.style.resize = "vertical";
    input.replaceWith(textarea);
  }

  private static resolveRootElement(html: unknown): HTMLElement | null {
    if (html instanceof HTMLElement) return html;
    if (TranslateAllSettingHandler.hasHTMLElementAtZeroIndex(html)) return html[0];
    return null;
  }

  private static hasHTMLElementAtZeroIndex(value: unknown): value is { 0: HTMLElement } {
    if (!value || typeof value !== "object") return false;
    return Reflect.get(value, 0) instanceof HTMLElement;
  }

  // Whether the current user is allowed to spend the configured API key.
  static canUserTranslate(): boolean {
    const minimumRole = Number(TranslateAllSettingHandler.getSetting("translate-all", "minimumRole"));
    if (!Number.isFinite(minimumRole)) return game.user?.isGM === true;
    return (game.user?.role ?? 0) >= minimumRole;
  }

  // The settings form renders every String setting as a plain text input, so
  // the key sat there in the open for anyone looking at the GM's screen. The
  // `masked` flag the settings carried was never a Foundry option and had no
  // effect at all.
  static maskSecretFields(html: unknown): void {
    const root = TranslateAllSettingHandler.resolveRootElement(html);
    if (!root) return;

    for (const key of ["apiKey", "ttsApiKey"]) {
      const input = root.querySelector<HTMLInputElement>(`input[name="translate-all.${key}"]`);
      if (input) input.type = "password";
    }
  }

  // Keys stored before they became client scoped are still sitting in the
  // world database, readable by every client. Move them into this browser and
  // delete the world copy. Runs once, on ready, and only for a GM.
  static async migrateApiKeysToClient(): Promise<void> {
    if (!game.user?.isGM) return;

    for (const key of ["apiKey", "ttsApiKey"] as const) {
      const legacy = TranslateAllSettingHandler.findWorldSetting(`translate-all.${key}`);
      const value = legacy && Reflect.get(legacy, "value");
      if (typeof value !== "string" || !value) continue;

      if (!TranslateAllSettingHandler.getSetting("translate-all", key)) {
        await game.settings!.set("translate-all", key, value);
      }

      const remove = Reflect.get(legacy, "delete");
      if (typeof remove === "function") {
        await remove.call(legacy);
      }
      ui?.notifications?.info(
        `Translate All: moved the ${key === "apiKey" ? "API key" : "TTS API key"} into this browser and removed it from the world, where players could read it.`,
      );
    }
  }

  private static findWorldSetting(fullKey: string): object | undefined {
    const storage = Reflect.get(game.settings ?? {}, "storage");
    const world = storage && typeof Reflect.get(storage, "get") === "function" ? storage.get("world") : undefined;
    if (!world) return undefined;

    const find = Reflect.get(world, "find");
    if (typeof find !== "function") return undefined;

    const found = find.call(world, (setting: unknown) => Reflect.get(setting ?? {}, "key") === fullKey);
    return found && typeof found === "object" ? (found as object) : undefined;
  }
}
