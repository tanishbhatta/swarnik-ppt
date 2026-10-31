// ─────────────────────────────────────────────────────────────────────────────
//  ALL editable text for the deck lives in this file.
//  Edit, save, reload index.html. Nothing else needs to change.
//
//  appName      – the product name. It is inserted wherever "{app}" appears.
//  show         – the words that appear on screen for a beat (one string = one line).
//  say          – the spoken line. Only shown in the presenter window (press P).
//  numbers      – only real, measured numbers. "" hides it. All "" = no numbers row at all.
//  showOptional – false skips every beat marked  optional: true.
// ─────────────────────────────────────────────────────────────────────────────
window.DECK = {
  appName: "Swarnik",
  speakers: ["Jebisha", "Tanish"],
  keycapLegend: "HOLD",          // printed on the 3D keycap (needs a re-render to change, see README)

  showOptional: true,            // false = skip the optional "hidden 'a'" beat on slide 6

  // Only measured numbers from the team's own test files. "" = hidden.
  numbers: { sentences: "", accuracy: "", seconds: "" },
  // Labels printed next to each number (slide 6, bottom left), e.g. "120" + "test sentences".
  numberLabels: { sentences: "test sentences", accuracy: "accuracy on our tests", seconds: "seconds per sentence" },

  images: {
    gboard: "assets/screenshots/gboard.png"
  },
  // Red outline on the broken word, % of the screenshot: { x, y, w, h }. null = no outline.
  gboardHighlight: null,
  // Filled in automatically by blender/render_all.py (pixel corners of the phone screen on slide 2).
  screenCorners: [[1249.05, 127.89], [1625.44, 158.54], [1602.14, 962.53], [1196.57, 926.92]],

  backupVideo: "assets/video/backup_demo.mp4",

  slides: [
    { id: "hook", speaker: "Jebisha", beats: [
      { say: "Every voice note you've ever sent was a message you didn't feel like typing.",
        show: ["Every voice note", "= a message you didn't type"] },
      { say: "We type on our phones all day, but typing in Roman Nepali is slow.",
        show: ["Roman Nepali is slow to type"] },
      { say: "Ask your phone to write down what you said, and it gets it wrong.",
        show: ["Ask your phone to write it.", "It gets it wrong."] }
    ]},

    { id: "problem", speaker: "Jebisha", beats: [
      { say: "We said this to Gboard: oee asti ko assignment pathaidena.",
        show: ["We said:", "“oee asti ko assignment pathaidena”"] },
      { say: "(read the real output flatly) Nepali voice typing writes Devanagari and breaks the English word.",
        show: ["Nepali voice typing → Devanagari", "English word: broken"] },
      { say: "English voice typing can't understand us. None of the ones we tried write the way we write.",
        show: ["English voice typing → can't understand us", "None write the way we write"], highlight: true }
    ]},

    { id: "who", speaker: "Jebisha", beats: [
      { say: "And it's not just us. Students in every group chat,",
        show: ["Students", "every group chat"] },
      { say: "creators whose scripts are in Roman Nepali,",
        show: ["Creators", "scripts in Roman Nepali"] },
      { say: "and people selling online.",
        show: ["Online shops", "selling in Roman Nepali"] }
    ]},

    { id: "product", speaker: "Tanish", beats: [
      { say: "So we made {app}. A Windows app, running on this laptop.",
        show: ["{app}", "Windows app"] },
      { say: "Hold one key, speak,",
        show: ["Hold one key. Speak."] },
      { say: "and it types anywhere. Let's try it.",
        show: ["It types anywhere."] }
    ]},

    { id: "demo", speaker: "Tanish", black: true, beats: [
      { say: "Same sentence we gave Gboard. (hold key) “Oee asti ko assignment pathaidena.” (text appears, two seconds of silence) Jebisha: Just like that.",
        show: [] }
    ]},

    { id: "how", speaker: "Tanish", beats: [
      { say: "After you let go of the key, three things happen. One: a free speech model writes what you said in Devanagari.",
        show: ["1  Speech model → Devanagari"], tag: "borrowed",
        sample: "ओई अस्ति को असाइनमेन्ट पठाइदेन" },
      { say: "Two: English words come out in Nepali letters, like this. Our code catches those and puts back “assignment”.",
        show: ["2  Finds English words → puts them back"], tag: "ours",
        sample: { from: "असाइनमेन्ट", to: "assignment" } },
      { say: "Three: our rules change Nepali letters into how we text. छ becomes “xa”.",
        show: ["3  Rules → how we text"], tag: "ours",
        sample: "oee asti ko assignment pathaidena" },
      { say: "One thing we had to figure out: every Nepali letter has a hidden 'a'. घर letter by letter is 'ghara', but we say 'ghar'. So our rules know when to drop it.",
        show: ["Hidden ‘a’:  घर → ghara → ghar"], optional: true }
    ], note: "No ChatGPT inside" },

    { id: "next", speaker: "Jebisha", beats: [
      { say: "{app} works in any app on your laptop.",
        show: ["Today", "Any app on your laptop"] },
      { say: "Next is a phone keyboard,",
        show: ["Next", "Phone keyboard"] },
      { say: "that learns how you spell, because some of us write xa, some cha, and some chha.",
        show: ["Learns your spelling", "xa · cha · chha"] }
    ]},

    { id: "close", speaker: "Tanish", beats: [
      { say: "We didn't ask anyone to change how they write. We made the computer catch up.",
        show: ["We didn't ask anyone to change how they write.", "We made the computer catch up."] },
      { say: "(Tanish switches to Notes) Both: Tapai bolnus. {app} lekhxa.",
        show: ["Tapai bolnus.", "{app} lekhxa."] }
    ]}
  ]
};
