import { Directories, SupportedEntries, SupportedSystems, TranslateFunction } from "types";
import { TranslateAllSettingHandler } from "./settings-handler";

export class DataHandler {
  static getDescription(app: JournalPageSheet | ItemSheet, type: SupportedEntries) {
    const system = TranslateAllSettingHandler.getSetting("translate-all", "targetSystem") as SupportedSystems;

    if (type === SupportedEntries.JOURNAL) {
      return DataHandler.getDescriptionFromJournal(app as JournalPageSheet, system);
    } else if (type === SupportedEntries.ITEM) {
      return DataHandler.getDescriptionFromItem(app as ItemSheet, system);
    }

    return undefined;
  }

  static getDescriptionFromJournal(app: JournalPageSheet, system: SupportedSystems): string | undefined {
    const appAny = app as any;
    const document = appAny?.document ?? appAny?.object ?? appAny?.options?.document;

    switch (system) {
      case SupportedSystems.PATHFINDER2E:
        return document?.text?.content || undefined;
      case SupportedSystems.DND5E:
        return document?.text?.content || undefined;
      default:
        return undefined;
    }
  }

  static getDescriptionFromItem(app: ItemSheet, system: SupportedSystems): string | undefined {
    const appAny = app as any;
    const document = appAny?.document ?? appAny?.object ?? appAny?.options?.document;

    switch (system) {
      case SupportedSystems.PATHFINDER2E:
        return document?.system?.description?.value || undefined;
      case SupportedSystems.DND5E:
        return document?.system?.description?.value || undefined;
      default:
        return undefined;
    }
  }

  static getPathToUpdate(item: SupportedEntries): string {
    const system = TranslateAllSettingHandler.getSetting("translate-all", "targetSystem") as SupportedSystems;
    return Directories[system][item];
  }

  static async getTranslatedDescription(
    app: JournalPageSheet | ItemSheet,
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
}
