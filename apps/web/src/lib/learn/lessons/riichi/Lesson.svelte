<script lang="ts">
  import { Callout, Exercise, Part, Term, Tiles, Yaku } from '$lib/learn/components';
</script>

<Part title="Declaring riichi">
  <p>
    When your closed hand is in tenpai, you can declare <Term id="riichi">riichi</Term>: press Riichi, discard, and put
    up a 1000-point stick. It is a 1 han yaku. Usually pick the discard that leaves the most winning tiles.
  </p>
  <Exercise id="declare" />
</Part>

<Part title="Closed hands only">
  <p>Riichi needs a closed hand (a concealed kan is fine), at least 1000 points and a tile left to draw.</p>
  <Exercise id="open" />
  <Callout kind="ema"><p>EMA tournament rules let you declare riichi with fewer than 1000 points.</p></Callout>
</Part>

<Part title="Your hand is locked">
  <p>
    After riichi you can't change your hand: every tile you draw that doesn't win is discarded. Letting a winning tile
    pass makes you furiten for the rest of the hand.
  </p>
  <Exercise id="locked" />
</Part>

<Part title="The rewards">
  <Tiles t="234m 567p 789s 99s 23s" caption="Riichi with pinfu" />
  <p>
    Riichi stacks with other yaku. Win within one go-around for <Yaku id="ippatsu">ippatsu</Yaku> (+1 han), and a riichi winner gets extra
    <Term id="ura-dora">ura dora</Term>. Declare riichi almost every time your closed hand is in tenpai; the few exceptions are in
    <a href="/learn/riichi-or-dama">Riichi or dama</a>.
  </p>
  <Exercise id="win" />
</Part>
