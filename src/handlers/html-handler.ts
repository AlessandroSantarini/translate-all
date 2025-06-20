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
            console.log('Translate button clicked', path);
            const item = app.object;
            console.log(item)

            const translated = await Translator.translate(description);
            if (!translated) {
                ui?.notifications?.error("Translation failed or returned empty.");
                return;
            }

            console.log("Translated description:", translated);
            console.log("Updating item description at path:", path);
            try {
                await item.updateSource({ [path]: translated });
            } catch (error) {
                console.error("Error updating item description:", error);
            }

            await app.render(true);
        });

        header.append(btn);
    }
}