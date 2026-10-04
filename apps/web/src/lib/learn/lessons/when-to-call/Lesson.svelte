<script lang="ts">
  import { Exercise, Part, T, Term, Yaku } from '$lib/learn/components';
</script>

<Part title="Know your yaku before you call">
  <p>
    An <Term id="open-hand">open hand</Term> needs a yaku from its tiles: <Yaku id="yakuhai">value triplets</Yaku>, <Yaku id="tanyao">all simples</Yaku>, a
    <Yaku id="honitsu">flush</Yaku> or <Yaku id="toitoi">all triplets</Yaku>. If you can't name one, don't call.
  </p>
  <Exercise id="noyaku" />
</Part>

<Part title="Pon a value tile">
  <p>
    A pair of dragons, your seat wind or the round wind is the classic call: the pon gives the <Yaku id="yakuhai">yaku</Yaku> and a set at once.
    Call it the first time it appears.
  </p>
  <Exercise id="dragon" />
</Part>

<Part title="Speed with all simples">
  <p>
    If your hand is all 2 to 8 already, calling for <T t="345m" /> keeps the yaku and gets you to tenpai faster. A cheap,
    fast win is often the best result.
  </p>
  <Exercise id="simples" />
</Part>

<Part title="When to stay closed">
  <p>
    With no yaku except <Yaku id="riichi">riichi</Yaku>, stay closed. Same if the call leaves you far from tenpai anyway, or would break <Yaku id="pinfu">pinfu</Yaku>
    or <Yaku id="chiitoitsu">seven pairs</Yaku>.
  </p>
  <Exercise id="value" />
</Part>
