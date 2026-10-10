<script lang="ts">
  import { Exercise, Part, T, Term, Tiles } from '$lib/learn/components';
</script>

<Part title="Seats and turn order">
  <p>
    Each seat has a wind: East, South, West, North. East is the <Term id="dealer">dealer</Term>, who wins and pays more.
    Play goes counter-clockwise. On Riichi Arena the other players are shown above your hand in turn order.
  </p>
  <Exercise id="next" />
</Part>

<Part title="The wall and the dora indicator">
  <p>
    You draw from the <Term id="wall">wall</Term>. Its last 14 tiles, the <Term id="dead-wall">dead wall</Term>, are
    never drawn normally; one of them is turned up as the <Term id="dora-indicator">dora indicator</Term>. The tile
    after it is the dora: indicator <T t="3p" /> makes <T t="4p" /> the dora.
  </p>
  <p>
    Each dora in a winning hand raises its score, and so does each <Term id="red-five">red five</Term>
    (akadora). They are not a yaku: they make a winning hand worth more, but never make a hand winnable. In a game they glow
    gold:
  </p>
  <Tiles t="234p 406s" dora="4p" caption="Gold: the dora, and a red five" />
  <Exercise id="indicator" />
</Part>

<Part title="Your panel and your discards">
  <p>
    Above your hand: the round, the dora (indicator → dora), and how many tiles are left to draw. Your discards go in
    rows of six in front of you, your <Term id="river">river</Term>, which everyone can see.
  </p>
  <Exercise id="junk" />
  <p>
    A deal ends when someone wins or the wall runs out. Points for both: <a href="/learn/payments-and-draws"
      >Payments, counters and draws</a
    >.
  </p>
</Part>
