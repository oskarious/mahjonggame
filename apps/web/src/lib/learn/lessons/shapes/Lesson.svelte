<script lang="ts">
  import { Exercise, Part, T, Term, Tiles } from '$lib/learn/components';
</script>

<Part title="Two-sided first">
  <Tiles t="45p 57p 12p" caption="Two-sided, closed, edge" />
  <p>
    A two-sided shape accepts 8 tiles, a closed (<Term id="kanchan">kanchan</Term>) or edge
    (<Term id="penchan">penchan</Term>) shape only 4. Lone tiles rank the same way: a middle tile can join the most
    shapes, then 2s and 8s, then 1s and 9s, then honors.
  </p>
  <Exercise id="first" />
</Part>

<Part title="Four in a row">
  <Tiles t="3456s" caption="A set plus a spare, or two two-sided shapes" />
  <p>
    Some four-tile shapes are worth more than they look. <T t="3456s" /> is a set with a spare tile, and almost any
    nearby tile turns it into something useful. Keep shapes like this until you are close to tenpai.
  </p>
  <Exercise id="row" />
</Part>

<Part title="Two pairs, not three">
  <p>
    In a closed hand, one pair is your head and a second is a backup. A third pair is a weak block: it only waits on 2
    tiles. With three, break one.
  </p>
  <Exercise id="pairs" />
</Part>

<Part title="Count the good waits">
  <p>
    Close to tenpai, also ask which tiles lead to a two-sided wait. Two discards can keep the same number of tiles,
    while only one of them leaves a good wait after every one of those tiles.
  </p>
  <Exercise id="good" />
</Part>
