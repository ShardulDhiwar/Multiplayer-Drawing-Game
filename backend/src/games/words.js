// src/game/words.js
const WORDS = [
  "apple", "banana", "guitar", "elephant", "airplane",
  "bicycle", "castle", "diamond", "elephant", "firework",
  "giraffe", "hammer", "igloo", "jellyfish", "kangaroo",
  "lighthouse", "mushroom", "notebook", "octopus", "penguin",
  "pyramid", "rainbow", "snowflake", "telescope", "umbrella",
  "volcano", "waterfall", "xylophone", "yacht", "zebra",
  "astronaut", "butterfly", "cactus", "dolphin", "eagle",
  "flamingo", "gorilla", "helicopter", "island", "jungle",
  "koala", "lemon", "mermaid", "ninja", "orchestra",
  "parachute", "quicksand", "rocket", "submarine", "tornado",
  "unicorn", "vampire", "wizard", "xray", "yo-yo",
  "compass", "dragon", "fossil", "glacier", "hurricane",
  "iceberg", "lantern", "magnet", "noodles", "origami"
];

function getRandomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function getWordHint(word, revealedIndices) {
  return word
    .split("")
    .map((char, i) => (char === " " || revealedIndices.has(i) ? char : "_"))
    .join(" ");
}

function getNextRevealIndex(word, revealedIndices) {
  const hiddenIndices = word
    .split("")
    .map((c, i) => i)
    .filter((i) => word[i] !== " " && !revealedIndices.has(i));
  if (hiddenIndices.length === 0) return null;
  return hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
}

module.exports = { getRandomWord, getWordHint, getNextRevealIndex };