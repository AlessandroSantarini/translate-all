import { Translator } from "../translator";
import {
  MAX_CACHE_ENTRIES,
  MAX_CUSTOM_PROMPT_LENGTH,
  OutputModes,
  SupportedLanguages,
  SupportedSystems,
  TranslationCache,
} from "../types";

// Ties the model input to its suggestion list; the settings form renders one
// of each.
const MODEL_SUGGESTIONS_ID = "translate-all-model-suggestions";
const LANGUAGE_SUGGESTIONS_ID = "translate-all-language-suggestions";
// Offered as suggestions, never enforced: the field stays free text because
// "Spanish (Latin America)" or "archaic English" are things worth asking for.
const LANGUAGE_SUGGESTIONS = [
  "english",
  "spanish",
  "french",
  "german",
  "italian",
  "portuguese",
  "brazilian portuguese",
  "dutch",
  "polish",
  "czech",
  "slovak",
  "hungarian",
  "romanian",
  "russian",
  "ukrainian",
  "swedish",
  "norwegian",
  "danish",
  "finnish",
  "greek",
  "turkish",
  "catalan",
  "japanese",
  "korean",
  "chinese",
  "traditional chinese",
];

type DialogOptions = NonNullable<Parameters<typeof foundry.applications.api.DialogV2.confirm>[0]>;

