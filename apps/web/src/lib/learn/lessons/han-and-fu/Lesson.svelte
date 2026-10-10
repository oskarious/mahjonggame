<script lang="ts">
  import { Exercise, Part, ScoreTable, Term } from '$lib/learn/components';
</script>

<Part title="Han and fu">
  <p>
    A hand's value has two parts. <Term id="han">Han</Term> come from yaku and dora; each one roughly doubles the score. <Term
      id="fu">Fu</Term
    > fine-tune it: most hands have 30 or 40. Counting fu is the <a href="/learn/counting-fu">next lesson</a>; until
    then the exercises tell you the fu. The game scores for you, but knowing roughly what a hand is worth helps you
    decide how to play it.
  </p>
  <Exercise id="count" />
</Part>

<Part title="The score table">
  <p>Look up han and fu. A non-dealer win by ron:</p>
  <ScoreTable />
  <Exercise id="points" />
</Part>

<Part title="The dealer and self-draw">
  <p>
    The <Term id="dealer">dealer</Term> wins 1.5 times as much. On a self-draw everyone pays a share: when the dealer wins,
    all pay the same ("1300 all").
  </p>
  <ScoreTable dealer tsumo />
  <Exercise id="dealer" />
</Part>

<Part title="Mangan: the first limit">
  <p>
    At 5 han, 4 han with 30 fu or more, or 3 han with 60 fu or more, the score is capped at a
    <Term id="mangan">mangan</Term>: 8000 (dealer 12000). Gold in the table.
  </p>
  <Exercise id="mangan" />
</Part>

<Part title="Bigger limits">
  <ul>
    <li><Term id="haneman">Haneman</Term>, 6-7 han: 12000 (dealer 18000).</li>
    <li><Term id="baiman">Baiman</Term>, 8-10 han: 16000 (dealer 24000).</li>
    <li>Sanbaiman, 11-12 han: 24000 (dealer 36000).</li>
    <li><Term id="yakuman">Yakuman</Term>: 32000 (dealer 48000).</li>
  </ul>
  <Exercise id="haneman" />
</Part>
