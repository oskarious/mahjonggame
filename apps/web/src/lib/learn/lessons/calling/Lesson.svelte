<script lang="ts">
  import { Callout, Exercise, Part, T, Term, Tiles, Yaku } from '$lib/learn/components';
</script>

<Part title="Pon: a triplet from anyone">
  <p>
    Hold a pair, and any player discards the third? Call <Term id="pon">pon</Term>: take it, show the triplet, discard.
    Play continues from you.
  </p>
  <Exercise id="pon" />
</Part>

<Part title="Chii: a sequence from the left">
  <p>
    <Term id="chii">Chii</Term> completes a sequence, but only with the discard of the player on your left. Holding
    <T t="34m" />, you can chii <T t="2m" /> or <T t="5m" />.
  </p>
  <Exercise id="chii" />
</Part>

<Part title="Only from the left">
  <p>
    The player on your left plays just before you, so chii takes "your" turn's tile. Pon can take anyone's discard.
  </p>
  <Exercise id="who" />
</Part>

<Part title="Kan: four of a kind">
  <Tiles t="7777z" caption="A quad of red dragons" />
  <p>A <Term id="kan">kan</Term> (quad) is four of a kind. It counts as one set. There are two kinds:</p>
  <ul>
    <li><strong>Open kan</strong>: call the fourth from any discard, or add it to a pon you already have.</li>
    <li><strong>Closed kan</strong>: you drew all four yourself. Your hand stays closed.</li>
  </ul>
  <p>
    After any kan you draw a replacement tile from the dead wall, and a new dora indicator is turned over: an extra dora
    for everyone.
  </p>
  <Exercise id="kan" />
</Part>

<Part title="Who gets the tile">
  <p>Several players may want the same discard. A win beats everything; pon and kan beat chii.</p>
  <Exercise id="priority" />
</Part>

<Part title="The cost: you lose riichi">
  <p>
    A closed hand that reaches tenpai can always declare <Term id="riichi">riichi</Term>, and <Yaku id="riichi">riichi</Yaku> is a yaku by
    itself: it makes almost any closed hand winnable.
  </p>
  <p>
    <strong>Call once and riichi is gone for the rest of the hand.</strong> Your hand is now an
    <Term id="open-hand">open hand</Term>, and it needs a yaku from its tiles. A careless call can leave a complete
    hand that can never win.
  </p>
  <Exercise id="trap" />
  <Callout kind="mistake">
    <p>
      Before every call, name the yaku the open hand will have: a <Yaku id="yakuhai">dragon or wind triplet</Yaku>, or <Yaku id="tanyao">all simples</Yaku>. If you can't,
      stay closed and aim for riichi. More in <a href="/learn/when-to-call">When to call</a>.
    </p>
  </Callout>
</Part>
