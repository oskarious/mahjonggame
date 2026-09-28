// Handle-style names for bot players ("QuietHeron", "kenji_88", "dora_hunter"). Curated word lists only, so no
// combination is offensive; every result is a valid username by the sign-up rules.
import { isValidUsername } from '@mahjong/protocol';

const ADJECTIVES = [
  'Quiet', 'Lucky', 'Calm', 'Swift', 'Sleepy', 'Brave', 'Clever', 'Gentle', 'Silent', 'Sunny', 'Misty', 'Rusty', 'Humble',
  'Patient', 'Bold', 'Lazy', 'Tiny', 'Grand', 'Wild', 'Salty', 'Cozy', 'Nimble', 'Steady', 'Frosty', 'Golden', 'Silver',
  'Crimson', 'Azure', 'Jade', 'Amber', 'Velvet', 'Hidden', 'Wandering', 'Midnight', 'Northern', 'Early', 'Spicy', 'Mellow',
];
const NOUNS = [
  'Heron', 'Tanuki', 'Fox', 'Crane', 'Otter', 'Panda', 'Tiger', 'Dragon', 'Koi', 'Sparrow', 'Owl', 'Badger', 'Turtle',
  'Maple', 'Bamboo', 'Lotus', 'Pine', 'River', 'Harbor', 'Comet', 'Lantern', 'Pebble', 'Teapot', 'Noodle', 'Dumpling',
  'Mochi', 'Ramen', 'Sushi', 'Wind', 'Tile', 'Dealer', 'Wall', 'Pond', 'Dora', 'Riichi', 'Tenpai', 'Chun', 'Haku',
];
const HANDLE_WORDS = [
  'tile', 'dora', 'riichi', 'tenpai', 'pon', 'chii', 'ron', 'tsumo', 'east', 'south', 'west', 'north', 'wind', 'wall',
  'pond', 'honba', 'dealer', 'bamboo', 'circle', 'dragon', 'lucky', 'quiet', 'sleepy', 'red', 'green', 'white', 'kan',
];
const HANDLE_TAILS = ['hunter', 'fan', 'enjoyer', 'lover', 'player', 'master', 'student', 'addict', 'crew', 'club', 'wave'];
const FIRST_NAMES = [
  'kenji', 'yuki', 'mira', 'aiko', 'hana', 'leo', 'sam', 'alex', 'noah', 'lena', 'emil', 'nora', 'ida', 'jonas',
  'maja', 'lucas', 'elin', 'tomas', 'sara', 'wei', 'lin', 'jun', 'mei', 'hiro', 'sora', 'ren', 'kai', 'nina', 'ella',
  'marco', 'lukas', 'anna', 'felix', 'julia', 'david', 'eva', 'max', 'olga', 'ivan', 'chen', 'min', 'tao', 'rin', 'yuto',
];

const pick = <T>(xs: readonly T[], random: () => number): T => xs[Math.floor(random() * xs.length)];
const digits = (random: () => number, n: number) =>
  Array.from({ length: n }, (_, i) => Math.floor(random() * (i === 0 ? 9 : 10)) + (i === 0 ? 1 : 0)).join('');

const PATTERNS: ((random: () => number) => string)[] = [
  (r) => pick(ADJECTIVES, r) + pick(NOUNS, r),
  (r) => pick(ADJECTIVES, r) + pick(NOUNS, r) + digits(r, 1 + Math.floor(r() * 2)),
  (r) => pick(NOUNS, r).toLowerCase() + digits(r, 2),
  (r) => `${pick(HANDLE_WORDS, r)}_${pick(HANDLE_TAILS, r)}`,
  (r) => `${pick(FIRST_NAMES, r)}_${digits(r, 2)}`,
  (r) => pick(FIRST_NAMES, r) + digits(r, 2 + Math.floor(r() * 2)),
  (r) => {
    const n = pick(FIRST_NAMES, r);
    return n[0].toUpperCase() + n.slice(1) + pick(NOUNS, r);
  },
  (r) => `${pick(FIRST_NAMES, r)}_${pick(HANDLE_WORDS, r)}`,
];

/** A random bot name; always a valid username (the caller still has to check it is free). */
export function botName(random: () => number = Math.random): string {
  for (;;) {
    const name = pick(PATTERNS, random)(random);
    if (isValidUsername(name)) return name;
  }
}
