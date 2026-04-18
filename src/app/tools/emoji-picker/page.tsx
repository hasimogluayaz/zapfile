"use client";

import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

interface EmojiItem {
  emoji: string;
  name: string;
  keywords: string[];
}

interface EmojiCategory {
  name: string;
  emojis: EmojiItem[];
}

const EMOJI_DATA: EmojiCategory[] = [
  {
    name: "Smileys",
    emojis: [
      { emoji: "😀", name: "grinning face", keywords: ["happy", "smile", "grin"] },
      { emoji: "😁", name: "beaming face", keywords: ["happy", "grin", "smile"] },
      { emoji: "😂", name: "face with tears of joy", keywords: ["laugh", "cry", "funny"] },
      { emoji: "🤣", name: "rolling on floor laughing", keywords: ["laugh", "rofl", "funny"] },
      { emoji: "😃", name: "grinning face with big eyes", keywords: ["happy", "smile"] },
      { emoji: "😄", name: "grinning face with smiling eyes", keywords: ["happy", "smile"] },
      { emoji: "😅", name: "grinning face with sweat", keywords: ["nervous", "sweat"] },
      { emoji: "😆", name: "grinning squinting face", keywords: ["laugh", "happy"] },
      { emoji: "😉", name: "winking face", keywords: ["wink", "flirt"] },
      { emoji: "😊", name: "smiling face with smiling eyes", keywords: ["happy", "blush"] },
      { emoji: "😋", name: "face savoring food", keywords: ["yum", "delicious"] },
      { emoji: "😎", name: "smiling face with sunglasses", keywords: ["cool", "sunglasses"] },
      { emoji: "😍", name: "smiling face with heart eyes", keywords: ["love", "heart", "adore"] },
      { emoji: "🥰", name: "smiling face with hearts", keywords: ["love", "hearts"] },
      { emoji: "😘", name: "face blowing a kiss", keywords: ["kiss", "love"] },
      { emoji: "😗", name: "kissing face", keywords: ["kiss"] },
      { emoji: "😙", name: "kissing face with smiling eyes", keywords: ["kiss", "smile"] },
      { emoji: "🥲", name: "smiling face with tear", keywords: ["happy", "cry", "sad"] },
      { emoji: "😚", name: "kissing face with closed eyes", keywords: ["kiss"] },
      { emoji: "🙂", name: "slightly smiling face", keywords: ["smile"] },
      { emoji: "🤗", name: "smiling face with open hands", keywords: ["hug", "warm"] },
      { emoji: "🤩", name: "star-struck", keywords: ["wow", "star", "amazing"] },
      { emoji: "🥳", name: "partying face", keywords: ["party", "celebrate"] },
      { emoji: "😜", name: "winking face with tongue", keywords: ["wink", "tongue"] },
      { emoji: "😝", name: "squinting face with tongue", keywords: ["tongue", "silly"] },
      { emoji: "😛", name: "face with tongue", keywords: ["tongue"] },
      { emoji: "🤑", name: "money mouth face", keywords: ["money", "rich"] },
      { emoji: "🤓", name: "nerd face", keywords: ["nerd", "glasses"] },
      { emoji: "🧐", name: "face with monocle", keywords: ["monocle", "smart"] },
      { emoji: "🤠", name: "cowboy hat face", keywords: ["cowboy", "hat"] },
      { emoji: "😤", name: "face with steam from nose", keywords: ["angry", "steam"] },
      { emoji: "😠", name: "angry face", keywords: ["angry", "mad"] },
      { emoji: "😡", name: "pouting face", keywords: ["angry", "red", "mad"] },
      { emoji: "🤬", name: "face with symbols on mouth", keywords: ["angry", "curse"] },
      { emoji: "😔", name: "pensive face", keywords: ["sad", "pensive"] },
      { emoji: "😞", name: "disappointed face", keywords: ["sad", "disappointed"] },
      { emoji: "😒", name: "unamused face", keywords: ["unamused", "meh"] },
      { emoji: "😑", name: "expressionless face", keywords: ["expressionless", "blank"] },
      { emoji: "😐", name: "neutral face", keywords: ["neutral", "blank"] },
      { emoji: "🤔", name: "thinking face", keywords: ["think", "hmm"] },
    ],
  },
  {
    name: "People",
    emojis: [
      { emoji: "👋", name: "waving hand", keywords: ["wave", "hello", "hi"] },
      { emoji: "🤚", name: "raised back of hand", keywords: ["hand", "stop"] },
      { emoji: "✋", name: "raised hand", keywords: ["hand", "stop", "high five"] },
      { emoji: "🖐️", name: "hand with fingers splayed", keywords: ["hand"] },
      { emoji: "👌", name: "ok hand", keywords: ["ok", "perfect"] },
      { emoji: "🤌", name: "pinched fingers", keywords: ["italian", "chef kiss"] },
      { emoji: "✌️", name: "victory hand", keywords: ["peace", "victory", "two"] },
      { emoji: "🤞", name: "crossed fingers", keywords: ["luck", "hope"] },
      { emoji: "👍", name: "thumbs up", keywords: ["good", "like", "yes"] },
      { emoji: "👎", name: "thumbs down", keywords: ["bad", "dislike", "no"] },
      { emoji: "👏", name: "clapping hands", keywords: ["clap", "applause", "bravo"] },
      { emoji: "🙌", name: "raising hands", keywords: ["celebrate", "raise", "hooray"] },
      { emoji: "🤲", name: "palms up together", keywords: ["hands", "pray"] },
      { emoji: "🤝", name: "handshake", keywords: ["deal", "handshake"] },
      { emoji: "🙏", name: "folded hands", keywords: ["pray", "please", "thanks"] },
      { emoji: "💪", name: "flexed biceps", keywords: ["strong", "muscle", "flex"] },
      { emoji: "🦾", name: "mechanical arm", keywords: ["robot", "arm", "strong"] },
      { emoji: "👈", name: "backhand index pointing left", keywords: ["left", "point"] },
      { emoji: "👉", name: "backhand index pointing right", keywords: ["right", "point"] },
      { emoji: "👆", name: "backhand index pointing up", keywords: ["up", "point"] },
      { emoji: "👇", name: "backhand index pointing down", keywords: ["down", "point"] },
      { emoji: "☝️", name: "index pointing up", keywords: ["up", "point", "one"] },
      { emoji: "🤙", name: "call me hand", keywords: ["call", "shaka"] },
      { emoji: "👫", name: "woman and man holding hands", keywords: ["couple", "love"] },
      { emoji: "👨‍👩‍👧‍👦", name: "family", keywords: ["family", "parents", "kids"] },
      { emoji: "🧑", name: "person", keywords: ["person", "human"] },
      { emoji: "👶", name: "baby", keywords: ["baby", "child", "infant"] },
      { emoji: "🧒", name: "child", keywords: ["child", "kid"] },
      { emoji: "👦", name: "boy", keywords: ["boy", "child"] },
      { emoji: "👧", name: "girl", keywords: ["girl", "child"] },
      { emoji: "👱", name: "person blond hair", keywords: ["blond", "person"] },
      { emoji: "🧔", name: "person beard", keywords: ["beard", "person"] },
      { emoji: "👴", name: "old man", keywords: ["old", "elderly", "man"] },
      { emoji: "👵", name: "old woman", keywords: ["old", "elderly", "woman"] },
      { emoji: "🧙", name: "mage", keywords: ["wizard", "magic", "mage"] },
      { emoji: "🧝", name: "elf", keywords: ["elf", "fantasy"] },
      { emoji: "🧜", name: "merperson", keywords: ["mermaid", "merman", "fantasy"] },
      { emoji: "🧟", name: "zombie", keywords: ["zombie", "undead"] },
      { emoji: "🦸", name: "superhero", keywords: ["superhero", "hero"] },
      { emoji: "🦹", name: "supervillain", keywords: ["villain", "supervillain"] },
    ],
  },
  {
    name: "Animals",
    emojis: [
      { emoji: "🐶", name: "dog face", keywords: ["dog", "puppy", "pet"] },
      { emoji: "🐱", name: "cat face", keywords: ["cat", "kitty", "pet"] },
      { emoji: "🐭", name: "mouse face", keywords: ["mouse", "rodent"] },
      { emoji: "🐹", name: "hamster", keywords: ["hamster", "pet"] },
      { emoji: "🐰", name: "rabbit face", keywords: ["rabbit", "bunny", "easter"] },
      { emoji: "🦊", name: "fox", keywords: ["fox", "sly"] },
      { emoji: "🐻", name: "bear", keywords: ["bear", "animal"] },
      { emoji: "🐼", name: "panda", keywords: ["panda", "bear", "bamboo"] },
      { emoji: "🐨", name: "koala", keywords: ["koala", "australia"] },
      { emoji: "🐯", name: "tiger face", keywords: ["tiger", "cat", "wild"] },
      { emoji: "🦁", name: "lion", keywords: ["lion", "king"] },
      { emoji: "🐮", name: "cow face", keywords: ["cow", "moo", "farm"] },
      { emoji: "🐷", name: "pig face", keywords: ["pig", "oink", "farm"] },
      { emoji: "🐸", name: "frog", keywords: ["frog", "green"] },
      { emoji: "🐵", name: "monkey face", keywords: ["monkey", "ape"] },
      { emoji: "🐔", name: "chicken", keywords: ["chicken", "farm", "bird"] },
      { emoji: "🐧", name: "penguin", keywords: ["penguin", "bird", "cold"] },
      { emoji: "🐦", name: "bird", keywords: ["bird", "tweet"] },
      { emoji: "🦆", name: "duck", keywords: ["duck", "bird", "quack"] },
      { emoji: "🦅", name: "eagle", keywords: ["eagle", "bird", "freedom"] },
      { emoji: "🦉", name: "owl", keywords: ["owl", "bird", "wise"] },
      { emoji: "🦋", name: "butterfly", keywords: ["butterfly", "insect"] },
      { emoji: "🐛", name: "bug", keywords: ["bug", "caterpillar", "insect"] },
      { emoji: "🐝", name: "honeybee", keywords: ["bee", "honey", "sting"] },
      { emoji: "🐠", name: "tropical fish", keywords: ["fish", "tropical", "ocean"] },
      { emoji: "🐬", name: "dolphin", keywords: ["dolphin", "ocean", "smart"] },
      { emoji: "🐳", name: "whale", keywords: ["whale", "ocean", "big"] },
      { emoji: "🦈", name: "shark", keywords: ["shark", "ocean", "danger"] },
      { emoji: "🐊", name: "crocodile", keywords: ["crocodile", "alligator", "reptile"] },
      { emoji: "🐢", name: "turtle", keywords: ["turtle", "slow", "shell"] },
      { emoji: "🦎", name: "lizard", keywords: ["lizard", "reptile"] },
      { emoji: "🐍", name: "snake", keywords: ["snake", "reptile"] },
      { emoji: "🦕", name: "sauropod", keywords: ["dinosaur", "dino"] },
      { emoji: "🦖", name: "t-rex", keywords: ["dinosaur", "t-rex", "dino"] },
      { emoji: "🦓", name: "zebra", keywords: ["zebra", "stripes", "africa"] },
      { emoji: "🦒", name: "giraffe", keywords: ["giraffe", "tall", "africa"] },
      { emoji: "🦏", name: "rhinoceros", keywords: ["rhino", "africa"] },
      { emoji: "🦛", name: "hippopotamus", keywords: ["hippo", "africa"] },
      { emoji: "🐘", name: "elephant", keywords: ["elephant", "africa", "big"] },
      { emoji: "🦙", name: "llama", keywords: ["llama", "alpaca"] },
    ],
  },
  {
    name: "Food",
    emojis: [
      { emoji: "🍎", name: "red apple", keywords: ["apple", "fruit", "red"] },
      { emoji: "🍊", name: "tangerine", keywords: ["orange", "fruit"] },
      { emoji: "🍋", name: "lemon", keywords: ["lemon", "yellow", "sour"] },
      { emoji: "🍇", name: "grapes", keywords: ["grapes", "fruit", "wine"] },
      { emoji: "🍓", name: "strawberry", keywords: ["strawberry", "fruit", "red"] },
      { emoji: "🍒", name: "cherries", keywords: ["cherry", "fruit", "red"] },
      { emoji: "🍑", name: "peach", keywords: ["peach", "fruit"] },
      { emoji: "🥭", name: "mango", keywords: ["mango", "fruit", "tropical"] },
      { emoji: "🍍", name: "pineapple", keywords: ["pineapple", "fruit", "tropical"] },
      { emoji: "🥥", name: "coconut", keywords: ["coconut", "tropical"] },
      { emoji: "🥝", name: "kiwi fruit", keywords: ["kiwi", "fruit", "green"] },
      { emoji: "🍅", name: "tomato", keywords: ["tomato", "red"] },
      { emoji: "🥕", name: "carrot", keywords: ["carrot", "vegetable", "orange"] },
      { emoji: "🌽", name: "ear of corn", keywords: ["corn", "maize", "vegetable"] },
      { emoji: "🥦", name: "broccoli", keywords: ["broccoli", "vegetable", "green"] },
      { emoji: "🧄", name: "garlic", keywords: ["garlic", "spice"] },
      { emoji: "🧅", name: "onion", keywords: ["onion", "vegetable"] },
      { emoji: "🍕", name: "pizza", keywords: ["pizza", "food", "italy"] },
      { emoji: "🍔", name: "hamburger", keywords: ["burger", "food", "fast food"] },
      { emoji: "🌮", name: "taco", keywords: ["taco", "mexican", "food"] },
      { emoji: "🌯", name: "burrito", keywords: ["burrito", "wrap", "mexican"] },
      { emoji: "🍜", name: "steaming bowl", keywords: ["noodles", "ramen", "soup"] },
      { emoji: "🍣", name: "sushi", keywords: ["sushi", "japanese", "fish"] },
      { emoji: "🍦", name: "soft ice cream", keywords: ["ice cream", "soft serve"] },
      { emoji: "🍰", name: "shortcake", keywords: ["cake", "dessert", "birthday"] },
      { emoji: "🎂", name: "birthday cake", keywords: ["cake", "birthday", "party"] },
      { emoji: "🍩", name: "doughnut", keywords: ["donut", "dessert"] },
      { emoji: "🍪", name: "cookie", keywords: ["cookie", "dessert", "sweet"] },
      { emoji: "🍫", name: "chocolate bar", keywords: ["chocolate", "dessert"] },
      { emoji: "☕", name: "hot beverage", keywords: ["coffee", "tea", "hot"] },
      { emoji: "🍵", name: "teacup", keywords: ["tea", "japanese"] },
      { emoji: "🧋", name: "bubble tea", keywords: ["bubble tea", "boba", "drink"] },
      { emoji: "🥤", name: "cup with straw", keywords: ["drink", "soda", "juice"] },
      { emoji: "🍺", name: "beer mug", keywords: ["beer", "drink", "alcohol"] },
      { emoji: "🍷", name: "wine glass", keywords: ["wine", "drink", "alcohol"] },
      { emoji: "🥂", name: "clinking glasses", keywords: ["cheers", "toast", "celebrate"] },
      { emoji: "🍾", name: "bottle with popping cork", keywords: ["champagne", "celebrate"] },
      { emoji: "🥞", name: "pancakes", keywords: ["pancakes", "breakfast"] },
      { emoji: "🧇", name: "waffle", keywords: ["waffle", "breakfast"] },
      { emoji: "🥓", name: "bacon", keywords: ["bacon", "breakfast", "meat"] },
    ],
  },
  {
    name: "Travel",
    emojis: [
      { emoji: "🚗", name: "automobile", keywords: ["car", "drive", "vehicle"] },
      { emoji: "🚕", name: "taxi", keywords: ["taxi", "cab"] },
      { emoji: "🚙", name: "sport utility vehicle", keywords: ["suv", "car"] },
      { emoji: "🚌", name: "bus", keywords: ["bus", "public transport"] },
      { emoji: "🚎", name: "trolleybus", keywords: ["trolley", "bus"] },
      { emoji: "🏎️", name: "racing car", keywords: ["race", "fast", "speed"] },
      { emoji: "🚑", name: "ambulance", keywords: ["ambulance", "emergency", "hospital"] },
      { emoji: "🚒", name: "fire engine", keywords: ["fire", "truck"] },
      { emoji: "🚓", name: "police car", keywords: ["police", "cop"] },
      { emoji: "🚂", name: "locomotive", keywords: ["train", "steam", "railway"] },
      { emoji: "✈️", name: "airplane", keywords: ["plane", "fly", "travel"] },
      { emoji: "🚀", name: "rocket", keywords: ["rocket", "space", "fast"] },
      { emoji: "🛸", name: "flying saucer", keywords: ["ufo", "alien", "space"] },
      { emoji: "🚁", name: "helicopter", keywords: ["helicopter", "chopper"] },
      { emoji: "⛵", name: "sailboat", keywords: ["boat", "sail", "sea"] },
      { emoji: "🚢", name: "ship", keywords: ["ship", "cruise", "boat"] },
      { emoji: "🏍️", name: "motorcycle", keywords: ["motorcycle", "bike"] },
      { emoji: "🛴", name: "kick scooter", keywords: ["scooter", "ride"] },
      { emoji: "🚲", name: "bicycle", keywords: ["bike", "bicycle"] },
      { emoji: "🛺", name: "auto rickshaw", keywords: ["tuk-tuk", "rickshaw"] },
      { emoji: "🗺️", name: "world map", keywords: ["map", "world", "travel"] },
      { emoji: "🧭", name: "compass", keywords: ["compass", "navigate", "direction"] },
      { emoji: "🏔️", name: "snow-capped mountain", keywords: ["mountain", "snow", "peak"] },
      { emoji: "⛺", name: "tent", keywords: ["tent", "camping"] },
      { emoji: "🏕️", name: "camping", keywords: ["camping", "outdoors"] },
      { emoji: "🏖️", name: "beach with umbrella", keywords: ["beach", "vacation", "sea"] },
      { emoji: "🌍", name: "globe showing europe-africa", keywords: ["earth", "world", "globe"] },
      { emoji: "🗼", name: "tokyo tower", keywords: ["tokyo", "tower", "japan"] },
      { emoji: "🗽", name: "statue of liberty", keywords: ["statue", "liberty", "new york"] },
      { emoji: "🏰", name: "european castle", keywords: ["castle", "medieval", "europe"] },
      { emoji: "🕌", name: "mosque", keywords: ["mosque", "islam", "religion"] },
      { emoji: "⛪", name: "church", keywords: ["church", "religion", "cross"] },
      { emoji: "🕍", name: "synagogue", keywords: ["synagogue", "jewish", "religion"] },
      { emoji: "🏯", name: "japanese castle", keywords: ["castle", "japanese", "japan"] },
      { emoji: "🌋", name: "volcano", keywords: ["volcano", "eruption", "lava"] },
      { emoji: "🏝️", name: "desert island", keywords: ["island", "palm", "tropical"] },
      { emoji: "🛫", name: "airplane departure", keywords: ["depart", "fly", "plane"] },
      { emoji: "🛬", name: "airplane arrival", keywords: ["arrive", "fly", "plane"] },
      { emoji: "🎡", name: "ferris wheel", keywords: ["ferris wheel", "fair", "amusement"] },
      { emoji: "🎢", name: "roller coaster", keywords: ["roller coaster", "ride"] },
    ],
  },
  {
    name: "Objects",
    emojis: [
      { emoji: "💻", name: "laptop", keywords: ["laptop", "computer", "work"] },
      { emoji: "🖥️", name: "desktop computer", keywords: ["desktop", "computer", "monitor"] },
      { emoji: "⌨️", name: "keyboard", keywords: ["keyboard", "type", "computer"] },
      { emoji: "🖱️", name: "computer mouse", keywords: ["mouse", "click", "computer"] },
      { emoji: "📱", name: "mobile phone", keywords: ["phone", "mobile", "cell"] },
      { emoji: "☎️", name: "telephone", keywords: ["phone", "call", "landline"] },
      { emoji: "📷", name: "camera", keywords: ["camera", "photo", "picture"] },
      { emoji: "🎥", name: "movie camera", keywords: ["camera", "film", "video"] },
      { emoji: "📺", name: "television", keywords: ["tv", "television", "screen"] },
      { emoji: "📻", name: "radio", keywords: ["radio", "music", "broadcast"] },
      { emoji: "🎮", name: "video game", keywords: ["game", "controller", "gaming"] },
      { emoji: "🕹️", name: "joystick", keywords: ["joystick", "game", "controller"] },
      { emoji: "📚", name: "books", keywords: ["books", "read", "study"] },
      { emoji: "📖", name: "open book", keywords: ["book", "read", "study"] },
      { emoji: "📝", name: "memo", keywords: ["note", "memo", "write"] },
      { emoji: "✏️", name: "pencil", keywords: ["pencil", "write", "draw"] },
      { emoji: "🖊️", name: "pen", keywords: ["pen", "write"] },
      { emoji: "📌", name: "pushpin", keywords: ["pin", "mark", "location"] },
      { emoji: "📎", name: "paperclip", keywords: ["paperclip", "attach"] },
      { emoji: "✂️", name: "scissors", keywords: ["scissors", "cut"] },
      { emoji: "🔑", name: "key", keywords: ["key", "lock", "access"] },
      { emoji: "🔒", name: "locked", keywords: ["lock", "secure", "private"] },
      { emoji: "🔓", name: "unlocked", keywords: ["unlock", "open", "access"] },
      { emoji: "🔨", name: "hammer", keywords: ["hammer", "tool", "build"] },
      { emoji: "⚙️", name: "gear", keywords: ["gear", "settings", "cog"] },
      { emoji: "🔧", name: "wrench", keywords: ["wrench", "tool", "fix"] },
      { emoji: "💡", name: "light bulb", keywords: ["idea", "light", "bulb"] },
      { emoji: "🔦", name: "flashlight", keywords: ["flashlight", "torch", "light"] },
      { emoji: "🕯️", name: "candle", keywords: ["candle", "light", "flame"] },
      { emoji: "🧲", name: "magnet", keywords: ["magnet", "attract", "force"] },
      { emoji: "💊", name: "pill", keywords: ["pill", "medicine", "drug"] },
      { emoji: "🩺", name: "stethoscope", keywords: ["stethoscope", "doctor", "medicine"] },
      { emoji: "🧪", name: "test tube", keywords: ["test tube", "science", "lab"] },
      { emoji: "🔭", name: "telescope", keywords: ["telescope", "star", "space"] },
      { emoji: "🎸", name: "guitar", keywords: ["guitar", "music", "instrument"] },
      { emoji: "🎹", name: "musical keyboard", keywords: ["piano", "keyboard", "music"] },
      { emoji: "🥁", name: "drum", keywords: ["drum", "music", "percussion"] },
      { emoji: "🎺", name: "trumpet", keywords: ["trumpet", "music", "instrument"] },
      { emoji: "🎻", name: "violin", keywords: ["violin", "music", "instrument"] },
      { emoji: "🎙️", name: "studio microphone", keywords: ["microphone", "podcast", "record"] },
    ],
  },
  {
    name: "Symbols",
    emojis: [
      { emoji: "❤️", name: "red heart", keywords: ["heart", "love", "red"] },
      { emoji: "🧡", name: "orange heart", keywords: ["heart", "orange"] },
      { emoji: "💛", name: "yellow heart", keywords: ["heart", "yellow"] },
      { emoji: "💚", name: "green heart", keywords: ["heart", "green"] },
      { emoji: "💙", name: "blue heart", keywords: ["heart", "blue"] },
      { emoji: "💜", name: "purple heart", keywords: ["heart", "purple"] },
      { emoji: "🖤", name: "black heart", keywords: ["heart", "black"] },
      { emoji: "🤍", name: "white heart", keywords: ["heart", "white"] },
      { emoji: "💯", name: "hundred points", keywords: ["100", "perfect", "score"] },
      { emoji: "✅", name: "check mark button", keywords: ["check", "done", "ok"] },
      { emoji: "❌", name: "cross mark", keywords: ["cross", "no", "wrong", "x"] },
      { emoji: "⭐", name: "star", keywords: ["star", "favorite"] },
      { emoji: "🌟", name: "glowing star", keywords: ["star", "glow", "shine"] },
      { emoji: "💫", name: "dizzy", keywords: ["dizzy", "star", "sparkle"] },
      { emoji: "⚡", name: "high voltage", keywords: ["lightning", "electricity", "fast"] },
      { emoji: "🔥", name: "fire", keywords: ["fire", "hot", "flame"] },
      { emoji: "❄️", name: "snowflake", keywords: ["snow", "cold", "winter"] },
      { emoji: "🌈", name: "rainbow", keywords: ["rainbow", "color", "pride"] },
      { emoji: "🎉", name: "party popper", keywords: ["party", "celebrate", "confetti"] },
      { emoji: "🎊", name: "confetti ball", keywords: ["confetti", "party", "celebrate"] },
      { emoji: "🏆", name: "trophy", keywords: ["trophy", "award", "win", "first"] },
      { emoji: "🥇", name: "first place medal", keywords: ["gold", "first", "win"] },
      { emoji: "🎯", name: "bullseye", keywords: ["target", "goal", "aim"] },
      { emoji: "💎", name: "gem stone", keywords: ["diamond", "gem", "jewel"] },
      { emoji: "👑", name: "crown", keywords: ["crown", "king", "queen", "royal"] },
      { emoji: "🔔", name: "bell", keywords: ["bell", "notification", "ring"] },
      { emoji: "🔕", name: "bell with slash", keywords: ["silent", "no sound"] },
      { emoji: "💬", name: "speech balloon", keywords: ["chat", "message", "talk"] },
      { emoji: "❓", name: "question mark", keywords: ["question", "what", "ask"] },
      { emoji: "❗", name: "exclamation mark", keywords: ["exclamation", "important"] },
      { emoji: "♻️", name: "recycling symbol", keywords: ["recycle", "green", "eco"] },
      { emoji: "🚫", name: "prohibited", keywords: ["no", "stop", "ban"] },
      { emoji: "⚠️", name: "warning", keywords: ["warning", "caution", "alert"] },
      { emoji: "✨", name: "sparkles", keywords: ["sparkle", "shine", "magic"] },
      { emoji: "🌀", name: "cyclone", keywords: ["cyclone", "hurricane", "spin"] },
      { emoji: "➕", name: "plus", keywords: ["plus", "add", "more"] },
      { emoji: "➖", name: "minus", keywords: ["minus", "subtract", "less"] },
      { emoji: "🔀", name: "shuffle tracks button", keywords: ["shuffle", "random"] },
      { emoji: "🔁", name: "repeat button", keywords: ["repeat", "loop"] },
      { emoji: "🔂", name: "repeat single button", keywords: ["repeat one", "loop"] },
    ],
  },
  {
    name: "Flags",
    emojis: [
      { emoji: "🏳️", name: "white flag", keywords: ["white flag", "surrender"] },
      { emoji: "🏴", name: "black flag", keywords: ["black flag"] },
      { emoji: "🚩", name: "triangular flag", keywords: ["flag", "red", "mark"] },
      { emoji: "🏁", name: "chequered flag", keywords: ["race", "finish", "flag"] },
      { emoji: "🏴‍☠️", name: "pirate flag", keywords: ["pirate", "jolly roger", "skull"] },
      { emoji: "🇺🇸", name: "flag: United States", keywords: ["usa", "america", "us", "flag"] },
      { emoji: "🇬🇧", name: "flag: United Kingdom", keywords: ["uk", "britain", "england", "flag"] },
      { emoji: "🇨🇦", name: "flag: Canada", keywords: ["canada", "maple", "flag"] },
      { emoji: "🇦🇺", name: "flag: Australia", keywords: ["australia", "aussie", "flag"] },
      { emoji: "🇩🇪", name: "flag: Germany", keywords: ["germany", "german", "flag"] },
      { emoji: "🇫🇷", name: "flag: France", keywords: ["france", "french", "flag"] },
      { emoji: "🇯🇵", name: "flag: Japan", keywords: ["japan", "japanese", "flag"] },
      { emoji: "🇨🇳", name: "flag: China", keywords: ["china", "chinese", "flag"] },
      { emoji: "🇧🇷", name: "flag: Brazil", keywords: ["brazil", "brasil", "flag"] },
      { emoji: "🇲🇽", name: "flag: Mexico", keywords: ["mexico", "mexican", "flag"] },
      { emoji: "🇮🇳", name: "flag: India", keywords: ["india", "indian", "flag"] },
      { emoji: "🇷🇺", name: "flag: Russia", keywords: ["russia", "russian", "flag"] },
      { emoji: "🇰🇷", name: "flag: South Korea", keywords: ["korea", "south korea", "flag"] },
      { emoji: "🇮🇹", name: "flag: Italy", keywords: ["italy", "italian", "flag"] },
      { emoji: "🇪🇸", name: "flag: Spain", keywords: ["spain", "spanish", "flag"] },
      { emoji: "🇳🇱", name: "flag: Netherlands", keywords: ["netherlands", "dutch", "flag"] },
      { emoji: "🇸🇪", name: "flag: Sweden", keywords: ["sweden", "swedish", "flag"] },
      { emoji: "🇳🇴", name: "flag: Norway", keywords: ["norway", "norwegian", "flag"] },
      { emoji: "🇩🇰", name: "flag: Denmark", keywords: ["denmark", "danish", "flag"] },
      { emoji: "🇵🇱", name: "flag: Poland", keywords: ["poland", "polish", "flag"] },
      { emoji: "🇵🇹", name: "flag: Portugal", keywords: ["portugal", "portuguese", "flag"] },
      { emoji: "🇹🇷", name: "flag: Turkey", keywords: ["turkey", "turkish", "flag"] },
      { emoji: "🇸🇦", name: "flag: Saudi Arabia", keywords: ["saudi", "arabia", "flag"] },
      { emoji: "🇿🇦", name: "flag: South Africa", keywords: ["south africa", "flag"] },
      { emoji: "🇦🇷", name: "flag: Argentina", keywords: ["argentina", "flag"] },
      { emoji: "🇨🇱", name: "flag: Chile", keywords: ["chile", "flag"] },
      { emoji: "🇨🇴", name: "flag: Colombia", keywords: ["colombia", "flag"] },
      { emoji: "🇮🇩", name: "flag: Indonesia", keywords: ["indonesia", "flag"] },
      { emoji: "🇸🇬", name: "flag: Singapore", keywords: ["singapore", "flag"] },
      { emoji: "🇳🇿", name: "flag: New Zealand", keywords: ["new zealand", "kiwi", "flag"] },
      { emoji: "🇨🇭", name: "flag: Switzerland", keywords: ["switzerland", "swiss", "flag"] },
      { emoji: "🇦🇹", name: "flag: Austria", keywords: ["austria", "austrian", "flag"] },
      { emoji: "🇧🇪", name: "flag: Belgium", keywords: ["belgium", "belgian", "flag"] },
      { emoji: "🇬🇷", name: "flag: Greece", keywords: ["greece", "greek", "flag"] },
      { emoji: "🇺🇦", name: "flag: Ukraine", keywords: ["ukraine", "ukrainian", "flag"] },
    ],
  },
];

