<script lang="ts">
  import { Exercise, Part, T, Term } from '$lib/learn/components';
</script>

<Part title="You can't ron a tile you discarded">
  <p>
    Your discards lie face up in front of you: your <Term id="river">river</Term>.
    <strong>If one of your waits is in your own river, you cannot win by ron.</strong> This is
    <Term id="furiten">furiten</Term>. It doesn't matter when you discarded it.
  </p>
  <Exercise id="own" />
</Part>

<Part title="It covers every wait">
  <p>
    Waiting on <T t="1s" /> or <T t="4s" /> with a <T t="4s" /> in your <Term id="river">river</Term>? You can't ron the <T
      t="1s"
    /> either: furiten is about the whole hand.
  </p>
  <Exercise id="whole" />
</Part>

<Part title="Self-draw still wins">
  <p>Furiten only stops ron. Drawing a winning tile yourself still wins.</p>
  <Exercise id="tsumo" />
</Part>

<Part title="Avoiding furiten">
  <p>
    When you can choose your wait, check your own <Term id="river">river</Term> first. A smaller wait you can ron on is usually
    better.
  </p>
  <Exercise id="avoid" />
</Part>

<Part title="Temporary and riichi furiten">
  <p>
    Let a winning tile pass and you can't ron until after your next discard. After riichi, letting one pass makes you
    furiten for the rest of the hand. Your panel shows a red Furiten chip whenever it applies.
  </p>
  <Exercise id="temporary" />
</Part>
