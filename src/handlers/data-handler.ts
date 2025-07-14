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
    switch (system) {
      case SupportedSystems.PATHFINDER2E:
        return app.object.text.content || undefined;
      case SupportedSystems.DND5E:
        return (app?.options as any).document.text.content || undefined; // TODO: fix this type casting
      default:
        return undefined;
    }
  }

  static getDescriptionFromItem(app: ItemSheet, system: SupportedSystems): string | undefined {
    switch (system) {
      case SupportedSystems.PATHFINDER2E:
        return (app?.object?.system as any).description.value; // TODO: fix this type casting
      case SupportedSystems.DND5E:
        return (app?.options as any)?.document.system.description.value || undefined; // TODO: fix this type casting
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
      // Do not enable button to translate if there is no description
      return;
    }
    const path = DataHandler.getPathToUpdate(item);
    translateFN(app, html, description, path);
  }
}
