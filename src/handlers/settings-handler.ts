import { KeyFor, SupportedSystems, TranslateAllNamespace } from "../types";

export class TranslateAllSettingHandler {
    gameSettings: Game["settings"] = game.settings!;
    readonly settings = {
        targetSystem: {
            name: "translate-all.settings.game.system.name",
            hint: "translate-all.settings.game.system.hint",
            scope: "world",
            config: true,
            type: String,
            default: SupportedSystems.PATHFINDER2E // Default to Pathfinder 2e
        },
        apiKey: {
            name: "translate-all.settings.apiKey.name",
            hint: "translate-all.settings.apiKey.hint",
            scope: "world",
            config: true,
            type: String,
            default: "",
            masked: true
        },
        targetLanguage: {
            name: "translate-all.settings.language.name",
            hint: "translate-all.settings.language.hint",
            scope: "world",
            config: true,
            type: String,
            default: "Italian", // Default to Italian
            masked: true
        }
    };

    constructor() {
    }

    init(): void {
        this._registerSettings();
    }

    private _registerSettings(): void {
        this._register(
            "translate-all" as TranslateAllNamespace,
            "targetSystem" as KeyFor<TranslateAllNamespace>,
            this.settings.targetSystem
        );
        this._register(
            "translate-all" as TranslateAllNamespace,
            "apiKey" as KeyFor<TranslateAllNamespace>,
            this.settings.apiKey
        );
        this._register(
            "translate-all" as TranslateAllNamespace,
            "targetLanguage" as KeyFor<TranslateAllNamespace>,
            this.settings.targetLanguage
        );
    }

    //TODO: Fix this type casting
    _register(
        namespace: TranslateAllNamespace,
        key: KeyFor<TranslateAllNamespace>,
        config: any
    ): void {
        this.gameSettings.register(namespace as 'core', key as KeyFor<'core'>, config);
    }

    //TODO: Fix this type casting
    static getSetting(
        namespace: TranslateAllNamespace,
        key: KeyFor<TranslateAllNamespace>,
    ): string | boolean | number | object | undefined {
        const gameSettings = game.settings!;
        return gameSettings.get(namespace as 'core', key as KeyFor<'core'>);
    }
}