export default function EmojiPickerPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", ...EMOJI_DATA.map((c) => c.name)];

  const filteredEmojis = useMemo(() => {
    const q = search.toLowerCase().trim();
    return EMOJI_DATA.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter((e) => {
        if (activeCategory !== "All" && cat.name !== activeCategory) return false;
        if (!q) return true;
        return (
          e.name.toLowerCase().includes(q) ||
          e.keywords.some((k) => k.includes(q)) ||
          e.emoji.includes(q)
        );
      }),
    })).filter((cat) => {
      if (activeCategory !== "All" && cat.name !== activeCategory) return false;
      return cat.emojis.length > 0;
    });
  }, [search, activeCategory]);

  const totalCount = filteredEmojis.reduce((sum, c) => sum + c.emojis.length, 0);

  const copyEmoji = async (emoji: string) => {
    try {
      await navigator.clipboard.writeText(emoji);
      toast.success(`Copied: ${emoji}`, { duration: 1500 });
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <ToolLayout
      toolName="Emoji Picker"
      toolDescription="Browse and copy emojis by category or search by name and keyword"
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="glass rounded-xl p-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emojis by name or keyword..."
            className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary focus:outline-none focus:border-accent/50 placeholder:text-t-tertiary"
          />
        </div>

        {/* Category Tabs */}
        <div className="glass rounded-xl p-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const count =
                cat === "All"
                  ? EMOJI_DATA.reduce((s, c) => s + c.emojis.length, 0)
                  : EMOJI_DATA.find((c) => c.name === cat)?.emojis.length ?? 0;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? "bg-indigo-500/20 border border-indigo-500/50 text-indigo-400"
                      : "bg-bg-secondary border border-border text-t-secondary hover:text-t-primary hover:border-border"
                  }`}
                >
                  {cat}
                  <span className="ml-1.5 text-xs opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-t-tertiary">
          {totalCount} emoji{totalCount !== 1 ? "s" : ""} found
        </div>

        {/* Emoji Grid */}
        {filteredEmojis.map((cat) => (
          <div key={cat.name} className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold text-t-secondary mb-3">
              {cat.name}
              <span className="ml-2 text-xs text-t-tertiary font-normal">({cat.emojis.length})</span>
            </h3>
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-1">
              {cat.emojis.map((item) => (
                <button
                  key={item.emoji}
                  onClick={() => copyEmoji(item.emoji)}
                  title={item.name}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-2xl hover:bg-bg-secondary transition-all hover:scale-110 active:scale-95"
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>
        ))}

        {totalCount === 0 && (
          <div className="glass rounded-xl p-12 text-center text-t-tertiary">
            No emojis found for &quot;{search}&quot;
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
