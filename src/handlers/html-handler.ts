import { Translator } from "translator";
import { OutputModes, SheetLikeApp, SupportedSystems } from "types";
import { TranslateAllSettingHandler } from "./settings-handler";
import { format, localize } from "../util/i18n";

export class HTMLHandler {
  static async translateApp(
    app: SheetLikeApp,
    html: JQuery<HTMLElement> | HTMLElement,
    description: string,
    path: string,
  ): Promise<void> {
    // Checked before anything is injected, so users below the configured role
    // never see the button rather than seeing it fail.
    if (!TranslateAllSettingHandler.canUserTranslate()) return;

    // A journal page renders twice: read-only inside its entry, and again in
    // the page editor. Only the editor is offered the button, so the control
    // sits in the same place for every document type.
    if (HTMLHandler.isReadOnlyView(app)) return;

    const root = HTMLHandler.resolveRootElement(app, html);
    if (!root) return;

    // Nothing stored yet and no editor to read from means there is nothing to
    // translate, so the button is not worth showing.
    if (!description && !HTMLHandler.resolveEditorElement(root, path)) return;

    const header = HTMLHandler.resolveHeaderContainer(root);
    if (!header) return;

    if (header.querySelector("button.translate-btn")) return;

    HTMLHandler.ensureButtonStyles();

    const label = game.i18n?.localize("translate-all.button.translate.label") ?? "Translate";
    const tooltip = game.i18n?.localize("translate-all.button.translate.tooltip") ?? label;

    const btn = document.createElement("button");
    btn.type = "button";
    // header-control lets Foundry's own AppV2 header styling absorb the button.
    btn.className = "translate-btn header-control";
    btn.setAttribute("aria-label", label);
    btn.setAttribute("data-tooltip", tooltip);
    btn.title = tooltip;
    btn.innerHTML = '<i class="fa-solid fa-language" aria-hidden="true"></i>';

    btn.addEventListener("click", async () => {
      if (btn.dataset.loading === "true") return;

      // Read at click time rather than at injection time: the editor may have
      // been opened, or its contents changed, since the button was added.
      const editorValue = HTMLHandler.readEditorValue(root, path);
      const source = editorValue ?? description;
      if (!source) {
        ui?.notifications?.warn(localize("translate-all.notice.translate.nothingToTranslate"));
        return;
      }

      HTMLHandler.setButtonLoadingState(btn, true);

      try {
        // Translator.translate already reported the specific reason on failure.
        const translated = await Translator.translate(source);
        if (!translated) return;

        const mode = TranslateAllSettingHandler.getSetting("translate-all", "outputMode");

        // In duplicate mode the copy takes the translation and the original
        // keeps the source, but text read from an open editor is not stored
        // anywhere yet. It gets the same implicit save the other modes give
        // it by overwriting the field; without it, the source of the
        // translation would exist in no document at all.
        if (mode === OutputModes.DUPLICATE && editorValue !== undefined) {
          const saved = await HTMLHandler.saveEditorSource(app, editorValue, path);
          if (!saved) return;
        }

        await HTMLHandler.persistTranslation(app, mode, translated, source, path);
      } finally {
        HTMLHandler.setButtonLoadingState(btn, false);
      }
    });

    HTMLHandler.insertBeforeCloseControl(header, btn);
  }

  // Places the button to the left of Foundry's close control so it does not
  // sit past the window's X. Falls back to appending when no close control is
  // recognised (older AppV1 layouts).
  private static insertBeforeCloseControl(header: HTMLElement, btn: HTMLButtonElement): void {
    const close = header.querySelector<HTMLElement>(
      '[data-action="close"], button.header-control.close, a.close, .header-button.close',
    );
    if (close && close.parentElement === header) {
      header.insertBefore(btn, close);
      return;
    }
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

  // The form control the sheet uses to edit the field being translated, if the
  // sheet exposes one. Foundry names it after the document path, so the same
  // lookup covers a journal page editor and an item description editor.
  private static resolveEditorElement(root: HTMLElement, path: string): Element | null {
    return root.querySelector(`[name="${path}"]`);
  }

  // Text being edited is not yet text stored in the document, and the button
  // now lives inside the editing view, so the editor wins over the document.
  private static readEditorValue(root: HTMLElement, path: string): string | undefined {
    const editor = HTMLHandler.resolveEditorElement(root, path);
    if (!editor) return undefined;

    const value = Reflect.get(editor, "value");
    if (typeof value !== "string" || !value.trim()) return undefined;

    return value;
  }

  // A sheet rendered for reading only: a journal page embedded in its entry is
  // rendered in view mode, without a window frame, and an older page sheet is
  // rendered as not editable.
  private static isReadOnlyView(app: SheetLikeApp): boolean {
    const options = app.options;
    if (!options) return false;

    if (Reflect.get(options, "mode") === "view") return true;
    if (Reflect.get(options, "editable") === false) return true;

    const windowOptions = Reflect.get(options, "window");
    if (!windowOptions || typeof windowOptions !== "object") return false;
    return Reflect.get(windowOptions, "frame") === false;
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
      const loading = game.i18n?.localize("translate-all.button.translate.loading") ?? "Translating…";
      button.setAttribute("aria-label", loading);
      button.setAttribute("data-tooltip", loading);
      button.title = loading;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>';
      return;
    }

    const label = game.i18n?.localize("translate-all.button.translate.label") ?? "Translate";
    const tooltip = game.i18n?.localize("translate-all.button.translate.tooltip") ?? label;
    button.dataset.loading = "false";
    button.disabled = false;
    button.setAttribute("aria-label", label);
    button.setAttribute("data-tooltip", tooltip);
    button.title = tooltip;
    button.innerHTML = '<i class="fa-solid fa-language" aria-hidden="true"></i>';
  }

