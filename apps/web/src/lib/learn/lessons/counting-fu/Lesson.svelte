<script lang="ts">
  import { Exercise, Part, T, Term, Tiles, Yaku } from '$lib/learn/components';
</script>

<Part title="The fu checklist">
  <p>Start at 20 <Term id="fu">fu</Term>, add, then round up to the next 10:</p>
  <ul>
    <li>Closed hand won by ron: +10. Self-draw: +2.</li>
    <li>
      Triplets: 2 (open simple), 4 (open 1/9/honor, or closed simple), 8 (closed 1/9/honor). Quads: four times that.
    </li>
    <li>A pair of value tiles: +2.</li>
    <li>A closed, edge or single-tile wait: +2.</li>
  </ul>
  <Exercise id="closed" />
</Part>

<Part title="Open hands">
  <Tiles t="234m 678p 11s 99s 555z" caption="The white dragon triplet was called" />
  <p>No +10 for an open ron, and a triplet completed by ron counts as open. Open hands often land on 30.</p>
  <Exercise id="open" />
</Part>

<Part title="Self-draw">
  <p>
    A self-draw adds 2 fu, and a triplet you drew yourself counts as closed. (If the winning tile can be read more than
    one way, like <T t="9s" /> with <T t="78s 99s" />, the reading that scores most counts.)
  </p>
  <Exercise id="tsumo" />
</Part>

<Part title="Pinfu by self-draw">
  <p><Yaku id="pinfu">Pinfu</Yaku> by ron is 30 fu (20 + 10). By self-draw it is fixed at 20: the +2 is not added.</p>
  <Exercise id="pinfu" />
</Part>

<Part title="Seven pairs">
  <p><Yaku id="chiitoitsu">Seven pairs</Yaku> has its own fixed fu, never rounded.</p>
  <Exercise id="pairs" />
</Part>

<Part title="A quick estimate">
  <p>
    Most hands land on a few values: <Yaku id="pinfu">pinfu</Yaku> 30 by ron, <Yaku id="chiitoitsu">seven pairs</Yaku> 25,
    an open hand about 30, any other closed hand about 40 by ron (30 by self-draw). Count exactly when the hand has a quad
    or a closed triplet of 1s, 9s or honors.
  </p>
  <Exercise id="estimate" />
</Part>
