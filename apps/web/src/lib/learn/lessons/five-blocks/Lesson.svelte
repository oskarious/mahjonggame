<script lang="ts">
  import { Exercise, Part, Term, Tiles } from '$lib/learn/components';
</script>

<Part title="Count the blocks">
  <Tiles t="123m 45p 79s 99m 456s" caption="Five blocks: two sets, two partial sets, a pair" />
  <p>
    A winning hand is four sets and a pair: five <Term id="block">blocks</Term>. A block is a set, a pair, or two tiles
    that need one more. Counting them tells you what to discard.
  </p>
  <Exercise id="count" />
</Part>

<Part title="Six blocks: drop the weakest">
  <p>
    With six blocks, one has to go. Drop the weakest whole block: a closed or edge shape, or a third pair. Keep the
    two-sided shapes.
  </p>
  <Exercise id="six" />
</Part>

<Part title="Four blocks: grow the best loose tile">
  <p>
    With only four blocks, a loose tile has to become the fifth. Keep the one most likely to grow: a middle tile beats a
    2 or 8, which beats a 1 or 9. Cut the others first.
  </p>
  <Exercise id="four" />
</Part>

