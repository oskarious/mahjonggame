<script lang="ts">
  import { Exercise, Part, T, Term, Tiles } from '$lib/learn/components';
</script>

<Part title="Safe tiles (genbutsu)">
  <p>
    A riichi player is in tenpai, and dealing in can cost 8000 or more. Because of <a href="/learn/furiten">furiten</a>,
    they can't ron any tile in their own river, nor one they let pass after declaring: those tiles are
    <Term id="genbutsu">genbutsu</Term>, completely safe.
  </p>
  <Exercise id="safe" />
</Part>

<Part title="Suji: safer, not safe">
  <Tiles t="147p" caption="1, 4 and 7 are suji of each other" />
  <p>
    A two-sided wait always waits on tiles three apart, like <T t="23p" /> on <T t="1p" /> and <T t="4p" />. If they
    discarded <T t="4p" />, a two-sided wait on <T t="1p" /> or <T t="7p" /> is impossible: <Term id="suji">suji</Term>.
    Other waits still can. A <T t="4p" />, <T t="5p" /> or <T t="6p" /> needs both sides: <T t="5p" /> only with
    <T t="2p" /> and <T t="8p" /> gone. Trust suji of early discards more than suji of the riichi tile itself.
  </p>
  <Exercise id="suji" />
</Part>

<Part title="Walls (kabe)">
  <Tiles t="7777m 89m" caption="No two-sided wait can use 8 or 9" />
  <p>
    When all four copies of a tile are visible, no one can hold a shape through it. With every <T t="7m" /> gone,
    <T t="78m" /> and <T t="67m" /> are impossible, so <T t="8m" /> and <T t="9m" /> are
    <Term id="no-chance">no-chance</Term>: safe from two-sided waits. With three visible, it is
    <Term id="one-chance">one-chance</Term>: safer, not safe.
  </p>
  <Exercise id="wall" />
</Part>