// Blocks of the settings form, in display order, with the settings each one
// holds. Registration follows the same order.
const SETTING_SECTIONS = {
  translation: ["targetSystem", "targetLanguage", "outputMode", "minimumRole"],
  connection: ["apiEndpoint", "apiKey", "targetModel"],
  prompt: ["customPrompt", "promptTemplatePath"],
  cache: ["cacheEnabled"],
  tts: ["ttsEnabled", "ttsApiEndpoint", "ttsApiKey", "ttsModel", "ttsVoice", "ttsInstructions", "ttsFolderPath"],
} as const;

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
    targetLanguage: {
      name: "translate-all.settings.language.name",
      hint: "translate-all.settings.language.hint",
      scope: "world",
      config: true,
      type: String,
      default: SupportedLanguages.ITALIAN,
      onChange: (value: unknown) => TranslateAllSettingHandler.warnUnknownLanguage(value),
    },
    outputMode: {
      name: "translate-all.settings.outputMode.name",
      hint: "translate-all.settings.outputMode.hint",
      scope: "world",
      config: true,
      type: String,
      default: OutputModes.REPLACE,
      choices: {
        // The settings form localizes choice labels, so these are i18n keys.
        [OutputModes.REPLACE]: "translate-all.settings.outputMode.choices.replace",
        [OutputModes.DUPLICATE]: "translate-all.settings.outputMode.choices.duplicate",
        [OutputModes.APPEND]: "translate-all.settings.outputMode.choices.append",
        [OutputModes.PREPEND]: "translate-all.settings.outputMode.choices.prepend",
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
        // Foundry's own role names, so language packs for the core translate them.
        [String(CONST.USER_ROLES.PLAYER)]: "USER.RolePlayer",
        [String(CONST.USER_ROLES.TRUSTED)]: "USER.RoleTrusted",
        [String(CONST.USER_ROLES.ASSISTANT)]: "USER.RoleAssistant",
        [String(CONST.USER_ROLES.GAMEMASTER)]: "USER.RoleGamemaster",
      },
    },
    apiEndpoint: {
      name: "translate-all.settings.apiEndpoint.name",
      hint: "translate-all.settings.apiEndpoint.hint",
      scope: "world",
      config: true,
      type: String,
      default: "https://api.openai.com/v1",
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
    cacheEnabled: {
      name: "translate-all.settings.cache.enabled.name",
      hint: "translate-all.settings.cache.enabled.hint",
      scope: "client",
      config: true,
      type: Boolean,
      default: true,
    },
    // Backing store for the cache itself: client scope keeps it in this
    // browser's localStorage instead of the world database.
    translationCache: {
      scope: "client",
      config: false,
      type: String,
      default: "{}",
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

    // Registration order is display order: the settings form renders the
    // entries of a namespace in the order they were registered, and the
    // section headers injected on render rely on it.
    gameSettings.register("translate-all", "targetSystem", this.settings.targetSystem);
    gameSettings.register("translate-all", "targetLanguage", this.settings.targetLanguage);
    gameSettings.register("translate-all", "outputMode", this.settings.outputMode);
    gameSettings.register("translate-all", "minimumRole", this.settings.minimumRole);

    gameSettings.register("translate-all", "apiEndpoint", this.settings.apiEndpoint);
    gameSettings.register("translate-all", "apiKey", this.settings.apiKey);

    const models = await Translator.getModels();
    const targetModelConfig = {
      ...this.settings.targetModel,
      choices: models ?? this.settings.targetModel.choices,
    };
    gameSettings.register("translate-all", "targetModel", targetModelConfig);
    gameSettings.register("translate-all", "customPrompt", this.settings.customPrompt);
    gameSettings.register("translate-all", "promptTemplatePath", this.settings.promptTemplatePath);

    gameSettings.register("translate-all", "cacheEnabled", this.settings.cacheEnabled);
    gameSettings.register("translate-all", "translationCache", this.settings.translationCache);

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

  // The settings form is one flat list, seventeen rows long with TTS. Each
  // block gets a heading inserted as a direct sibling of its first setting,
  // so the parent form's layout is unchanged. A wrapping element with
  // display:contents would seem cleaner, but v14's SettingsConfig lays the
  // pane out with rules that leave large vertical gaps around such wrappers.
  static injectSectionHeaders(html: unknown): void {
    const root = TranslateAllSettingHandler.resolveRootElement(html);
    if (!root) return;

    TranslateAllSettingHandler.ensureSectionStyles();

    const sections: { heading: HTMLElement; groups: HTMLElement[] }[] = [];
    for (const [section, keys] of Object.entries(SETTING_SECTIONS)) {
      // Only the settings actually on the form: users who cannot modify world
      // settings get the client ones alone, so a block may be partial or
      // missing entirely.
      const groups = keys
        .map((key) => root.querySelector(`[name="translate-all.${key}"]`)?.closest(".form-group"))
        .filter((group): group is HTMLElement => group instanceof HTMLElement);
      const first = groups.at(0);
      if (!first) continue;
      if (first.previousElementSibling?.classList.contains("translate-all-section-heading")) {
        const existing = first.previousElementSibling as HTMLElement;
        sections.push({ heading: existing, groups });
        continue;
      }

      const heading = document.createElement("h3");
      heading.className = "translate-all-section-heading";
      heading.dataset.section = section;
      heading.textContent = game.i18n?.localize(`translate-all.settings.section.${section}`) ?? section;
      first.before(heading);
      sections.push({ heading, groups });
    }

    // Follow the settings search: when it hides every setting under a
    // heading, hide the heading too so no orphan title is left behind.
    const update = () => {
      for (const { heading, groups } of sections) {
        heading.hidden = groups.every((g) => g.hidden);
      }
    };
    const observer = new MutationObserver(update);
    for (const { groups } of sections) {
      for (const g of groups) observer.observe(g, { attributes: true, attributeFilter: ["hidden"] });
    }
    update();
  }

  private static ensureSectionStyles(): void {
    if (document.getElementById("translate-all-section-style")) return;

    const style = document.createElement("style");
    style.id = "translate-all-section-style";
    // Sized from a theme variable and ruled in a tint of the text color, so
    // the heading reads the same in the light and dark themes.
    style.textContent = `
      h3.translate-all-section-heading {
        margin: 0.5rem 0 0.25rem;
        padding-bottom: 0.25rem;
        font-size: var(--font-size-18, 1.125rem);
        border-bottom: 1px solid color-mix(in srgb, currentColor 35%, transparent);
      }
      h3.translate-all-section-heading[hidden] {
        display: none;
      }
    `;
    document.head.append(style);
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

    // Empties the field only. Nothing is stored until the form is saved, so
    // Cancel still brings the prompt back; no confirmation on top of that.
    // The textarea keeps the full row; the button wraps under it, to the right.
    textarea.style.flex = "1 1 100%";
    textarea.parentElement?.style.setProperty("flex-wrap", "wrap");
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "translate-all-clear-prompt";
    clear.style.marginLeft = "auto";
    clear.style.marginTop = "4px";
    clear.style.flex = "0 0 auto";
    clear.title = game.i18n?.localize("translate-all.settings.customPrompt.clear.hint") ?? "";
    const icon = document.createElement("i");
    icon.className = "fas fa-eraser";
    clear.appendChild(icon);
    clear.appendChild(
      document.createTextNode(
        ` ${game.i18n?.localize("translate-all.settings.customPrompt.clear.label") ?? "Clear Custom Prompt"}`,
      ),
    );
    clear.addEventListener("click", (event) => {
      event.preventDefault();
      textarea.value = "";
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      textarea.focus();
    });
    textarea.after(clear);
  }

  // Foundry renders a String setting with choices as a dropdown, which leaves
  // no way in when the endpoint does not answer /models: nothing to pick, and
  // nothing to type. The field becomes a text input backed by a suggestion
  // list, keeping the input name so the settings form submits it unchanged.
  // The model list turns into a convenience rather than the only way to name
  // a model, and an empty list can no longer overwrite what was stored.
  static enhanceModelField(html: unknown): void {
    const root = TranslateAllSettingHandler.resolveRootElement(html);
    if (!root) return;

    const select = root.querySelector<HTMLSelectElement>('select[name="translate-all.targetModel"]');
    if (!select || select.parentElement?.querySelector("button.translate-all-refresh-models")) return;

    const suggestions = document.createElement("datalist");
    suggestions.id = MODEL_SUGGESTIONS_ID;
    TranslateAllSettingHandler.repopulateSuggestions(
      suggestions,
      Array.from(select.options, (option) => option.value),
    );

    const input = document.createElement("input");
    input.type = "text";
    input.name = select.name;
    input.className = select.className;
    // The stored setting rather than the select's value: with no options the
    // select reports an empty string, which is what used to be saved back.
    input.value = TranslateAllSettingHandler.getSetting("translate-all", "targetModel") ?? "";
    input.setAttribute("list", suggestions.id);
    // The suggestion list is the point; the browser's own history is noise.
    input.autocomplete = "off";
    input.placeholder = game.i18n?.localize("translate-all.settings.model.placeholder") ?? "";

    select.replaceWith(input);
    input.after(suggestions);

    const button = document.createElement("button");
    // Not a submit button: it must not save and close the settings form.
    button.type = "button";
    button.className = "translate-all-refresh-models";
    button.style.marginLeft = "4px";
    button.style.flex = "0 0 auto";
    button.innerHTML = '<i class="fas fa-rotate"></i>';
    button.title = game.i18n?.localize("translate-all.settings.model.refresh") ?? "Refresh model list";

    button.addEventListener("click", async () => {
      button.disabled = true;
      const previousIcon = button.innerHTML;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      try {
        // Read the credentials currently typed in the form, so the endpoint
        // can be tested without saving it first.
        const models = await Translator.getModels({
          apiKey: TranslateAllSettingHandler.readFieldValue(root, "translate-all.apiKey"),
          baseUrl: TranslateAllSettingHandler.readFieldValue(root, "translate-all.apiEndpoint"),
        });

        // getModels already reported the specific reason on failure.
        if (!models) return;

        TranslateAllSettingHandler.repopulateSuggestions(suggestions, Object.keys(models));
        ui?.notifications?.info(`Loaded ${Object.keys(models).length} models.`);
      } finally {
        button.disabled = false;
        button.innerHTML = previousIcon;
      }
    });

    input.after(button);
  }

  // The language goes to the model exactly as typed, so a typo or a made-up
  // name lands in the prompt unchanged. The suggestion list is there to pick
  // from, and warnUnknownLanguage says so when what was saved is not on it.
  static enhanceLanguageField(html: unknown): void {
    const root = TranslateAllSettingHandler.resolveRootElement(html);
    if (!root) return;

    const input = root.querySelector<HTMLInputElement>('input[name="translate-all.targetLanguage"]');
    if (!input || input.getAttribute("list")) return;

    const suggestions = document.createElement("datalist");
    suggestions.id = LANGUAGE_SUGGESTIONS_ID;
    TranslateAllSettingHandler.repopulateSuggestions(suggestions, LANGUAGE_SUGGESTIONS);
    input.setAttribute("list", suggestions.id);
    input.autocomplete = "off";
    input.after(suggestions);
  }

  // Runs when the setting is saved. Warns and keeps the value: the user may
  // well mean what they typed.
  static warnUnknownLanguage(value: unknown): void {
    const language = typeof value === "string" ? value.trim() : "";
    if (!language || LANGUAGE_SUGGESTIONS.includes(language.toLowerCase())) return;
    ui?.notifications?.warn(
      game.i18n?.format("translate-all.settings.language.unknown", { language }) ??
        `"${language}" is not a suggested language name. It is sent to the model exactly as typed.`,
    );
  }

  private static readFieldValue(root: HTMLElement, name: string): string | undefined {
    const field = root.querySelector<HTMLInputElement>(`[name="${name}"]`);
    return field?.value?.trim() || undefined;
  }

  // Refreshing only replaces what the endpoint offers. Whatever is typed in
  // the field is left alone, so a model the endpoint does not list is not
  // silently swapped for one that it does.
  private static repopulateSuggestions(suggestions: HTMLDataListElement, models: string[]): void {
    suggestions.replaceChildren();

    for (const model of models) {
      if (!model) continue;
      const option = document.createElement("option");
      option.value = model;
      suggestions.append(option);
    }
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

  static isCacheEnabled(): boolean {
    return TranslateAllSettingHandler.getSetting("translate-all", "cacheEnabled") === true;
  }

  static getCachedTranslation(key: string): string | undefined {
    const entry = TranslateAllSettingHandler.readCache()[key];
    return entry ? entry.content : undefined;
  }

  static async storeCachedTranslation(key: string, content: string): Promise<void> {
    if (!key || !content) {
      return;
    }
    const cache = TranslateAllSettingHandler.readCache();
    cache[key] = { content, at: Date.now() };
    await TranslateAllSettingHandler.writeCache(TranslateAllSettingHandler.evictOldest(cache));
  }

  // Returns how many entries were dropped so the caller can report it.
  static async clearTranslationCache(): Promise<number> {
    const dropped = Object.keys(TranslateAllSettingHandler.readCache()).length;
    await TranslateAllSettingHandler.writeCache({});
    return dropped;
  }

  // Injects a Clear Translation Cache button next to the cacheEnabled checkbox in the
  // settings form. Uses text nodes so localized strings are never parsed as HTML.
  static injectClearCacheButton(html: unknown): void {
    const root = TranslateAllSettingHandler.resolveRootElement(html);
    if (!root) return;

    const checkbox = root.querySelector<HTMLInputElement>('input[name="translate-all.cacheEnabled"]');
    const container = checkbox?.parentElement;
    if (!container || container.querySelector("button.translate-all-clear-cache")) return;

    const button = document.createElement("button");
    // Never submit the settings form: this only touches client-side storage.
    button.type = "button";
    button.className = "translate-all-clear-cache";
    button.title = game.i18n?.localize("translate-all.settings.cache.clear.hint") ?? "";

    const icon = document.createElement("i");
    icon.className = "fas fa-trash";
    button.appendChild(icon);
    button.appendChild(
      document.createTextNode(
        ` ${game.i18n?.localize("translate-all.settings.cache.clear.label") ?? "Clear Translation Cache"}`,
      ),
    );

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      // The button acts at once, outside Save/Cancel, and what it drops costs
      // API calls to rebuild, so it asks first.
      const confirmed = await TranslateAllSettingHandler.confirm(
        "translate-all.settings.cache.clear.label",
        "translate-all.settings.cache.clear.confirm",
      );
      if (!confirmed) return;
      const dropped = await TranslateAllSettingHandler.clearTranslationCache();
      ui?.notifications?.info(`Translation cache cleared (${dropped} entries removed).`);
    });

    container.appendChild(button);
  }

  // Yes/no dialog built from two localized strings. The content is set as
  // text, never parsed as HTML. Closing the dialog counts as "no".
  private static async confirm(titleKey: string, contentKey: string): Promise<boolean> {
    const paragraph = document.createElement("p");
    paragraph.textContent = game.i18n?.localize(contentKey) ?? contentKey;
    // Foundry accepts a partial window configuration here; the typings ask
    // for the whole of it.
    const window = { title: game.i18n?.localize(titleKey) ?? titleKey } as DialogOptions["window"];
    const answer = await foundry.applications.api.DialogV2.confirm({
      window,
      content: paragraph.outerHTML,
      rejectClose: false,
      modal: true,
    });
    return answer === true;
  }

  // Tolerates anything localStorage may hold: a corrupted or hand-edited value
  // degrades to an empty cache instead of breaking translation.
  private static readCache(): TranslationCache {
    const raw = TranslateAllSettingHandler.getSetting("translate-all", "translationCache");
    if (!raw) {
      return {};
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const cache: TranslationCache = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object") {
        continue;
      }
      const content = Reflect.get(value, "content");
      const at = Reflect.get(value, "at");
      if (typeof content !== "string" || typeof at !== "number") {
        continue;
      }
      cache[key] = { content, at };
    }
    return cache;
  }

  private static async writeCache(cache: TranslationCache): Promise<void> {
    try {
      await game.settings!.set("translate-all", "translationCache", JSON.stringify(cache));
    } catch (error) {
      // A full localStorage quota must never abort a successful translation.
      ui?.notifications?.warn(`Could not persist the translation cache. ${error}`);
    }
  }

  private static evictOldest(cache: TranslationCache): TranslationCache {
    const keys = Object.keys(cache);
    if (keys.length <= MAX_CACHE_ENTRIES) {
      return cache;
    }

    const kept = keys.sort((a, b) => cache[b].at - cache[a].at).slice(0, MAX_CACHE_ENTRIES);
    const trimmed: TranslationCache = {};
    for (const key of kept) {
      trimmed[key] = cache[key];
    }
    return trimmed;
  }
}
