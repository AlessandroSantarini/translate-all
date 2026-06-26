import { DataHandler } from "handlers/data-handler";
import { HTMLHandler } from "handlers/html-handler";
import { TranslateAllSettingHandler } from "handlers/settings-handler";
import { TTSHandler } from "handlers/tts-handler";
import { SheetLikeApp, SupportedEntries } from "types";

interface AppWithDocumentName {
  document?: {
    documentName?: string;
  };
}

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return !!value && typeof value === "object";
}

function isSheetLikeApp(value: unknown): value is SheetLikeApp {
  if (!isObject(value)) return false;
  return typeof Reflect.get(value, "render") === "function" && typeof Reflect.get(value, "close") === "function";
}

function hasDocumentName(value: unknown): value is AppWithDocumentName {
  if (!isObject(value)) return false;
  const document = Reflect.get(value, "document");
  if (!isObject(document)) return false;
  const documentName = Reflect.get(document, "documentName");
  return typeof documentName === "string";
}

Hooks.once("init", async () => {
  if (!game.settings) {
    ui?.notifications?.error(`Game settings are not available. This module requires Foundry VTT version 10 or later.`);
    return;
  }
  const settingHandler = new TranslateAllSettingHandler();
  await settingHandler.init();
});

Hooks.on("renderItemSheet", async (app: ItemSheet, html: JQuery<HTMLElement>) => {
  DataHandler.getTranslatedDescription(app, html, SupportedEntries.ITEM, HTMLHandler.translateApp);
  TTSHandler.attachReadAloudButtons(app, html);
});

Hooks.on("renderItemSheet5e", async (app: ItemSheet, html: JQuery<HTMLElement>) => {
  DataHandler.getTranslatedDescription(app, html, SupportedEntries.ITEM, HTMLHandler.translateApp);
  TTSHandler.attachReadAloudButtons(app, html);
});

Hooks.on("renderJournalEntryPageSheet", async (app: JournalPageSheet, html: JQuery<HTMLElement>) => {
  DataHandler.getTranslatedDescription(app, html, SupportedEntries.JOURNAL, HTMLHandler.translateApp);
  TTSHandler.attachReadAloudButtons(app, html);
});

Hooks.on("renderApplicationV2", async (app: unknown, html: HTMLElement) => {
  if (!isSheetLikeApp(app) || !hasDocumentName(app)) return;
  const documentName = app.document?.documentName;

  if (documentName === "Item") {
    DataHandler.getTranslatedDescription(app, html, SupportedEntries.ITEM, HTMLHandler.translateApp);
    TTSHandler.attachReadAloudButtons(app, html);
    return;
  }

  if (documentName === "JournalEntryPage") {
    DataHandler.getTranslatedDescription(app, html, SupportedEntries.JOURNAL, HTMLHandler.translateApp);
    TTSHandler.attachReadAloudButtons(app, html);
  }
});
