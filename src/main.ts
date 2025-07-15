import { DataHandler } from "handlers/data-handler";
import { HTMLHandler } from "handlers/html-handler";
import { TranslateAllSettingHandler } from "handlers/settings-handler";
import { SupportedEntries, SupportedSystems } from "types";

Hooks.once("init", async () => {
  if (!game.settings) {
    ui?.notifications?.error(`Game settings are not available. This module requires Foundry VTT version 10 or later.`);
    return;
  }
  const settingHandler = new TranslateAllSettingHandler();
  await settingHandler.init();
});

Hooks.on("renderJournalPageSheet", async (app: JournalPageSheet, html: JQuery<HTMLElement>) => {
  DataHandler.getTranslatedDescription(app, html, SupportedEntries.JOURNAL, HTMLHandler.translateApp);
});

Hooks.on("renderItemSheet", async (app: ItemSheet, html: JQuery<HTMLElement>) => {
  DataHandler.getTranslatedDescription(app, html, SupportedEntries.ITEM, HTMLHandler.translateApp);
});

Hooks.on("renderItemSheet5e", async (app: ItemSheet, html: JQuery<HTMLElement>) => {
  DataHandler.getTranslatedDescription(app, html, SupportedEntries.ITEM, HTMLHandler.translateApp);
});

Hooks.on("renderJournalEntryPageSheet", async (app: JournalPageSheet, html: JQuery<HTMLElement>) => {
  const system = TranslateAllSettingHandler.getSetting("translate-all", "targetSystem") as SupportedSystems;
  if (system !== SupportedSystems.DND5E) {
    // eslint-disable-next-line no-console
    console.warn("This feature is only available for D&D 5E.");
    return;
  }
  DataHandler.getTranslatedDescription(app, html, SupportedEntries.JOURNAL, HTMLHandler.translateApp);
});
