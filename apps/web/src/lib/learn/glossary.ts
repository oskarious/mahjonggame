// Every term the lessons link with <Term id="…">. The lesson test checks that each linked id exists here and that
// each entry's lesson exists.

export interface GlossaryEntry {
  id: string;
  /** The term as written in lessons (romaji or English). */
  term: string;
  /** English gloss (or the Japanese word for English terms). */
  gloss: string;
  definition: string;
  /** The lesson that teaches it. */
  lesson: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  { id: 'baiman', term: 'Baiman', gloss: 'double mangan', definition: 'A limit hand of 8 to 10 han: twice a mangan.', lesson: 'han-and-fu' },
  { id: 'chii', term: 'Chii', gloss: 'call a sequence', definition: 'Take the discard of the player on your left to complete a sequence.', lesson: 'calling' },
  { id: 'closed-hand', term: 'Closed hand', gloss: 'menzen', definition: 'A hand with no called tiles (a concealed quad keeps it closed).', lesson: 'calling' },
  { id: 'dama', term: 'Dama', gloss: 'silent tenpai', definition: 'Staying in tenpai with a closed hand without declaring riichi.', lesson: 'riichi' },
  { id: 'dead-wall', term: 'Dead wall', gloss: 'wanpai', definition: 'The last 14 tiles of the wall: dora indicators and replacement tiles for quads. Never drawn normally.', lesson: 'table-and-turns' },
  { id: 'dealer', term: 'Dealer', gloss: 'oya', definition: 'The player sitting East. Wins and pays 1.5 times as much, and stays dealer after winning or being in tenpai at a draw.', lesson: 'table-and-turns' },
  { id: 'dora', term: 'Dora', gloss: 'bonus tile', definition: 'Each dora in a winning hand adds 1 han. Dora are not yaku.', lesson: 'dora' },
  { id: 'dora-indicator', term: 'Dora indicator', gloss: 'dora hyouji', definition: 'The face-up tile on the dead wall. The tile after it in its sequence is the dora.', lesson: 'dora' },
  { id: 'dragons', term: 'Dragons', gloss: 'sangenpai', definition: 'The white, green and red honor tiles. A triplet of any dragon is a yaku.', lesson: 'tiles' },
  { id: 'fu', term: 'Fu', gloss: 'minipoints', definition: 'Points for how a hand is built and won (sets, pair, wait, ron or tsumo), rounded up to 10.', lesson: 'counting-fu' },
  { id: 'furiten', term: 'Furiten', gloss: 'sacred discard', definition: 'You cannot win by ron while one of your winning tiles is in your own discards (or you passed on one).', lesson: 'furiten' },
  { id: 'genbutsu', term: 'Genbutsu', gloss: 'safe tile', definition: 'A tile a player has already discarded: they cannot ron on it.', lesson: 'defense' },
  { id: 'han', term: 'Han', gloss: 'doubles', definition: 'The main unit of hand value, from yaku and dora. Each han doubles the score.', lesson: 'han-and-fu' },
  { id: 'hanchan', term: 'Hanchan', gloss: 'half game', definition: 'A game of an East round and a South round.', lesson: 'ending-a-game' },
  { id: 'haneman', term: 'Haneman', gloss: 'jumping mangan', definition: 'A limit hand of 6 or 7 han: one and a half mangan.', lesson: 'han-and-fu' },
  { id: 'honba', term: 'Honba', gloss: 'counter', definition: 'A counter added after a dealer win or a draw. Each one adds 300 points to the next win.', lesson: 'payments-and-draws' },
  { id: 'honors', term: 'Honors', gloss: 'jihai', definition: 'The winds and dragons: tiles without numbers, used only in triplets and pairs.', lesson: 'tiles' },
  { id: 'kabe', term: 'Kabe', gloss: 'wall', definition: 'When you can see all four of a tile, sequences through it are impossible, which makes some tiles safer.', lesson: 'defense' },
  { id: 'kan', term: 'Kan', gloss: 'quad', definition: 'Four of a kind, declared as a set. You draw a replacement tile and a new dora is revealed.', lesson: 'calling' },
  { id: 'kanchan', term: 'Kanchan', gloss: 'closed wait', definition: 'Waiting for the middle tile of a sequence, like 4 with 3 and 5.', lesson: 'waits' },
  { id: 'man', term: 'Man', gloss: 'characters', definition: 'One of the three suits, numbered 1 to 9 with Chinese numerals.', lesson: 'tiles' },
  { id: 'mangan', term: 'Mangan', gloss: 'limit hand', definition: 'A fixed score for 5 han, or fewer han with many fu: 8000 points (12000 for the dealer).', lesson: 'han-and-fu' },
  { id: 'noten', term: 'Noten', gloss: 'not ready', definition: 'Not in tenpai. At an exhaustive draw, noten players pay the tenpai players.', lesson: 'payments-and-draws' },
  { id: 'open-hand', term: 'Open hand', gloss: 'naki', definition: 'A hand with at least one called set. Some yaku are lost or worth less when open.', lesson: 'calling' },
  { id: 'pair', term: 'Pair', gloss: 'jantou', definition: 'Two identical tiles: every standard winning hand has exactly one.', lesson: 'sets-and-winning-hands' },
  { id: 'penchan', term: 'Penchan', gloss: 'edge wait', definition: 'Waiting on 3 with 1 and 2, or on 7 with 8 and 9.', lesson: 'waits' },
  { id: 'pin', term: 'Pin', gloss: 'circles', definition: 'One of the three suits, shown as circles (dots).', lesson: 'tiles' },
  { id: 'pinfu', term: 'Pinfu', gloss: 'no-points hand', definition: 'A closed hand of four sequences and a non-value pair, won on a two-sided wait.', lesson: 'first-yaku' },
  { id: 'pon', term: 'Pon', gloss: 'call a triplet', definition: 'Take any player’s discard to complete a triplet.', lesson: 'calling' },
  { id: 'quad', term: 'Quad', gloss: 'kantsu', definition: 'Four identical tiles declared as a set (counts as one set).', lesson: 'sets-and-winning-hands' },
  { id: 'red-five', term: 'Red five', gloss: 'akadora', definition: 'A red 5 tile that counts as a dora. Used on Riichi Arena, not in EMA tournaments.', lesson: 'dora' },
  { id: 'riichi', term: 'Riichi', gloss: 'ready declaration', definition: 'Declaring that your closed hand is in tenpai, for 1000 points: a 1-han yaku, but your hand is locked.', lesson: 'riichi' },
  { id: 'riichi-stick', term: 'Riichi stick', gloss: 'deposit', definition: 'The 1000 points put up when declaring riichi. The next winner takes them.', lesson: 'payments-and-draws' },
  { id: 'river', term: 'River', gloss: 'kawa', definition: 'A player’s discards, laid out in rows of six in front of them.', lesson: 'table-and-turns' },
  { id: 'ron', term: 'Ron', gloss: 'win on a discard', definition: 'Winning with another player’s discard. The discarder pays everything.', lesson: 'winning' },
  { id: 'ryanmen', term: 'Ryanmen', gloss: 'two-sided wait', definition: 'Two consecutive tiles waiting on either end, like 4-5 waiting on 3 or 6.', lesson: 'waits' },
  { id: 'sequence', term: 'Sequence', gloss: 'shuntsu', definition: 'Three consecutive numbers in one suit, like 3-4-5 of circles.', lesson: 'sets-and-winning-hands' },
  { id: 'shanpon', term: 'Shanpon', gloss: 'double pair wait', definition: 'Two pairs waiting for either to become a triplet.', lesson: 'waits' },
  { id: 'shanten', term: 'Shanten', gloss: 'tiles from tenpai', definition: 'How many useful tiles a hand still needs to reach tenpai: 1-shanten is one away.', lesson: 'tenpai' },
  { id: 'simples', term: 'Simples', gloss: 'chunchanpai', definition: 'Suit tiles numbered 2 to 8.', lesson: 'tiles' },
  { id: 'sou', term: 'Sou', gloss: 'bamboo', definition: 'One of the three suits, shown as bamboo sticks (the 1 is a bird).', lesson: 'tiles' },
  { id: 'suji', term: 'Suji', gloss: 'lines', definition: 'Tiles three apart (1-4-7, 2-5-8, 3-6-9). If a player discarded 4, a two-sided wait on 1 or 7 is impossible for them.', lesson: 'defense' },
  { id: 'tanki', term: 'Tanki', gloss: 'single wait', definition: 'Waiting on one tile to complete the pair.', lesson: 'waits' },
  { id: 'tanyao', term: 'Tanyao', gloss: 'all simples', definition: 'A hand of only 2 to 8: no terminals or honors. 1 han, open or closed.', lesson: 'first-yaku' },
  { id: 'tenpai', term: 'Tenpai', gloss: 'ready', definition: 'One tile away from a complete hand.', lesson: 'tenpai' },
  { id: 'terminals', term: 'Terminals', gloss: 'routouhai', definition: 'The 1 and 9 of each suit.', lesson: 'tiles' },
  { id: 'triplet', term: 'Triplet', gloss: 'koutsu', definition: 'Three identical tiles.', lesson: 'sets-and-winning-hands' },
  { id: 'tsumo', term: 'Tsumo', gloss: 'self-draw', definition: 'Winning with a tile you drew yourself. Every other player pays a share.', lesson: 'winning' },
  { id: 'uma', term: 'Uma', gloss: 'placement bonus', definition: 'Points added or taken at the end of a game for finishing 1st to 4th.', lesson: 'ending-a-game' },
  { id: 'ukeire', term: 'Ukeire', gloss: 'acceptance', definition: 'The tiles (and how many copies are left) that would improve your hand.', lesson: 'tile-efficiency' },
  { id: 'ura-dora', term: 'Ura dora', gloss: 'hidden dora', definition: 'Extra dora under the indicators, revealed only for a player who won with riichi.', lesson: 'riichi' },
  { id: 'wait', term: 'Wait', gloss: 'machi', definition: 'The tile or tiles a tenpai hand needs to win.', lesson: 'waits' },
  { id: 'wall', term: 'Wall', gloss: 'yama', definition: 'The face-down tiles players draw from.', lesson: 'table-and-turns' },
  { id: 'winds', term: 'Winds', gloss: 'kazehai', definition: 'East, South, West and North honor tiles. Your seat wind and the round wind are value tiles.', lesson: 'tiles' },
  { id: 'yaku', term: 'Yaku', gloss: 'scoring pattern', definition: 'A pattern a hand must contain at least one of to win, like riichi or all simples.', lesson: 'winning' },
  { id: 'yakuhai', term: 'Yakuhai', gloss: 'value tiles', definition: 'A triplet of dragons, your seat wind or the round wind: 1 han each.', lesson: 'first-yaku' },
  { id: 'yakuman', term: 'Yakuman', gloss: 'limit hand', definition: 'The highest score: 32000 points (48000 for the dealer), for very rare hands.', lesson: 'han-and-fu' },
];

export const glossaryIds = new Set(GLOSSARY.map((g) => g.id));
