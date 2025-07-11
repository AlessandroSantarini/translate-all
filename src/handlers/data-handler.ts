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
    const item = app.object;
    switch (system) {
      case SupportedSystems.PATHFINDER2E:
      case SupportedSystems.DND5E:
        return item.text.content;
      default:
        return item.text.content;
    }
  }

  static getDescriptionFromItem(app: ItemSheet, system: SupportedSystems): string | undefined {
    switch (system) {
      case SupportedSystems.PATHFINDER2E:
        return (app.object.system as any).description.value; // TODO: fix this type casting
      case SupportedSystems.DND5E:
        return (app.options as any).document.system.description.value; // D&D 5E uses a different structure
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
    html: JQuery<HTMLElement>,
    item: SupportedEntries,
    translateFN: TranslateFunction,
  ) {
    const description = DataHandler.getDescription(app, item);
    if (!description) {
      ui?.notifications?.error("No description found for this journal page.");
      return;
    }
    const path = DataHandler.getPathToUpdate(item);
    translateFN(app, html, description, path);
  }
}
