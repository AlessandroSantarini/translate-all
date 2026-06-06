import { Translator } from "translator";
import { SheetLikeApp, SupportedSystems } from "types";
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

        await HTMLHandler.updateDescription(app, translated, path);
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
      if (path.includes("system")) {
        await item?.update?.({ [path]: translation });
      } else {
        await item?.updateSource?.({ [path]: translation });
      }
    } catch (error) {
      ui?.notifications?.error(`Error updating item description: ${error}`);
    }

    item?.render?.(true);
    await item?.sheet?.close?.();
  }
}
