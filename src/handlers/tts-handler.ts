import { SheetLikeApp, SupportedSystems } from "../types";
import { TranslateAllSettingHandler } from "./settings-handler";

type PlayState = "disabled" | "idle" | "loading" | "playing" | "paused";
type GenState = "idle" | "loading" | "regenerate";

interface FilePickerLike {
  browse(source: string, target: string, options?: object): Promise<{ files?: string[] }>;
  createDirectory(source: string, target: string, options?: object): Promise<unknown>;
  upload(source: string, path: string, file: File, body?: object, options?: object): Promise<unknown>;
}

export class TTSHandler {
  private static currentAudio: HTMLAudioElement | null = null;
  private static currentButton: HTMLButtonElement | null = null;

  static async attachReadAloudButtons(app: SheetLikeApp, html: JQuery<HTMLElement> | HTMLElement): Promise<void> {
    const system = TranslateAllSettingHandler.getSetting("translate-all", "targetSystem");
    if (system !== SupportedSystems.PATHFINDER2E) return;

    const enabled = TranslateAllSettingHandler.getSetting("translate-all", "ttsEnabled");
    if (!enabled) return;

    const root = TTSHandler.resolveRootElement(app, html);
    if (!root) return;

    const paragraphs = Array.from(root.querySelectorAll<HTMLElement>("p.read-aloud"));
    if (paragraphs.length === 0) return;

    TTSHandler.ensureStyles();

    const folder = TTSHandler.getFolderPath();
    const existing = await TTSHandler.listExistingFiles(folder);

    const voice = TranslateAllSettingHandler.getSetting("translate-all", "ttsVoice");
    const model = TranslateAllSettingHandler.getSetting("translate-all", "ttsModel");
    const instructions = TranslateAllSettingHandler.getSetting("translate-all", "ttsInstructions") ?? "";

    for (const p of paragraphs) {
      if (p.querySelector(".translate-all-tts-wrapper")) continue;
      const text = TTSHandler.extractText(p);
      if (!text) continue;
      const filename = `${await TTSHandler.computeHash(text, voice, model, instructions)}.mp3`;
      const url = existing.has(filename) ? TTSHandler.buildFileUrl(folder, filename) : null;
      TTSHandler.injectButtons(p, filename, url);
    }
  }

