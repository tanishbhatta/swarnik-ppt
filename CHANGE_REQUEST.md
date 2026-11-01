# Change request from the owner (apply on top of the v2 build)

The owner changed the content. `CLAUDE_CODE_PROMPT_V2.md` in this folder has been **updated**. Re-read sections 1, 4.2, 4.4, 5 (slides 02, 03, 04, 05), 6, 7, 9, 11 and 13, then do the following. Don't ask questions; note any decision in `REPORT.md`.

1. **Replace `content.js`** with the new version in section 7. Keep any values the owner has already filled in (`teamName`, `members`, `realOutput`).
2. **Demo sentence is now "oye asti ko homework pathaidena"** (was "oee asti ko assignment pathaidena"). Update it everywhere, including the laptop screen texture in the Blender render.
3. **Slide 2** becomes the evidence slide: three evidence cards (English voice typing, Nepali voice typing, Wispr Flow) built from the real screenshots in `assets/screenshots/`, with each tool's exact output typeset large, wavy `--accent` underlines on the wrong parts, the screenshot small below as proof, and a verdict line. Then the row "How we actually write". The phone render with the mapped Gboard screenshot is gone.
4. **Slide 3**: step 2 is now होमवर्क → `homework`. Step 3 has no "छ → x" line.
5. **Slide 4**: beat 4 shows the TikTok evidence block (three typeset comments with "cha"/"xa" underlined, plus the screenshot as proof), because there are no survey numbers.
6. **Slide 5** is now one beat: headline "Tested on how we really talk." with the figures 450 and 76%, plus the "No ChatGPT inside" badge. The hidden-‘a’ beat stays in the code but is `enabled: false`.
7. **Support `enabled: false` on single beats**, not just slides.
8. **Type roles**: all typed text (tool outputs, chat comments, Swarnik) is mono. Only Swarnik's own output uses the `--typed` colour.
9. Drop the `phone_gboard` render and the screen mapping code.
10. Re-run `tools/check_deck.mjs` and the two self-review passes from section 11, update `shots/contact-sheet.png` and `REPORT.md`, and commit: "v2: owner content changes (homework sentence, evidence screenshots, test numbers)".
