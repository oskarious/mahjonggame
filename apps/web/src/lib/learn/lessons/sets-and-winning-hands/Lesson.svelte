<script lang="ts">
  import { Exercise, Part, T, Term, Tiles, Yaku } from '$lib/learn/components';
</script>

<Part title="Sequences">
  <Tiles t="123m 456p 789s" caption="Three sequences" />
  <p>
    A <Term id="sequence">sequence</Term> is three numbers in a row in one suit. <T t="3p4m5s" /> is not one: the
    suits differ.
  </p>
  <Exercise id="finish" />
</Part>

<Part title="No wrapping around">
  <p>Sequences stop at 9. After 9 there is no 1.</p>
  <Exercise id="wrap" />
</Part>

<Part title="Triplets and quads">
  <Tiles t="222m 777p 555z" caption="Three triplets" />
  <p>
    A <Term id="triplet">triplet</Term> is three of a kind. Honors can only make triplets and pairs. Four of a kind, a
    <Term id="quad">quad</Term>, also counts as one set.
  </p>
  <Exercise id="winds" />
</Part>

<Part title="Four sets and a pair">
  <Tiles t="234m 678m 345p 777s 99p" caption="A winning hand" />
  <p>
    Any mix of sequences and triplets, plus a <Term id="pair">pair</Term>. With 13 tiles, one set is always missing a
    tile: that is what you are waiting for.
  </p>
  <Exercise id="incomplete" />
</Part>

<Part title="Seven pairs">
  <Tiles t="11m 33m 55p 77p 22s 66s 77z" caption="Seven pairs (chiitoitsu)" />
  <p>
    <Yaku id="chiitoitsu">Seven different pairs</Yaku> also win, and count as a scoring pattern by themselves. (The other exception,
    <Yaku id="kokushi">thirteen orphans</Yaku>, is on the <a href="/learn/yaku">yaku list</a>.)
  </p>
  <Exercise id="pairs" />
</Part>
