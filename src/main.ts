import { DataHandler } from "handlers/data-handler";
import { HTMLHandler } from "handlers/html-handler";
import { TranslateAllSettingHandler } from "handlers/settings-handler";
import { SupportedEntries } from "types";

Hooks.once("init", () => {
    if (!game.settings) {
        console.error("Game settings are not available. This module requires Foundry VTT version 10 or later.");
        return;
    }
    const settingHandler = new TranslateAllSettingHandler();
    settingHandler.init();
});

Hooks.on("renderJournalPageSheet", async (app: JournalPageSheet,
    html: JQuery<HTMLElement>,
    _data: Record<string, any>) => {
    DataHandler.getTranslatedDescription(app, html, SupportedEntries.JOURNAL, HTMLHandler.translateApp);
});

Hooks.on("renderItemSheet", async (app: ItemSheet,
    html: JQuery<HTMLElement>,
    _data: Record<string, any>) => {
    DataHandler.getTranslatedDescription(app, html, SupportedEntries.ITEM, HTMLHandler.translateApp);
});
