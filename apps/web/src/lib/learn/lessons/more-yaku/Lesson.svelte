<script lang="ts">
  import { Exercise, Part, T, Term, Tiles, Yaku } from '$lib/learn/components';
</script>

<Part title="Flushes: one suit">
  <Tiles t="234m 567m 789m 99m 555z" caption="Half flush: one suit plus honors" />
  <p>
    <Yaku id="honitsu">Half flush</Yaku> (honitsu): one suit plus honors, 3 han closed, 2 open. <Yaku id="chinitsu">Full flush</Yaku> (chinitsu): one suit only, 6 han
    closed, 5 open. Every value is on the <a href="/learn/yaku">yaku list</a>.
  </p>
  <Exercise id="honitsu" />
</Part>

<Part title="Seven pairs">
  <p>Seven different pairs (<Yaku id="chiitoitsu">chiitoitsu</Yaku>): 2 han, closed only, and always a single-tile wait.</p>
  <Exercise id="pairs" />
</Part>

<Part title="Straights">
  <Tiles t="123p 456p 789p" caption="Pure straight" />
  <p>
    <Yaku id="ittsu">Pure straight</Yaku> (ittsu): 1 to 9 of one suit, 2 han (1 open). <Yaku id="sanshokuDoujun">Mixed triple sequence</Yaku> (sanshoku): the same sequence in
    all three suits, like <T t="345m" /> <T t="345p" /> <T t="345s" />.
  </p>
  <Exercise id="straight" />
</Part>

<Part title="All triplets">
  <p>
    <Yaku id="toitoi">All triplets</Yaku> (toitoi): four triplets and a pair, 2 han, usually built by calling pon. <Yaku id="yakuhai">Value triplets</Yaku> add their own
    han.
  </p>
  <Exercise id="triplets" />
</Part>

<Part title="Closed-only yaku">
  <p>
    Some yaku vanish when you call: <Yaku id="riichi">riichi</Yaku>, <Yaku id="menzenTsumo">self-draw</Yaku>, <Yaku id="pinfu">pinfu</Yaku>,
    <Yaku id="chiitoitsu">seven pairs</Yaku>, and <Yaku id="iipeikou">two identical sequences</Yaku> (iipeikou).
    Others lose 1 han. The rarest hands, <Term id="yakuman">yakuman</Term>, are on the <a href="/learn/yaku"
      >yaku list</a
    >.
  </p>
  <Exercise id="closedonly" />
</Part>
