import { TranslateAllSettingHandler } from "handlers/settings-handler";
import { MAX_CUSTOM_PROMPT_LENGTH, SupportedLanguages, SupportedSystems } from "types";

export class Translator {
  static async translate(description: string): Promise<string | undefined> {
    return await Translator.translateWithChatGPT(description);
  }

  static async getPromptTemplate(path: string): Promise<string> {
    if (!path) {
      return "";
    }
    let promptTemplate = "";
    try {
      const url = foundry.utils.getRoute(path);
      promptTemplate = await fetch(url).then((x) => x.text());
    } catch (err) {
      ui?.notifications?.warn(`Could not load prompt template. ${err}`);
    }

    return promptTemplate;
  }

  static getCustomPrompt(): string {
    const customPrompt = TranslateAllSettingHandler.getSetting("translate-all", "customPrompt")?.trim();
    if (!customPrompt) {
      return "";
    }
    if (customPrompt.length > MAX_CUSTOM_PROMPT_LENGTH) {
      ui?.notifications?.warn(`Custom prompt ignored: it exceeds ${MAX_CUSTOM_PROMPT_LENGTH} characters.`);
      return "";
    }
    return customPrompt;
  }

  static async generatePrompt(
    system: SupportedSystems,
    language: SupportedLanguages,
    description: string,
  ): Promise<string> {
    // Precedence: inline custom prompt > prompt template file > default prompt
    let prompt = Translator.getCustomPrompt();

    if (!prompt) {
      const path = TranslateAllSettingHandler.getSetting("translate-all", "promptTemplatePath");
      if (path) {
        prompt = (await Translator.getPromptTemplate(path)).trim();
      }
    }

    if (prompt) {
      return `${prompt}: ${description}`;
    }

    return `Translate the following ${system} item/spell description into ${language}:\n\n
            Keep the same format and structure, like HTML tags, and do not translate the item name or any specific game terms.
            Reproduce Foundry reference syntax exactly as written, brackets included: @UUID, @Check, @Damage, @Template, &Reference and inline rolls. Only the visible label between curly braces may be translated.
            Do not add any additional code encapsulation or formatting. Just return the translated text.\n\n
            ${description}.`;
  }

  // Normalizes an OpenAI-compatible endpoint URL: trims whitespace and
  // trailing slashes so it can be safely concatenated with API routes.
  private static normalizeBaseUrl(url: string | undefined | null): string {
    return (url ?? "").trim().replace(/\/+$/, "");
  }

  // Base URL of the OpenAI-compatible endpoint, without trailing slashes so
  // it can be safely concatenated with API routes.
  static getApiBaseUrl(): string {
    return Translator.normalizeBaseUrl(TranslateAllSettingHandler.getSetting("translate-all", "apiEndpoint"));
  }

  private static reportConnectionError(baseUrl: string, error: unknown): void {
    ui?.notifications?.error(
      `Could not reach API endpoint ${baseUrl}. Check the URL, that the server is running, and that it is reachable from this browser. ${error}`,
    );
  }

  private static reportHttpError(response: Response, baseUrl: string): void {
    if (response.status === 401 || response.status === 403) {
      ui?.notifications?.error(`API key rejected by the endpoint (HTTP ${response.status}).`);
      return;
    }
    ui?.notifications?.error(`API call to ${baseUrl} failed (HTTP ${response.status} ${response.statusText}).`);
  }

  // Credentials default to the saved settings, but can be supplied by the
  // caller so the settings form can query an endpoint before saving it.
  static async getModels(credentials?: {
    apiKey?: string;
    baseUrl?: string;
  }): Promise<Record<string, string> | undefined> {
    const apiKey = credentials?.apiKey ?? TranslateAllSettingHandler.getSetting("translate-all", "apiKey");
    if (!apiKey) {
      // Nothing configured yet: skip the request instead of raising an error
      // toast on every world load of a freshly installed module.
      return undefined;
    }
    const baseUrl =
      credentials?.baseUrl !== undefined
        ? Translator.normalizeBaseUrl(credentials.baseUrl)
        : Translator.getApiBaseUrl();
    if (!baseUrl) {
      ui?.notifications?.error("API endpoint is not configured. Set it in the module settings.");
      return undefined;
    }

    let response;
    try {
      response = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
    } catch (error) {
      Translator.reportConnectionError(baseUrl, error);
      return undefined;
    }

    if (!response.ok) {
      Translator.reportHttpError(response, baseUrl);
      return undefined;
    }

    const data = await response.json().catch(() => undefined);
    if (!data || !Array.isArray(data.data)) {
      ui?.notifications?.error(`API endpoint ${baseUrl} returned an unexpected response for /models.`);
      return undefined;
    }

    const models = data.data.reduce((acc: Record<string, string>, model: { id: string }) => {
      acc[model.id] = model.id;
      return acc;
    }, {});
    return models;
  }

  static async translateWithChatGPT(description: string): Promise<string | undefined> {
    const apiKey = TranslateAllSettingHandler.getSetting("translate-all", "apiKey");
    if (!apiKey) {
      ui?.notifications?.error("API key is not configured. Set it in the module settings.");
      return undefined;
    }
    const baseUrl = Translator.getApiBaseUrl();
    if (!baseUrl) {
      ui?.notifications?.error("API endpoint is not configured. Set it in the module settings.");
      return undefined;
    }
    const system = TranslateAllSettingHandler.getSetting("translate-all", "targetSystem");
    const language = TranslateAllSettingHandler.getSetting("translate-all", "targetLanguage");
    const model = TranslateAllSettingHandler.getSetting("translate-all", "targetModel");
    const prompt = await Translator.generatePrompt(system, language, description);

    let response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (error) {
      Translator.reportConnectionError(baseUrl, error);
      return undefined;
    }

    if (!response.ok) {
      Translator.reportHttpError(response, baseUrl);
      return undefined;
    }

    const data = await response.json().catch(() => undefined);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content) {
      ui?.notifications?.error(`API endpoint ${baseUrl} returned an unexpected response for /chat/completions.`);
      return undefined;
    }
    return content;
  }
}
