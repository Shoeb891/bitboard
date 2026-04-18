// Word list for the drawing game.
// Kept at a reasonable size for MVP — easy enough that players can draw them
// in 60 seconds, varied enough to stay interesting.
const WORDS = [
  // Animals
  "cat", "dog", "fish", "bird", "horse", "elephant", "lion", "tiger",
  "bear", "rabbit", "snake", "turtle", "frog", "penguin", "monkey",
  "dolphin", "shark", "whale", "butterfly", "spider",

  // Food & Drink
  "pizza", "burger", "taco", "sushi", "cake", "cookie", "apple",
  "banana", "strawberry", "watermelon", "coffee", "tea", "ice cream",
  "sandwich", "donut", "lemon", "pineapple", "grapes", "carrot", "mushroom",

  // Everyday Objects
  "chair", "table", "lamp", "clock", "phone", "computer", "book",
  "umbrella", "camera", "backpack", "glasses", "key", "hammer", "scissors",
  "candle", "mirror", "balloon", "ladder", "fence", "window",

  // Nature & Weather
  "sun", "moon", "star", "cloud", "rain", "snow", "tree", "flower",
  "mountain", "ocean", "river", "rainbow", "lightning", "volcano",
  "island", "desert", "forest", "cave", "waterfall", "leaf",

  // Vehicles & Transport
  "car", "bus", "train", "airplane", "boat", "bicycle", "rocket",
  "submarine", "helicopter", "motorcycle", "truck", "hot air balloon",
  "skateboard", "sailboat", "tractor",

  // Buildings & Places
  "house", "castle", "lighthouse", "bridge", "church", "school",
  "hospital", "stadium", "pyramid", "igloo", "barn", "windmill",
  "skyscraper", "tent", "tower",

  // People & Activities
  "running", "swimming", "dancing", "sleeping", "fishing", "cooking",
  "reading", "painting", "singing", "jumping", "surfing", "skiing",
  "climbing", "cycling", "gardening",

  // Misc Fun
  "ghost", "robot", "crown", "sword", "shield", "magic wand", "treasure",
  "map", "compass", "lantern", "drum", "guitar", "trophy", "medal",
  "flag", "anchor", "compass", "hourglass", "dice", "chess",
];

module.exports = WORDS;
