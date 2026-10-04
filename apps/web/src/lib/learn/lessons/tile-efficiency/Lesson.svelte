<script lang="ts">
  import { Exercise, Part, T, Term, Tiles } from '$lib/learn/components';
</script>

<Part title="Count what helps you">
  <Tiles t="123s 456s 78p 45p 99m" caption="Two sets, two two-sided shapes, a pair" />
  <p>
    The tiles that would bring your hand closer to tenpai, and how many copies are left, are its
    <Term id="ukeire">ukeire</Term>. A good discard keeps as many as possible, and favours shapes that can still become
    a two-sided wait.
  </p>
  <Exercise id="count" />
</Part>

<Part title="Lone honors go first, while you need a block">
  <p>
    A hand is five <Term id="block">blocks</Term>: four sets and a pair. While one is missing, a lone honor can only
    become a pair, a lone <T t="9s" /> can still join <T t="78s" />, a lone <T t="5s" /> even more. Cut lone honors,
    then 1s and 9s, then 2s and 8s.
  </p>
  <Exercise id="honor" />
</Part>

<Part title="Five blocks? Keep the honor">
  <p>
    Once you have five blocks, a loose number tile has nothing left to build. A loose honor is no better, but it is a
    tile you can throw safely later, when someone declares riichi. Cut the number tile first.
  </p>
  <Exercise id="spare" />
</Part>

<Part title="Closed beats edge">
  <p>
    Closed <T t="46p" /> and edge <T t="12m" /> both wait on 4 tiles. But a <T t="3p" /> or <T t="7p" /> turns
    <T t="46p" /> into a two-sided shape, while <T t="12m" /> can only ever wait on <T t="3m" />. With one shape too
    many, cut the edge.
  </p>
  <Exercise id="shape" />
</Part>
