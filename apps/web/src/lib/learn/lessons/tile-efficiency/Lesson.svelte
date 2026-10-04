<script lang="ts">
  import { Exercise, Part, T, Term, Tiles } from '$lib/learn/components';
</script>

<Part title="Count what helps you">
  <Tiles t="123s 456s 78p 45p 99m" caption="Two sets, two two-sided shapes, a pair" />
  <p>
    The tiles that would bring your hand closer to tenpai, and how many copies are left, are its
    <Term id="ukeire">ukeire</Term>. A good discard keeps as many as possible.
  </p>
  <Exercise id="count" />
</Part>

<Part title="Lone honors go first">
  <p>
    A lone honor can only become a pair. A lone <T t="9s" /> can still join <T t="78s" />, a lone <T t="5s" /> even
    more. So: lone honors, then lone 1s and 9s, then 2s and 8s. Keep dragon and wind pairs a bit longer: they can become
    a yaku.
  </p>
  <Exercise id="honor" />
</Part>

<Part title="Cut the weakest shape">
  <p>
    Two-sided shapes like <T t="45p" /> accept 8 tiles; closed <T t="13m" /> or edge <T t="12m" /> only 4. With more
    shapes than you need, cut the weakest. Speed first: the faster hand is usually right.
  </p>
  <Exercise id="shape" />
</Part>
