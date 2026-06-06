import {
  Directories,
  SheetLikeApp,
  SheetLikeDocument,
  SupportedEntries,
  SupportedSystems,
  TranslateFunction,
} from "types";
import { TranslateAllSettingHandler } from "./settings-handler";

export class DataHandler {
  static getDescription(app: SheetLikeApp, type: SupportedEntries): string | undefined {
    const system = TranslateAllSettingHandler.getSetting("translate-all", "targetSystem");

    if (type === SupportedEntries.JOURNAL) {
      return DataHandler.getDescriptionFromJournal(app, system);
    } else if (type === SupportedEntries.ITEM) {
      return DataHandler.getDescriptionFromItem(app, system);
    }

    return undefined;
  }

  static getDescriptionFromJournal(app: SheetLikeApp, system: SupportedSystems): string | undefined {
    const document = DataHandler.resolveDocument(app);

    switch (system) {
      case SupportedSystems.PATHFINDER2E:
        return document?.text?.content || undefined;
      case SupportedSystems.DND5E:
        return document?.text?.content || undefined;
      default:
        return undefined;
    }
  }

  static getDescriptionFromItem(app: SheetLikeApp, system: SupportedSystems): string | undefined {
    const document = DataHandler.resolveDocument(app);

    switch (system) {
      case SupportedSystems.PATHFINDER2E:
        return DataHandler.getDescriptionValueFromSystem(document);
      case SupportedSystems.DND5E:
        return DataHandler.getDescriptionValueFromSystem(document);
      default:
        return undefined;
    }
  }

  static getPathToUpdate(item: SupportedEntries): string {
    const system = TranslateAllSettingHandler.getSetting("translate-all", "targetSystem");
    return Directories[system][item];
  }

  static async getTranslatedDescription(
    app: SheetLikeApp,
    html: JQuery<HTMLElement> | HTMLElement,
    item: SupportedEntries,
    translateFN: TranslateFunction,
  ) {
    const description = DataHandler.getDescription(app, item);
    if (!description) {
      // Do not enable button to translate if there is no description
      return;
    }
    const path = DataHandler.getPathToUpdate(item);
    translateFN(app, html, description, path);
  }

  private static resolveDocument(app: SheetLikeApp): SheetLikeDocument | undefined {
    if (app.document) return app.document;
    if (app.object) return app.object;
    const optionsDoc = app.options && Reflect.get(app.options, "document");
    return optionsDoc instanceof Object ? (optionsDoc as SheetLikeDocument) : undefined;
  }

  private static getDescriptionValueFromSystem(document?: SheetLikeDocument): string | undefined {
    const system = document?.system;
    if (!system || typeof system !== "object") return undefined;

    const description = Reflect.get(system, "description");
    if (!description || typeof description !== "object") return undefined;

    const value = Reflect.get(description, "value");
    return typeof value === "string" ? value : undefined;
  }
}
