<script lang="ts">
  import { Callout, Exercise, Part, T, Term, Tiles } from '$lib/learn/components';
</script>

<Part title="The goal: four sets and a pair">
  <p>
    Mahjong is a four-player tile game from China, played much like a card game such as rummy. Riichi mahjong is its
    Japanese form, the one played here; American and Chinese mahjong use other rules. All the rules on one page:
    <a href="/learn/rules">Rules in one page</a>.
  </p>
  <p>Four players race to complete a hand first. You hold 13 tiles and win with 14: four sets of three and one pair.</p>
  <Tiles t="123m 456p 789s 55m 456p" caption="A complete hand: four sets and a pair" />
  <p>
    A set is a <Term id="sequence">sequence</Term> (three in a row in one suit, like <T t="456p" />) or a
    <Term id="triplet">triplet</Term> (three of a kind, like <T t="555z" />).
  </p>
  <Exercise id="complete" />
</Part>

<Part title="A turn: draw one, discard one">
  <p>
    On your turn you draw a tile from the <Term id="wall">wall</Term>, so you hold 14, then discard one. Keep the tiles
    that build sets, throw away the ones that don't.
  </p>
  <Exercise id="turn" />
</Part>

<Part title="Winning: tsumo and ron">
  <p>
    One tile from a complete hand, you are in <Term id="tenpai">tenpai</Term>. You win by drawing that tile (<Term
      id="tsumo">tsumo</Term
    >, everyone pays) or when someone discards it (<Term id="ron">ron</Term>, they pay).
  </p>
  <Exercise id="win" />
  <Callout kind="mistake">
    <p>
      A win also needs a <Term id="yaku">yaku</Term>, a scoring pattern. That rule has its own lesson:
      <a href="/learn/winning">Winning</a>.
    </p>
  </Callout>
  <p>
    That is the whole game: everyone starts with 30,000 points, wins move points around, and the most points at the end
    wins. Next: <a href="/learn/tiles">The tiles</a>.
  </p>
</Part>
