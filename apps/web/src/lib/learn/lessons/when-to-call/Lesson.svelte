<script lang="ts">
  import { Exercise, Part, Term, Yaku } from '$lib/learn/components';
</script>

<Part title="Know your yaku before you call">
  <p>
    An <Term id="open-hand">open hand</Term> needs a yaku from its tiles: <Yaku id="yakuhai">value triplets</Yaku>, <Yaku id="tanyao">all simples</Yaku>, a
    <Yaku id="honitsu">flush</Yaku>, <Yaku id="toitoi">all triplets</Yaku>, a <Yaku id="ittsu">straight</Yaku> or
    <Yaku id="sanshokuDoujun">triple sequence</Yaku>. If you can't name one, don't call.
  </p>
  <Exercise id="noyaku" />
</Part>

<Part title="Pon a value tile">
  <p>
    A pair of dragons, your seat wind or the round wind is the classic call: the pon gives the <Yaku id="yakuhai">yaku</Yaku> and a set at once.
    Call it, unless the hand would stay cheap and still far from tenpai.
  </p>
  <Exercise id="dragon" />
</Part>

<Part title="Call to fix a bad shape">
  <p>
    The best calls fill a closed or edge shape and make you tenpai. If your hand is all 2 to 8, a call keeps
    <Yaku id="tanyao">all simples</Yaku>: a cheap win is fine when it is fast.
  </p>
  <Exercise id="simples" />
</Part>

<Part title="When to stay closed">
  <p>
    With no yaku except <Yaku id="riichi">riichi</Yaku>, stay closed. A yaku is not enough: stay closed if the call
    leaves a cheap hand still far from tenpai, turns a big closed hand into a small open one, or breaks
    <Yaku id="pinfu">pinfu</Yaku> or <Yaku id="chiitoitsu">seven pairs</Yaku>.
  </p>
  <Exercise id="value" />
</Part>
