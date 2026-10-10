<script lang="ts">
  import { Exercise, Part, T, Term, Tiles } from '$lib/learn/components';
</script>

<Part title="Two-sided and closed waits">
  <p>
    <T t="45p" /> waits on either end, <T t="3p" /> or <T t="6p" />: a <Term id="ryanmen">ryanmen</Term>, the best basic
    wait. <T t="35s" /> only waits on the middle tile: a <Term id="kanchan">kanchan</Term>. An edge like <T t="12p" />
    (only <T t="3p" />) is a <Term id="penchan">penchan</Term>.
  </p>
  <Exercise id="kanchan" />
</Part>

<Part title="Two pairs">
  <Tiles t="55m 77s" caption="Either pair can become the triplet" />
  <p>
    With two pairs, either can become a triplet while the other stays the pair: a <Term id="shanpon">shanpon</Term>.
    When all four sets are done, the last tile waits for its twin: a <Term id="tanki">tanki</Term>.
  </p>
  <Exercise id="shanpon" />
</Part>

<Part title="Four in a row">
  <Tiles t="3456s" caption="3-4-5 plus 6, or 3 plus 4-5-6" />
  <p>Longer runs can be split more than one way. Try every split: each one gives waits.</p>
  <Exercise id="nobetan" />
</Part>

<Part title="Five in a row">
  <p>A run of five waits on three tiles: both ends of each way to split it. A three-sided wait beats even a ryanmen.</p>
  <Exercise id="three" />
</Part>

<Part title="Find them all">
  <p>
    While you hold a tile, Riichi Arena shows the waits you would have after discarding it, and how many copies are
    left. Try this one without help.
  </p>
  <Exercise id="tricky" />
</Part>
