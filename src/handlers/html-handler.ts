import { Translator } from "translator";

export class HTMLHandler {
    static async translateApp(
        app: JournalPageSheet | ItemSheet,
        html: JQuery<HTMLElement>,
        description: string,
        path: string
    ): Promise<void> {
        const header = html.find(".window-header");
        if (header.find("button.translate-btn").length) return;

        const btn = $(
            `<button class="translate-btn" style="margin-left: 8px;">
          Translate Description
        </button>`
        );

        btn.on("click", async () => {
            const item = app.object;
            const translated = await Translator.translate(description);
            if (!translated) {
                ui?.notifications?.error("Translation failed or returned empty.");
                return;
            } try {
                await item.updateSource({ [path]: translated });
            } catch (error) {
                console.error("Error updating item description:", error);
            }

            await app.render(true);
        });

        header.append(btn);
    }
}