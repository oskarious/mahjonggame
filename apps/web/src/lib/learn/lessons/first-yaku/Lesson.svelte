<script lang="ts">
  import { Callout, Exercise, Part, T, Tiles, Yaku } from '$lib/learn/components';
</script>

<Part title="Value tiles (yakuhai)">
  <Tiles t="555z 666z 777z" caption="Any dragon triplet is a yaku" />
  <p>
    A triplet of any dragon is a yaku worth 1 han, open or closed: <Yaku id="yakuhai">yakuhai</Yaku>. <Yaku id="menzenTsumo">Self-draw with a closed hand</Yaku>
    (menzen tsumo) is another 1 han.
  </p>
  <Exercise id="haku" />
</Part>

<Part title="Your seat wind and the round wind">
  <p>
    A triplet of your <Yaku id="seatWind">seat wind</Yaku> or of the <Yaku id="roundWind">round wind</Yaku> is also <Yaku id="yakuhai">yakuhai</Yaku>. In an East-only game the round wind is always
    East.
  </p>
  <Exercise id="wind" />
</Part>

<Part title="All simples and pinfu">
  <Tiles t="234m 456p 678s 55m 23s" caption="All simples, and pinfu" />
  <p>
    <Yaku id="tanyao">Tanyao</Yaku> (all simples): only tiles 2 to 8. <Yaku id="pinfu">Pinfu</Yaku>: a closed hand of
    four sequences, a pair that isn't a value tile, and a two-sided wait. 1 han each.
  </p>
  <Exercise id="tanpin" />
</Part>

<Part title="The wait matters for pinfu">
  <p>
    The same shape with a closed wait like <T t="35s" /> is not <Yaku id="pinfu">pinfu</Yaku>. With terminals in the hand and no riichi, nothing
    is left.
  </p>
  <Exercise id="kanchan" />
  <Callout kind="tip">
    <p>
      The fifth of the first five yaku is <Yaku id="riichi">riichi</Yaku>, which works with any closed hand. It has
      <a href="/learn/riichi">its own lesson</a>.
    </p>
  </Callout>
</Part>

<Part title="Open hands: all simples still counts">
  <p>
    <Yaku id="riichi">Riichi</Yaku>, <Yaku id="menzenTsumo">self-draw</Yaku> and <Yaku id="pinfu">pinfu</Yaku> need a closed hand.
    <Yaku id="tanyao">All simples</Yaku> and <Yaku id="yakuhai">value triplets</Yaku> also work after calling.
  </p>
  <Exercise id="opentan" />
</Part>
