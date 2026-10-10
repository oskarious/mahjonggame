<script lang="ts">
  import { Exercise, Part, Term } from '$lib/learn/components';
</script>

<Part title="Two of three">
  <p>
    Against a riichi, check three things: are you in tenpai, is your hand worth about 7700 or more, is your wait good?
    If two are no, <Term id="fold">fold</Term>: discard only safe tiles. You give up a small chance to win to avoid a
    big loss.
  </p>
  <Exercise id="fold" />
</Part>

<Part title="When to push">
  <p>
    If two are yes, <Term id="push">push</Term>: keep playing your hand. From one tile away, push only with a big hand
    and two-sided shapes; otherwise fold.
  </p>
  <Exercise id="push" />
</Part>

<Part title="The safety ladder">
  <p>
    Folding, take the safest tile you have: <Term id="genbutsu">genbutsu</Term>; then honors others have discarded, suji
    1s and 9s, and <Term id="no-chance">no-chance</Term> tiles; then suji 2s and 8s; then suji 3s and 7s. The most dangerous
    are 4s, 5s and 6s that are not suji. Two tiles from tenpai, stay near the top of the ladder.
  </p>
  <Exercise id="ladder" />
</Part>

<Part title="Nothing is safe">
  <p>
    Out of safe tiles? Prefer terminals to middle tiles, stay away from the dora and its neighbours, and throw a pair:
    if the first copy passes, the second is genbutsu next turn.
  </p>
  <Exercise id="nothing" />
</Part>
