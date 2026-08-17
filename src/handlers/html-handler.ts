import { Translator } from "translator";
import { OutputModes, SheetLikeApp, SupportedSystems } from "types";
import { TranslateAllSettingHandler } from "./settings-handler";

export class HTMLHandler {
  static async translateApp(
    app: SheetLikeApp,
    html: JQuery<HTMLElement> | HTMLElement,
    description: string,
    path: string,
  ): Promise<void> {
    const root = HTMLHandler.resolveRootElement(app, html);
    if (!root) return;

    const header = HTMLHandler.resolveHeaderContainer(root);
    if (!header) return;

    if (header.querySelector("button.translate-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "translate-btn";
    btn.style.marginLeft = "8px";
    btn.textContent = "Translate Description";

    btn.addEventListener("click", async () => {
      if (btn.dataset.loading === "true") return;

      HTMLHandler.setButtonLoadingState(btn, true);

      try {
        const translated = await Translator.translate(description);
        if (!translated) {
          ui?.notifications?.error("Translation failed or returned empty.");
          return;
        }

        const mode = TranslateAllSettingHandler.getSetting("translate-all", "outputMode");
        await HTMLHandler.persistTranslation(app, mode, translated, description, path);
      } finally {
        HTMLHandler.setButtonLoadingState(btn, false);
      }
    });

    header.append(btn);
  }

  private static resolveRootElement(app: SheetLikeApp, html: JQuery<HTMLElement> | HTMLElement): HTMLElement | null {
    if (html instanceof HTMLElement) return html;
    if (HTMLHandler.hasHTMLElementAtZeroIndex(html)) return html[0];

    if (app.element instanceof HTMLElement) return app.element;
    if (HTMLHandler.hasHTMLElementAtZeroIndex(app.element)) return app.element[0];

    return null;
  }

  private static hasHTMLElementAtZeroIndex(value: unknown): value is { 0: HTMLElement } {
    if (!value || typeof value !== "object") return false;
    return Reflect.get(value, 0) instanceof HTMLElement;
  }

  private static resolveHeaderContainer(root: HTMLElement): HTMLElement | null {
    const controls = root.querySelector<HTMLElement>(
      ".window-controls, .header-control, .window-header, .sheet-header",
    );

    if (controls) return controls;

    return root.querySelector<HTMLElement>("header");
  }

  private static setButtonLoadingState(button: HTMLButtonElement, isLoading: boolean): void {
    if (isLoading) {
      button.dataset.loading = "true";
      button.disabled = true;
      button.innerHTML =
        '<span style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-bottom-color:transparent;border-radius:50%;margin-right:6px;vertical-align:middle;animation:translate-all-spin 0.8s linear infinite;"></span>Translating...';

      HTMLHandler.ensureSpinnerStyles();
      return;
    }

    button.dataset.loading = "false";
    button.disabled = false;
    button.textContent = "Translate Description";
  }

  private static ensureSpinnerStyles(): void {
    if (document.getElementById("translate-all-spinner-style")) return;

    const style = document.createElement("style");
    style.id = "translate-all-spinner-style";
    style.textContent = `
      @keyframes translate-all-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;

    document.head.append(style);
  }

  // Single entry point for persisting a translation. Every output mode goes
  // through here; only `replace` (and the append/prepend composites, which
  // keep the original inside the same field) write to the source document.
  private static async persistTranslation(
    app: SheetLikeApp,
    mode: OutputModes,
    translation: string,
    original: string,
    path: string,
  ): Promise<void> {
    if (mode === OutputModes.DUPLICATE) {
      await HTMLHandler.createTranslatedCopy(app, translation, path);
      return;
    }

    await HTMLHandler.updateDescription(app, HTMLHandler.composeOutput(mode, original, translation), path);
  }

  private static composeOutput(mode: OutputModes, original: string, translation: string): string {
    switch (mode) {
      case OutputModes.APPEND:
        return `${original}\n<hr />\n${translation}`;
      case OutputModes.PREPEND:
        return `${translation}\n<hr />\n${original}`;
      default:
        return translation;
    }
  }

  private static async createTranslatedCopy(app: SheetLikeApp, translation: string, path: string): Promise<void> {
    const document = app.document ?? app.object;
    if (!document?.clone) {
      ui?.notifications?.error("This document cannot be duplicated.");
      return;
    }

    const language = TranslateAllSettingHandler.getSetting("translate-all", "targetLanguage");
    const data: Record<string, unknown> = { [path]: translation };
    if (typeof document.name === "string" && document.name) {
      data.name = `${document.name} (${language})`;
    }

    try {
      // clone with save creates a sibling document: same folder for world
      // documents, same parent for embedded ones (e.g. journal pages).
      await document.clone(data, { save: true });
      ui?.notifications?.info("Created translated copy.");
    } catch (error) {
      ui?.notifications?.error(`Error creating translated copy: ${error}`);
    }
  }

  private static async updateDescription(app: SheetLikeApp, translation: string, path: string): Promise<void> {
    const system = TranslateAllSettingHandler.getSetting("translate-all", "targetSystem");
    if (system === SupportedSystems.DND5E) {
      await this.update5eDescription(app, translation, path);
    } else if (system === SupportedSystems.PATHFINDER2E) {
      await this.updatePF2EDescription(app, translation, path);
    }
  }

  private static async update5eDescription(app: SheetLikeApp, translation: string, path: string): Promise<void> {
    try {
      const item = app.document ?? app.object;
      await item?.update?.({ [path]: translation });
      app.render(true);
      app.close();
    } catch (error) {
      ui?.notifications?.error(`Error updating item description: ${error}`);
    }
  }

  private static async updatePF2EDescription(app: SheetLikeApp, translation: string, path: string): Promise<void> {
    const item = app.object ?? app.document;

    try {
      // update() persists through the server. updateSource() only mutated the
      // in-memory document, so journal translations were lost on reload.
      await item?.update?.({ [path]: translation });
    } catch (error) {
      ui?.notifications?.error(`Error updating item description: ${error}`);
    }

    item?.render?.(true);
    await item?.sheet?.close?.();
  }
}