  private static injectButtons(paragraph: HTMLElement, filename: string, fileUrl: string | null): void {
    const wrapper = document.createElement("span");
    wrapper.className = "translate-all-tts-wrapper";

    const genBtn = document.createElement("button");
    genBtn.type = "button";
    genBtn.className = "translate-all-tts-btn translate-all-tts-gen-btn";
    TTSHandler.setGenButtonState(genBtn, fileUrl ? "regenerate" : "idle");

    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "translate-all-tts-btn translate-all-tts-play-btn";
    if (fileUrl) playBtn.dataset.audioSrc = fileUrl;
    TTSHandler.setPlayButtonState(playBtn, fileUrl ? "idle" : "disabled");

    genBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      await TTSHandler.handleGenerate(paragraph, filename, genBtn, playBtn);
    });

    playBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      await TTSHandler.handlePlay(playBtn);
    });

    wrapper.appendChild(genBtn);
    wrapper.appendChild(playBtn);
    paragraph.appendChild(wrapper);
  }

  private static async handleGenerate(
    paragraph: HTMLElement,
    filename: string,
    genBtn: HTMLButtonElement,
    playBtn: HTMLButtonElement,
  ): Promise<void> {
    if (genBtn.dataset.state === "loading") return;

    const text = TTSHandler.extractText(paragraph);
    if (!text) {
      ui?.notifications?.warn("No text found to read aloud.");
      return;
    }

    const fp = TTSHandler.getFilePicker();
    if (!fp) {
      ui?.notifications?.error("Foundry FilePicker is not available.");
      return;
    }

    const previousState: GenState = playBtn.dataset.audioSrc ? "regenerate" : "idle";
    TTSHandler.setGenButtonState(genBtn, "loading");

    try {
      const blob = await TTSHandler.synthesizeBlob(text);
      if (!blob) {
        TTSHandler.setGenButtonState(genBtn, previousState);
        return;
      }

      const folder = TTSHandler.getFolderPath();
      await TTSHandler.ensureFolder(folder);

      const file = new File([blob], filename, { type: blob.type || "audio/mpeg" });
      await fp.upload("data", folder, file, {}, { notify: false });

      const url = TTSHandler.buildFileUrl(folder, filename);
      playBtn.dataset.audioSrc = url;
      if (playBtn.dataset.state === "disabled") {
        TTSHandler.setPlayButtonState(playBtn, "idle");
      }
      TTSHandler.setGenButtonState(genBtn, "regenerate");
      ui?.notifications?.info(`TTS audio saved: ${folder}/${filename}`);
    } catch (error) {
      ui?.notifications?.error(`TTS generation failed. ${error}`);
      TTSHandler.setGenButtonState(genBtn, previousState);
    }
  }

  private static async handlePlay(playBtn: HTMLButtonElement): Promise<void> {
    const state = (playBtn.dataset.state ?? "disabled") as PlayState;
    if (state === "disabled" || state === "loading") return;

    const src = playBtn.dataset.audioSrc;
    if (!src) return;

    if (state === "playing" && TTSHandler.currentAudio && TTSHandler.currentButton === playBtn) {
      TTSHandler.currentAudio.pause();
      TTSHandler.setPlayButtonState(playBtn, "paused");
      return;
    }

    if (state === "paused" && TTSHandler.currentAudio && TTSHandler.currentButton === playBtn) {
      try {
        await TTSHandler.currentAudio.play();
        TTSHandler.setPlayButtonState(playBtn, "playing");
      } catch (error) {
        ui?.notifications?.error(`TTS playback failed. ${error}`);
        TTSHandler.setPlayButtonState(playBtn, "idle");
      }
      return;
    }

    TTSHandler.stopCurrent();

    const audio = new Audio(src);
    TTSHandler.currentAudio = audio;
    TTSHandler.currentButton = playBtn;

    audio.addEventListener("ended", () => {
      TTSHandler.setPlayButtonState(playBtn, "idle");
      TTSHandler.cleanup(audio);
    });
    audio.addEventListener("error", () => {
      ui?.notifications?.error("Failed to load TTS audio file.");
      TTSHandler.setPlayButtonState(playBtn, "idle");
      TTSHandler.cleanup(audio);
    });

    TTSHandler.setPlayButtonState(playBtn, "playing");
    try {
      await audio.play();
    } catch (error) {
      ui?.notifications?.error(`TTS playback failed. ${error}`);
      TTSHandler.setPlayButtonState(playBtn, "idle");
      TTSHandler.cleanup(audio);
    }
  }

  private static stopCurrent(): void {
    if (!TTSHandler.currentAudio) return;
    try {
      TTSHandler.currentAudio.pause();
      TTSHandler.currentAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
    if (TTSHandler.currentButton && TTSHandler.currentButton.dataset.state !== "disabled") {
      TTSHandler.setPlayButtonState(TTSHandler.currentButton, "idle");
    }
    TTSHandler.cleanup(TTSHandler.currentAudio);
  }

  private static cleanup(audio: HTMLAudioElement): void {
    if (TTSHandler.currentAudio !== audio) return;
    TTSHandler.currentAudio = null;
    TTSHandler.currentButton = null;
  }

  private static extractText(paragraph: HTMLElement): string {
    const clone = paragraph.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".translate-all-tts-wrapper").forEach((b) => b.remove());
    return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  private static async synthesizeBlob(text: string): Promise<Blob | null> {
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

    return await response.blob();
  }

  private static getFolderPath(): string {
    const raw = TranslateAllSettingHandler.getSetting("translate-all", "ttsFolderPath");
    const trimmed = (raw ?? "").trim().replace(/^\/+|\/+$/g, "");
    return trimmed || "translateAll/textToSpeech";
  }

  private static buildFileUrl(folder: string, filename: string): string {
    const path = `${folder}/${filename}`;
    const route = (globalThis as { foundry?: { utils?: { getRoute?: (p: string) => string } } }).foundry?.utils
      ?.getRoute;
    return route ? route(path) : `/${path}`;
  }

  private static getFilePicker(): FilePickerLike | undefined {
    const g = globalThis as {
      FilePicker?: FilePickerLike;
      foundry?: { applications?: { apps?: { FilePicker?: { implementation?: FilePickerLike } } } };
    };
    return g.FilePicker ?? g.foundry?.applications?.apps?.FilePicker?.implementation;
  }

  private static async ensureFolder(folder: string): Promise<void> {
    const fp = TTSHandler.getFilePicker();
    if (!fp) throw new Error("FilePicker is not available.");

    try {
      await fp.browse("data", folder);
      return;
    } catch {
      /* fallthrough — folder probably doesn't exist */
    }

    const parts = folder.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      try {
        await fp.createDirectory("data", current, {});
      } catch {
        /* already exists or no permission — let upload surface the real error */
      }
    }
  }

  private static async listExistingFiles(folder: string): Promise<Set<string>> {
    const fp = TTSHandler.getFilePicker();
    if (!fp) return new Set();
    try {
      const result = await fp.browse("data", folder);
      const files = result?.files ?? [];
      return new Set(files.map((f) => decodeURIComponent(f.split("/").pop() ?? "")));
    } catch {
      return new Set();
    }
  }

  private static async computeHash(...parts: string[]): Promise<string> {
    const input = parts.join("\u0001");
    const data = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  }

  private static setGenButtonState(btn: HTMLButtonElement, state: GenState): void {
    btn.dataset.state = state;
    btn.disabled = state === "loading";
    if (state === "loading") {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      btn.title = "Generating audio…";
    } else if (state === "regenerate") {
      btn.innerHTML = '<i class="fas fa-redo"></i>';
      btn.title = "Regenerate audio";
      btn.setAttribute("aria-label", "Regenerate TTS audio");
    } else {
      btn.innerHTML = '<i class="fas fa-download"></i>';
      btn.title = "Generate audio file";
      btn.setAttribute("aria-label", "Generate TTS audio");
    }
  }

  private static setPlayButtonState(btn: HTMLButtonElement, state: PlayState): void {
    btn.dataset.state = state;
    btn.disabled = state === "disabled";
    if (state === "disabled") {
      btn.innerHTML = '<i class="fas fa-volume-up"></i>';
      btn.title = "No audio yet — generate it first";
      btn.setAttribute("aria-label", "Play TTS (unavailable)");
    } else if (state === "playing") {
      btn.innerHTML = '<i class="fas fa-pause"></i>';
      btn.title = "Pause playback";
    } else if (state === "paused") {
      btn.innerHTML = '<i class="fas fa-play"></i>';
      btn.title = "Resume playback";
    } else {
      btn.innerHTML = '<i class="fas fa-volume-up"></i>';
      btn.title = "Play TTS audio";
      btn.setAttribute("aria-label", "Play TTS audio");
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
      .translate-all-tts-wrapper {
        display: inline-flex;
        gap: 4px;
        margin-left: 6px;
        vertical-align: middle;
      }
      button.translate-all-tts-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        padding: 0;
        border: 1px solid var(--color-border-light-tertiary, #999);
        border-radius: 4px;
        background: rgba(0,0,0,0.05);
        cursor: pointer;
        line-height: 1;
      }
      button.translate-all-tts-btn:hover:not(:disabled) {
        background: rgba(0,0,0,0.12);
      }
      button.translate-all-tts-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      button.translate-all-tts-btn i {
        font-size: 11px;
      }
    `;
    document.head.append(style);
  }
}
