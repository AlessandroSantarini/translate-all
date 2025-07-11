# FoundryVTT Translate ALL

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/AlessandroSantarini/translate-all?style=for-the-badge)
![Total downloads](https://img.shields.io/github/downloads/AlessandroSantarini/translate-all/total?style=for-the-badge)

A small module for FoundryVTT that allows you to translate:
- Spells  
- Items  
- Abilities  
- Journal Entries  

into your specified language.

---

## Setup Instructions

1. Visit [https://platform.openai.com/](https://platform.openai.com/)
2. Get your API key: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)  
   - ⚠️ **Important:** The key will only be shown once. Copy it and store it somewhere safe.  
   - Set a **spending limit**. I'm using `o4-mini`, which is very affordable. However, set a budget—I'm not responsible for any charges.  
   - You’ll get a free trial with some usage credits.  
   - Costs are generally low and depend on how many words you translate. Check [OpenAI pricing](https://openai.com/pricing).
3. Enter the API key in the FoundryVTT module settings.
4. You're ready to Translate ALL!

---

## How It Works

A new **"Translate"** button will appear where translation is supported:  
![Before translation](./images/before_translation.png)

After clicking it, wait a few seconds and the content will be automatically translated:  
![After translation](./images/after_translation.png)

---

## Limitations

Currently, it's not possible to translate items directly inside **compendiums**. To work around this:

- Import the item and then translate it, or  
- Translate abilities/spells directly inside player or creature sheets.

Note: Translations are **local to each instance**. If two players have the same ability, it needs to be translated separately for each one:  
![Differences](./images/differences.png)

---

## Changelog

View the full changelog [HERE](./CHANGELOG.md)

---

## Contributions

Contributions are welcome! Feature development will be slow and based on community interest. For personal use, the module is already sufficient.

You can find the current to-do list [HERE](./TODO.md). Tasks are not listed in order of priority.
