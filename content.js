window.DECK = {
  appName: "Swarnik",
  event: "Sci-Pitch 2026",
  teamName: "",                       // fill in: your team name
  members: ["Jebisha", "Tanish Bhatta"],
  school: "Trinity International SS & College",

  theme: "paper",                     // "paper" (light, default) or "ink" (dark). Press D to switch live.
  keycapLegend: "Hold",

  // Only real numbers from your own survey and tests/results. "" = hidden.
  numbers: {
    surveyAsked: "",
    surveyYes: "",
    sentences: "450",
    accuracy: "76"
  },

  demoSentence: "oye asti ko homework pathaidena",

  images: {
    phoneVoice: "assets/renders/v2/phone_voicenotes.webp",
    keycap: "assets/renders/v2/keycap.webp",
    phoneKeyboard: "assets/renders/v2/phone_keyboard.webp",
    englishVoice: "assets/screenshots/english_voice_google.png",
    nepaliVoice: "assets/screenshots/nepali_voice.png",
    wisprFlow: "assets/screenshots/wispr_flow.png",
    tiktok: "assets/screenshots/tiktok_comments.png"
  },
  backupVideo: "assets/video/backup_demo.mp4",

  slides: [
    { id: "idea", section: "Idea", speaker: "Jebisha", enabled: true, beats: [
      { say: "Every voice note you’ve ever sent was a message you didn’t feel like typing.",
        show: { quote: "Every voice note is a message you didn’t feel like typing.", image: "phoneVoice" } },
      { say: "We’re Jebisha and Tanish.",
        show: { team: true } }
    ]},

    { id: "problem", section: "The problem", speaker: "Jebisha", enabled: true, beats: [
      { say: "Typing Roman Nepali on a phone is slow, so we tried talking instead.",
        show: { headline: "Voice typing doesn’t write the way we chat." } },
      { say: "We said one normal sentence: “oye asti ko homework pathaidena.”",
        show: { label: "We said one normal sentence", quote: "“{demoSentence}”" } },
      { say: "English voice typing heard “oye ostiko homework what I dinner.” (Wait for the laugh.)",
        show: { card: { tool: "English voice typing · Google",
                        image: "englishVoice",
                        verdict: "Can’t understand Nepali" } } },
      { say: "Nepali voice typing wrote it all in Devanagari, even “homework.”",
        show: { card: { tool: "Nepali voice typing",
                        image: "nepaliVoice",
                        verdict: "All Devanagari, even “homework”" } } },
      { say: "And Wispr Flow, one of the best AI voice typing apps, kept “homework” in English, but wrote the rest in Devanagari.",
        show: { card: { tool: "Wispr Flow · AI voice typing",
                        image: "wisprFlow",
                        verdict: "Keeps “homework”, rest in Devanagari" } } },
      { say: "None of them write the way we actually write.",
        show: { verdicts: true,
                rows: [ { label: "How we actually write", chat: "{demoSentence}" } ] } }
    ]},

    { id: "solution", section: "Your solution", speaker: "Tanish", enabled: true, beats: [
      { say: "So we made {app}. You talk the way you talk, and it types the way we chat. It’s a Windows app, and it’s running on this laptop right now.",
        show: { wordmark: "{app}",
                oneLiner: "A Windows app that turns spoken Nepali and English into Roman Nepali, the way we chat.",
                image: "keycap" } },
      { say: "You hold one key, you speak, and it types wherever your cursor is. Let’s try it.",
        show: { sequence: ["Hold one key", "Speak", "It types where your cursor is"] } },
      { demo: true,
        say: "TANISH (Alt+Tab to Instagram): Same sentence. (Hold the key.) “Oye asti ko homework pathaidena.” (Let go.) JEBISHA, while it processes: Your voice doesn’t go anywhere. It’s all happening on this laptop. (Text appears. Two seconds of silence.) JEBISHA: Just like that. TANISH: “Homework” stayed in English, and the rest is exactly how we’d text it. (Alt+Tab back, press Space.)" },
      { view: "how",
        say: "After you let go, a free speech model writes what you said in Devanagari. We didn’t build that part.",
        show: { headline: "How it works",
                step: { n: "1", title: "Speech model", tag: "Borrowed", desc: "Writes what you said in Devanagari" } } },
      { say: "Then our code puts the English words back in English,",
        show: { step: { n: "2", title: "English words back", tag: "Ours", from: "होमवर्क", to: "homework" } } },
      { say: "and our rules turn the rest into how we text.",
        show: { step: { n: "3", title: "Chat spelling", tag: "Ours", desc: "Turns the rest into how we text" } } }
    ]},

    { id: "users", section: "Target users", speaker: "Jebisha", enabled: true, beats: [
      { say: "And it’s not just us. It’s students in every group chat,",
        show: { headline: "Anyone who writes Nepali in English letters.",
                column: { title: "Students", sub: "Every group chat", where: "Messenger" } } },
      { say: "creators who write their scripts in Roman Nepali,",
        show: { column: { title: "Creators", sub: "Scripts and captions in Roman Nepali", where: "TikTok" } } },
      { say: "and people selling things online, all over Messenger, Instagram and TikTok.",
        show: { column: { title: "Online sellers", sub: "Posts and replies in Roman Nepali", where: "Instagram" } } },
      { needs: "survey",
        say: "We asked {numbers.surveyAsked} students, and {numbers.surveyYes} of them type Nepali in English letters.",
        show: { figure: { value: "{numbers.surveyYes} of {numbers.surveyAsked}",
                          label: "students we asked type Nepali in English letters",
                          source: "Our survey" } },
        sayIfEmpty: "Open any Nepali comment section and look at how people write. (Point.) One person writes “cha”, the next one writes “xa”.",
        showIfEmpty: { comments: {
          lines: [
            "Afnai ghar lanu bhayo jasto cha",
            "passenger xa vanera birsinu vaye jasto xa",
            "usko pachade passenger car vaney ne birsexa"
          ],
          underline: ["cha", "xa"],
          image: "tiktok",
          caption: "TikTok comments" } } }
    ]},

    { id: "science", section: "Science and innovation", speaker: "Tanish", enabled: true, beats: [
      { needs: "tests",
        say: "We tested it on {numbers.sentences} real sentences we actually say, and it got {numbers.accuracy}% of the words right.",
        show: { headline: "Tested on how we really talk.",
                figures: [
                  { value: "{numbers.sentences}", label: "real sentences we actually say" },
                  { value: "{numbers.accuracy}%", label: "of words right" }
                ],
                badge: "No ChatGPT inside" },
        sayIfEmpty: "We test it on real sentences we actually say, and check every word.",
        showIfEmpty: { headline: "Tested on how we really talk.", badge: "No ChatGPT inside" } },
      { enabled: false,
        say: "The tricky part is that every Nepali consonant hides an ‘a’. Read घर letter by letter and you get ‘gha-ra’, but we say ‘ghar’, so our rules decide when to drop it.",
        show: { transform: [
          { devanagari: "घर", caption: "written" },
          { struck: "gha·ra", caption: "letter by letter" },
          { typed: "ghar", caption: "how we say it" }
        ] } }
    ]},

    { id: "business", section: "Business model", speaker: "Tanish", enabled: false, beats: [
      { say: "It’s free for students. It runs on your own laptop, so there are no servers to pay for.",
        show: { headline: "Free for students.", rows: [
          { label: "Cost per user", value: "About zero. It runs on your laptop, no servers." },
          { label: "Price", value: "Free" },
          { label: "How people find it", value: "College group chats and word of mouth" }
        ] } }
    ]},

    { id: "benefits", section: "Potential benefits", speaker: "Jebisha", enabled: true, beats: [
      { say: "It means typing as fast as you talk,",
        show: { headline: "Type as fast as you talk.",
                rows: [ { label: "Students", value: "Your own words, your own spelling" } ],
                image: "phoneKeyboard" } },
      { say: "and if typing is hard for you, you can just say it.",
        show: { rows: [ { label: "If typing is hard for you", value: "Just say it" } ] } },
      { say: "Next is a phone keyboard that learns how you spell, because some of us write xa, some cha, some chha, and nobody’s actually wrong.",
        show: { timeline: [
          { when: "Today", what: "Windows app" },
          { when: "Next", what: "Phone keyboard" },
          { when: "Then", what: "Learns your spelling:", typed: "xa · cha · chha" }
        ] } }
    ]},

    { id: "close", section: "Conclusion and pitch", speaker: "Tanish", enabled: true, beats: [
      { say: "We didn’t ask anyone to change how they write. We made the computer catch up. BOTH: Tapai bolnus. {app} lekhxa. Thank you.",
        show: { statement: "We didn’t ask anyone to change how they write. We made the computer catch up." } }
    ]}
  ]
};
