<script lang="ts">
  import { Callout, Exercise, Part, T, Term, Tiles } from '$lib/learn/components';
</script>

<Part title="Three suits">
  <p>136 tiles: 34 different ones, four of each. Three suits run from 1 to 9:</p>
  <Tiles t="123456789m" caption="Man (characters): read the corner number" />
  <Tiles t="123456789p" caption="Pin (circles): count the circles" />
  <Tiles t="123456789s" caption="Sou (bamboo): the 1 is a bird" />
  <p>
    Most players use the Japanese names <Term id="man">man</Term>, <Term id="pin">pin</Term> and
    <Term id="sou">sou</Term>.
  </p>
  <Exercise id="circles" />
</Part>

<Part title="Honors: winds and dragons">
  <Tiles t="1234z 567z" caption="East, South, West, North; white, green, red" />
  <p>
    <Term id="honors">Honors</Term> have no numbers, so they only make triplets and pairs. The four
    <Term id="winds">winds</Term> and three <Term id="dragons">dragons</Term> can be worth points on their own.
  </p>
  <Exercise id="honors" />
</Part>

<Part title="Which dragon is which">
  <p>White is the blank (or framed) tile, green is 發, red is 中. The corner shows Wh, G and R.</p>
  <Exercise id="green" />
</Part>

<Part title="Simples and terminals">
  <p>
    <Term id="simples">Simples</Term> are 2 to 8, like <T t="5p" />. <Term id="terminals">Terminals</Term> are the 1s and
    9s, like <T t="1p" /> and <T t="9s" />. Many scoring rules use these two words.
  </p>
  <Exercise id="terminals" />
</Part>

<Part title="Red fives">
  <Tiles t="0m0p0s" caption="Red fives" />
  <p>
    On Riichi Arena one 5 of each suit is red. It plays like any 5 but is a bonus tile (a dora), shown with a gold glow.
  </p>
  <Callout kind="ema"><p>EMA tournament rules play without red fives.</p></Callout>
  <Exercise id="count" />
</Part>
