<script lang="ts">
  import { Exercise, Part, T, Term, Tiles } from '$lib/learn/components';
</script>

<Part title="One tile from winning">
  <p>
    When a single tile would complete your hand, you are in <Term id="tenpai">tenpai</Term>. The tiles that complete it
    are your <Term id="wait">waits</Term>.
  </p>
  <Tiles t="234m 567p 789s 99s 23s" caption="In tenpai: waiting on 1 or 4 of bamboo" />
  <Exercise id="first" />
</Part>

<Part title="The useful tile is often already in your hand">
  <p>Each turn, ask: which discard keeps me closest to winning? Sometimes the new tile is the one that helps.</p>
  <Exercise id="choose" />
</Part>

<Part title="Shanten: how far away you are">
  <Tiles t="123m 456p 78s 35s 11z 9m" caption="1-shanten" />
  <p>
    <Term id="shanten">Shanten</Term> counts the distance: one useful tile from tenpai is 1-shanten, two is 2-shanten. Here
    <T t="78s" /> and <T t="35s" /> each need one tile, and the <T t="9m" /> does nothing.
  </p>
  <Exercise id="away" />
</Part>

<Part title="Don't go backwards">
  <p>
    Throw away tiles that belong to no set, pair or partial set: losing them costs little. Riichi Arena's hints can show
    how many tiles away you are while you learn.
  </p>
  <Exercise id="stay" />
</Part>
