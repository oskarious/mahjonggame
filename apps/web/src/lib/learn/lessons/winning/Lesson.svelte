<script lang="ts">
  import { Callout, Exercise, Part, T, Term, Tiles, Yaku } from '$lib/learn/components';
</script>

<Part title="Every win needs a yaku">
  <p>
    A complete hand only wins if it has at least one <Term id="yaku">yaku</Term>, a scoring pattern. Without one there
    is no Tsumo or Ron button. The easiest yaku for a closed hand: <Yaku id="menzenTsumo">winning by self-draw</Yaku>.
  </p>
  <Tiles t="123m 456p 789s 11z 23s" caption="In tenpai, waiting on 1 or 4 of bamboo" />
  <Exercise id="tsumo" />
</Part>

<Part title="Ron needs a yaku in the hand">
  <p>
    Self-draw only counts as a yaku when you draw the tile yourself. Win the same hand on a discard (<Term id="ron"
      >ron</Term
    >) and it needs something else.
  </p>
  <Exercise id="ron" />
</Part>

<Part title="Riichi makes any closed hand winnable">
  <p>
    Declaring <Term id="riichi">riichi</Term> when your closed hand is in tenpai is a <Yaku id="riichi">yaku</Yaku> too. That is why closed hands
    usually declare it. See <a href="/learn/riichi">Riichi</a>.
  </p>
  <Exercise id="riichi" />
</Part>

<Part title="All simples: the easiest yaku">
  <Tiles t="234m 456p 678s 55m 33s" caption="Only tiles 2 to 8" />
  <p>
    A hand with only tiles 2 to 8, no 1s, 9s or honors, has the yaku <Yaku id="tanyao">tanyao</Yaku> (all simples). It
    wins by ron or self-draw, open or closed.
  </p>
  <p>
    <strong>Your first plan:</strong> keep the middle tiles and a pair of dragons, and keep your hand closed so you can
    declare riichi. Don't force <Yaku id="tanyao">all simples</Yaku> by breaking good shapes.
  </p>
  <Exercise id="simples" />
</Part>

<Part title="Open hands: the yaku is in the tiles">
  <p>
    After a call there is no <Yaku id="riichi">riichi</Yaku> and no <Yaku id="menzenTsumo">self-draw</Yaku> yaku. <Yaku id="tanyao">All simples</Yaku>
    still works, and so does a <Yaku id="yakuhai">triplet of dragons</Yaku> (<T t="555z" />, <T t="666z" />, <T t="777z" />),
    of your seat wind or of the round wind.
  </p>
  <Exercise id="open" />
</Part>

<Part title="Dora are not yaku">
  <p>
    <Term id="dora">Dora</Term> add value to a hand that can already win, but never make a hand winnable.
  </p>
  <Exercise id="dora" />
  <Callout kind="tip"><p>Your first five yaku are in <a href="/learn/first-yaku">Your first yaku</a>.</p></Callout>
</Part>