  private static ensureButtonStyles(): void {
    if (document.getElementById("translate-all-button-style")) return;

    const style = document.createElement("style");
    style.id = "translate-all-button-style";
    // Blends with AppV2 header controls without overriding Foundry's theme:
    // transparent background, inherited color, subtle hover.
    style.textContent = `
      button.translate-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--header-control-size, 28px);
        height: var(--header-control-size, 28px);
        padding: 0;
        margin-inline-start: 4px;
        border: none;
        background: transparent;
        color: inherit;
        border-radius: 4px;
        cursor: pointer;
        line-height: 1;
        font-size: 14px;
        opacity: 0.85;
      }
      button.translate-btn:hover:not(:disabled) {
        opacity: 1;
        background: rgba(255, 255, 255, 0.08);
      }
      button.translate-btn:disabled {
        opacity: 0.6;
        cursor: default;
      }
      button.translate-btn > i {
        pointer-events: none;
      }
    `;

    document.head.append(style);
  }

  // Writes the editor's text to the source document without closing the
  // sheet. Returns false when the write fails, so the caller can stop before
  // a step that assumes the source text is safely stored.
  private static async saveEditorSource(app: SheetLikeApp, source: string, path: string): Promise<boolean> {
    try {
      const document = app.document ?? app.object;
      await document?.update?.({ [path]: source });
      return true;
    } catch (error) {
      ui?.notifications?.error(format("translate-all.notice.copy.saveSourceFailed", { error: String(error) }));
      return false;
    }
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
      ui?.notifications?.error(localize("translate-all.notice.copy.unsupported"));
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
      ui?.notifications?.info(localize("translate-all.notice.copy.created"));
    } catch (error) {
      ui?.notifications?.error(format("translate-all.notice.copy.failed", { error: String(error) }));
    }
  }

  private static async updateDescription(app: SheetLikeApp, translation: string, path: string): Promise<void> {
    // The sheet is closed before the document is written, not after. Foundry
    // saves an open editor while the sheet closes, and that save carries the
    // pre-translation text, so writing first would put the original back.
    await HTMLHandler.closeSheet(app);

    const system = TranslateAllSettingHandler.getSetting("translate-all", "targetSystem");
    if (system === SupportedSystems.DND5E) {
      await this.update5eDescription(app, translation, path);
    } else if (system === SupportedSystems.PATHFINDER2E) {
      await this.updatePF2EDescription(app, translation, path);
    }
  }

  private static async closeSheet(app: SheetLikeApp): Promise<void> {
    try {
      await app.close();
    } catch (error) {
      ui?.notifications?.warn(format("translate-all.notice.translate.closeSheetFailed", { error: String(error) }));
    }
  }

  private static async update5eDescription(app: SheetLikeApp, translation: string, path: string): Promise<void> {
    try {
      const item = app.document ?? app.object;
      await item?.update?.({ [path]: translation });
    } catch (error) {
      ui?.notifications?.error(format("translate-all.notice.translate.saveFailed", { error: String(error) }));
    }
  }

  private static async updatePF2EDescription(app: SheetLikeApp, translation: string, path: string): Promise<void> {
    const item = app.object ?? app.document;

    try {
      // update() persists through the server. updateSource() only mutated the
      // in-memory document, so journal translations were lost on reload.
      await item?.update?.({ [path]: translation });
    } catch (error) {
      ui?.notifications?.error(format("translate-all.notice.translate.saveFailed", { error: String(error) }));
    }
  }
}
