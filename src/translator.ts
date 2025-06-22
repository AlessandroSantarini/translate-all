import { TranslateAllSettingHandler } from "handlers/settings-handler";
import { SupportedLanguages, SupportedSystems } from "types";

export class Translator {
  static async translate(description: string): Promise<string | undefined> {
    return await Translator.translateWithChatGPT(description);
  }

  static generatePrompt(system: SupportedSystems, language: SupportedLanguages, description: string): string {
    const prompt = `Translate the following ${system} item/spell description into ${language}:\n\n
            Keep the same format and structure, like HTML tags, and do not translate the item name or any specific game terms. 
            Don not add any additional code encapsulation or formatting. Just return the translated text.\n\n
            ${description}."`;
    return prompt;
  }

  static async translateWithChatGPT(description: string): Promise<string | undefined> {
    let response;
    const apiKey = TranslateAllSettingHandler.getSetting("translate-all", "apiKey");
    const system = TranslateAllSettingHandler.getSetting("translate-all", "targetSystem") as SupportedSystems;
    const language = TranslateAllSettingHandler.getSetting("translate-all", "targetLanguage") as SupportedLanguages;

    const prompt = Translator.generatePrompt(system, language, description);
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
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
