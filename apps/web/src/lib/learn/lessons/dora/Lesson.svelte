<script lang="ts">
  import { Callout, Exercise, Part, T, Term, Tiles, Yaku } from '$lib/learn/components';
</script>

<Part title="The tile after the indicator">
  <Tiles t="3p 4p" caption="Indicator 3 of circles: the dora is 4 of circles" />
  <p>
    The <Term id="dora-indicator">dora indicator</Term> points to the <Term id="dora">dora</Term>: the next tile. After
    9 comes 1 again.
  </p>
  <p>
    Each dora in a winning hand adds 1 han, and so does each <Term id="red-five">red five</Term> (akadora). They are not a
    yaku: they raise the score of a hand that can already win, nothing more. In a game, dora and red fives glow gold, and
    your panel shows indicator → dora.
  </p>
  <Tiles t="234p 406s" dora="4p" caption="Gold: the dora, and a red five" />
  <Exercise id="wrap" />
</Part>

<Part title="Winds wrap around">
  <p>Winds go East → South → West → North → East.</p>
  <Exercise id="wind" />
</Part>

<Part title="Dragons wrap around">
  <p>Dragons go white → green → red → white.</p>
  <Exercise id="dragon" />
</Part>

<Part title="More dora">
  <p>
    Every kan turns over another indicator. A riichi winner also gets <Term id="ura-dora">ura dora</Term>, and on Riichi
    Arena each <Term id="red-five">red five</Term> is a dora.
  </p>
  <Exercise id="kan" />
  <Callout kind="ema"><p>EMA tournament rules have no red fives.</p></Callout>
</Part>

<Part title="Counting han with dora">
  <Tiles t="234m 456p 678s 0m5m 23s" caption="All simples with a red five" />
  <p>
    Dora add han to a hand that already has a yaku, but never replace it. Here: 1 han for <Yaku id="tanyao"
      >all simples</Yaku
    >, 1 for the red
    <T t="0m" />.
  </p>
  <Exercise id="han" />
</Part>
