<script lang="ts">
  import { Exercise, Part, Term, Tiles, Yaku } from '$lib/learn/components';
</script>

<Part title="Declaring riichi">
  <p>
    When your closed hand is in tenpai, you can declare <Term id="riichi">riichi</Term>: press Riichi, discard, and put
    up a 1000-point stick. It is a 1 han yaku. Pick the discard that leaves the most winning tiles.
  </p>
  <Exercise id="declare" />
</Part>

<Part title="Closed hands only">
  <p>Riichi needs a closed hand (a concealed kan is fine), at least 1000 points and a tile left to draw.</p>
  <Exercise id="open" />
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
    <Term id="ura-dora">ura dora</Term>. As a beginner, declare riichi almost every time your closed hand is in tenpai.
  </p>
  <Exercise id="win" />
</Part>
