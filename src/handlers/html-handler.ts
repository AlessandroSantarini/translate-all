import { Translator } from "translator";
import { SupportedSystems } from "types";
import { TranslateAllSettingHandler } from "./settings-handler";

export class HTMLHandler {
  static async translateApp(
    app: JournalPageSheet | ItemSheet,
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
      const translated = await Translator.translate(description);
      if (!translated) {
        ui?.notifications?.error("Translation failed or returned empty.");
        return;
      }
      await HTMLHandler.updateDescription(app, translated, path);
    });

    header.append(btn);
  }

  private static resolveRootElement(
    app: JournalPageSheet | ItemSheet,
    html: JQuery<HTMLElement> | HTMLElement,
  ): HTMLElement | null {
    const htmlAny = html as any;

    if (html instanceof HTMLElement) return html;
    if (htmlAny?.[0] instanceof HTMLElement) return htmlAny[0];

    const appAny = app as any;
    if (appAny?.element instanceof HTMLElement) return appAny.element;
    if (appAny?.element?.[0] instanceof HTMLElement) return appAny.element[0];

    return null;
  }

  private static resolveHeaderContainer(root: HTMLElement): HTMLElement | null {
    const controls = root.querySelector<HTMLElement>(
      ".window-controls, .header-control, .window-header, .sheet-header",
    );

    if (controls) return controls;

    return root.querySelector<HTMLElement>("header");
  }

  private static async updateDescription(
    app: JournalPageSheet | ItemSheet,
    translation: string,
    path: string,
  ): Promise<void> {
    const system = TranslateAllSettingHandler.getSetting("translate-all", "targetSystem") as SupportedSystems;
    if (system === SupportedSystems.DND5E) {
      await this.update5eDescription(app, translation, path);
    } else if (system === SupportedSystems.PATHFINDER2E) {
      await this.updatePF2EDescription(app, translation, path);
    }
  }

  private static async update5eDescription(
    app: JournalPageSheet | ItemSheet,
    translation: string,
    path: string,
  ): Promise<void> {
    try {
      const appAny = app as any;
      const item = appAny.document ?? appAny.object;
      await item?.update({ [path]: translation });
      app.render(true);
      app.close();
    } catch (error) {
      ui?.notifications?.error(`Error updating item description: ${error}`);
    }
  }

  private static async updatePF2EDescription(
    app: JournalPageSheet | ItemSheet,
    translation: string,
    path: string,
  ): Promise<void> {
    const appAny = app as any;
    const item = appAny.object ?? appAny.document;

    try {
      if (path.includes("system")) {
        await item?.update({ [path]: translation });
      } else {
        await item?.updateSource?.({ [path]: translation });
      }
    } catch (error) {
      ui?.notifications?.error(`Error updating item description: ${error}`);
    }

    item?.render?.(true);
    await item?.sheet?.close?.();

    await app.render(true);
    await app.close();
  }
}
