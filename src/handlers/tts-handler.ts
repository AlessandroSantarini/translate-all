import { SheetLikeApp, SupportedSystems } from "../types";
import { TranslateAllSettingHandler } from "./settings-handler";

export class TTSHandler {
  private static currentAudio: HTMLAudioElement | null = null;
  private static currentObjectUrl: string | null = null;
  private static currentButton: HTMLButtonElement | null = null;

  static attachReadAloudButtons(app: SheetLikeApp, html: JQuery<HTMLElement> | HTMLElement): void {
    const system = TranslateAllSettingHandler.getSetting("translate-all", "targetSystem");
    if (system !== SupportedSystems.PATHFINDER2E) return;

    const enabled = TranslateAllSettingHandler.getSetting("translate-all", "ttsEnabled");
    if (!enabled) return;

    const root = TTSHandler.resolveRootElement(app, html);
    if (!root) return;

    const paragraphs = root.querySelectorAll<HTMLElement>("p.read-aloud");
    paragraphs.forEach((p) => TTSHandler.injectButton(p));
  }

  private static injectButton(paragraph: HTMLElement): void {
    if (paragraph.querySelector("button.translate-all-tts-btn")) return;

    TTSHandler.ensureStyles();

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "translate-all-tts-btn";
    btn.title = "Read aloud (TTS)";
    btn.setAttribute("aria-label", "Read aloud");
    btn.innerHTML = '<i class="fas fa-volume-up"></i>';

    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      const state = btn.dataset.state ?? "idle";

      if (state === "loading") {
        TTSHandler.stopCurrent();
        TTSHandler.setButtonState(btn, "idle");
        return;
      }

      if (state === "playing" && TTSHandler.currentAudio && TTSHandler.currentButton === btn) {
        TTSHandler.currentAudio.pause();
        TTSHandler.setButtonState(btn, "paused");
        return;
      }

      if (state === "paused" && TTSHandler.currentAudio && TTSHandler.currentButton === btn) {
        try {
          await TTSHandler.currentAudio.play();
          TTSHandler.setButtonState(btn, "playing");
        } catch (error) {
          ui?.notifications?.error(`TTS playback failed. ${error}`);
          TTSHandler.setButtonState(btn, "idle");
        }
        return;
      }

      const text = TTSHandler.extractText(paragraph);
      if (!text) {
        ui?.notifications?.warn("No text found to read aloud.");
        return;
      }

      TTSHandler.stopCurrent();
      TTSHandler.setButtonState(btn, "loading");
      try {
        const audio = await TTSHandler.synthesize(text);
        if (!audio) {
          TTSHandler.setButtonState(btn, "idle");
          return;
        }

        TTSHandler.currentButton = btn;
        audio.addEventListener("ended", () => TTSHandler.setButtonState(btn, "idle"));
        audio.addEventListener("error", () => TTSHandler.setButtonState(btn, "idle"));
        TTSHandler.setButtonState(btn, "playing");
        await audio.play();
      } catch (error) {
        ui?.notifications?.error(`TTS playback failed. ${error}`);
        TTSHandler.setButtonState(btn, "idle");
      }
    });

    paragraph.appendChild(btn);
  }

  private static extractText(paragraph: HTMLElement): string {
    const clone = paragraph.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("button.translate-all-tts-btn").forEach((b) => b.remove());
    return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  private static async synthesize(text: string): Promise<HTMLAudioElement | null> {
    const ttsEndpoint = TranslateAllSettingHandler.getSetting("translate-all", "ttsApiEndpoint");
    const ttsKey = TranslateAllSettingHandler.getSetting("translate-all", "ttsApiKey");
    const apiEndpoint = ttsEndpoint?.trim() || TranslateAllSettingHandler.getSetting("translate-all", "apiEndpoint");
    const apiKey = ttsKey?.trim() || TranslateAllSettingHandler.getSetting("translate-all", "apiKey");
    const model = TranslateAllSettingHandler.getSetting("translate-all", "ttsModel");
    const voice = TranslateAllSettingHandler.getSetting("translate-all", "ttsVoice");
    const instructions = TranslateAllSettingHandler.getSetting("translate-all", "ttsInstructions")?.trim();

    if (!apiEndpoint || !apiKey) {
      ui?.notifications?.error("TTS endpoint or API key is not configured.");
      return null;
    }

    const body: Record<string, unknown> = {
      model,
      voice,
      input: text,
      response_format: "mp3",
    };
    if (instructions) body.instructions = instructions;

    let response: Response | undefined;
    try {
      response = await fetch(`${apiEndpoint.replace(/\/+$/, "")}/audio/speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      ui?.notifications?.error(`TTS API call failed. ${error}`);
      return null;
    }

    if (!response?.ok) {
      const detail = response ? `${response.status} ${response.statusText}` : "no response";
      ui?.notifications?.error(`TTS API call failed (${detail}).`);
      return null;
    }

    const blob = await response.blob();
    TTSHandler.stopCurrent();

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    TTSHandler.currentAudio = audio;
    TTSHandler.currentObjectUrl = url;

    audio.addEventListener("ended", () => TTSHandler.cleanup(audio));
    audio.addEventListener("error", () => TTSHandler.cleanup(audio));

    return audio;
  }

  private static stopCurrent(): void {
    if (!TTSHandler.currentAudio) return;
    try {
      TTSHandler.currentAudio.pause();
      TTSHandler.currentAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
    if (TTSHandler.currentButton) {
      TTSHandler.setButtonState(TTSHandler.currentButton, "idle");
    }
    TTSHandler.cleanup(TTSHandler.currentAudio);
  }

  private static cleanup(audio: HTMLAudioElement): void {
    if (TTSHandler.currentAudio !== audio) return;
    if (TTSHandler.currentObjectUrl) {
      URL.revokeObjectURL(TTSHandler.currentObjectUrl);
      TTSHandler.currentObjectUrl = null;
    }
    TTSHandler.currentAudio = null;
    TTSHandler.currentButton = null;
  }

  private static setButtonState(btn: HTMLButtonElement, state: "idle" | "loading" | "playing" | "paused"): void {
    btn.dataset.state = state;
    btn.disabled = false;
    if (state === "loading") {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      btn.title = "Loading… click to cancel";
    } else if (state === "playing") {
      btn.innerHTML = '<i class="fas fa-pause"></i>';
      btn.title = "Pause playback";
    } else if (state === "paused") {
      btn.innerHTML = '<i class="fas fa-play"></i>';
      btn.title = "Resume playback";
    } else {
      btn.innerHTML = '<i class="fas fa-volume-up"></i>';
      btn.title = "Read aloud (TTS)";
    }
  }

  private static resolveRootElement(app: SheetLikeApp, html: JQuery<HTMLElement> | HTMLElement): HTMLElement | null {
    if (html instanceof HTMLElement) return html;
    if (TTSHandler.hasHTMLElementAtZeroIndex(html)) return html[0];
    if (app.element instanceof HTMLElement) return app.element;
    if (TTSHandler.hasHTMLElementAtZeroIndex(app.element)) return app.element[0];
    return null;
  }

  private static hasHTMLElementAtZeroIndex(value: unknown): value is { 0: HTMLElement } {
    if (!value || typeof value !== "object") return false;
    return Reflect.get(value, 0) instanceof HTMLElement;
  }

  private static ensureStyles(): void {
    if (document.getElementById("translate-all-tts-style")) return;
    const style = document.createElement("style");
    style.id = "translate-all-tts-style";
    style.textContent = `
      button.translate-all-tts-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        margin-left: 6px;
        padding: 0;
        border: 1px solid var(--color-border-light-tertiary, #999);
        border-radius: 4px;
        background: rgba(0,0,0,0.05);
        cursor: pointer;
        vertical-align: middle;
        line-height: 1;
      }
      button.translate-all-tts-btn:hover {
        background: rgba(0,0,0,0.12);
      }
      button.translate-all-tts-btn i {
        font-size: 11px;
      }
    `;
    document.head.append(style);
  }
}
