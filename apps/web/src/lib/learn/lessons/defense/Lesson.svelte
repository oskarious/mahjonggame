<script lang="ts">
  import { Exercise, Part, T, Term, Tiles } from '$lib/learn/components';
</script>

<Part title="Safe tiles (genbutsu)">
  <p>
    A riichi player is in tenpai, and dealing in can cost 8000 or more. Because of <a href="/learn/furiten">furiten</a>,
    they can't ron any tile in their own river: those tiles are <Term id="genbutsu">genbutsu</Term>, completely safe.
  </p>
  <Exercise id="safe" />
</Part>

<Part title="Suji: safer, not safe">
  <Tiles t="147p" caption="1, 4 and 7 are suji of each other" />
  <p>
    A two-sided wait always waits on tiles three apart, like <T t="23p" /> on <T t="1p" /> and <T t="4p" />. If they
    discarded <T t="4p" />, a two-sided wait on <T t="1p" /> or <T t="7p" /> is impossible: <Term id="suji">suji</Term>.
    Other waits still can.
  </p>
  <Exercise id="suji" />
</Part>

<Part title="When to fold">
  <p>
    In tenpai with a good hand: often push. Two or more tiles away: fold, discarding genbutsu first, then suji. You give
    up a small chance to win to avoid a big loss.
  </p>
  <Exercise id="fold" />
  <p>That completes the course. The best next step is to play: start against bots with hints on.</p>
</Part>
