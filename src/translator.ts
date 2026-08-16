import { TranslateAllSettingHandler } from "handlers/settings-handler";
import { SupportedLanguages, SupportedSystems } from "types";

const MAX_CUSTOM_PROMPT_LENGTH = 10000;

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
            Do not add any additional code encapsulation or formatting. Just return the translated text.\n\n
            ${description}.`;
  }

  static async getModels(): Promise<Record<string, string> | undefined> {
    let response;
    const apiKey = TranslateAllSettingHandler.getSetting("translate-all", "apiKey");
    const apiEndpoint = TranslateAllSettingHandler.getSetting("translate-all", "apiEndpoint");

    try {
      response = await fetch(`${apiEndpoint}/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
    } catch (error) {
      ui?.notifications?.error(`ChatGPT API call failed. ${error}`);
    }

    if (!response?.ok) {
      ui?.notifications?.error("ChatGPT API call failed.");
      return undefined;
    }

    const data = await response.json();
    const models = data.data.reduce((acc: Record<string, string>, model: { id: string }) => {
      acc[model.id] = model.id;
      return acc;
    }, {});
    return models;
  }

  static async translateWithChatGPT(description: string): Promise<string | undefined> {
    let response;
    const apiKey = TranslateAllSettingHandler.getSetting("translate-all", "apiKey");
    const apiEndpoint = TranslateAllSettingHandler.getSetting("translate-all", "apiEndpoint");
    const system = TranslateAllSettingHandler.getSetting("translate-all", "targetSystem");
    const language = TranslateAllSettingHandler.getSetting("translate-all", "targetLanguage");
    const model = TranslateAllSettingHandler.getSetting("translate-all", "targetModel");
    const prompt = await Translator.generatePrompt(system, language, description);

    try {
      response = await fetch(`${apiEndpoint}/chat/completions`, {
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
      ui?.notifications?.error(`ChatGPT API call failed. ${error}`);
    }

    if (!response?.ok) {
      ui?.notifications?.error("ChatGPT API call failed.");
      return undefined;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? undefined;
  }
}
