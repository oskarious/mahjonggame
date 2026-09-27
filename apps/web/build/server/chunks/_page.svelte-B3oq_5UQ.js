import { h as head, b as attr_class, c as attr, d as ensure_array_like, e as escape_html } from './index.js-BJkQVdam.js';
import './client-DoPM41nP.js';

//#endregion
//#region ../../packages/engine/src/bot-ratings.ts
var BOT_RATINGS = [
	{
		skill: 0,
		elo: 1283
	},
	{
		skill: .15,
		elo: 1325
	},
	{
		skill: .3,
		elo: 1413
	},
	{
		skill: .45,
		elo: 1500
	},
	{
		skill: .6,
		elo: 1558
	},
	{
		skill: .75,
		elo: 1607
	},
	{
		skill: .9,
		elo: 1630
	},
	{
		skill: 1,
		elo: 1634
	}
];
/** The measured table, made non-decreasing (neighbouring levels can swap by noise). */
var CURVE = (() => {
	let best = -Infinity;
	return [...BOT_RATINGS].sort((a, b) => a.skill - b.skill).map((r) => ({
		skill: r.skill,
		elo: best = Math.max(best, r.elo)
	}));
})();
/** Elo range the bots cover, weakest to strongest. */
var BOT_ELO_RANGE = [CURVE[0].elo, CURVE[CURVE.length - 1].elo];
//#endregion
//#region src/lib/bots.ts
/** Five opponent strengths spread evenly over what the bots can play at, rounded to tens. */
var BOT_PRESETS = (() => {
	const [lo, hi] = BOT_ELO_RANGE;
	return Array.from({ length: 5 }, (_, i) => Math.round((lo + (hi - lo) * i / 4) / 10) * 10);
})();
var DEFAULT_BOT_ELO = BOT_PRESETS[2];

//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let bots = DEFAULT_BOT_ELO;
		let hints = "waits";
		head("1uha8ag", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>Riichi</title>`);
			});
		});
		$$renderer.push(`<main class="svelte-1uha8ag"><div class="logo svelte-1uha8ag" aria-hidden="true"><img src="/tiles/Chun.svg" alt="" class="svelte-1uha8ag"/></div> <h1 class="svelte-1uha8ag">Riichi</h1> <p class="tag svelte-1uha8ag">Quick riichi mahjong. One hand, portrait, no fluff.</p> <form class="svelte-1uha8ag"><fieldset class="svelte-1uha8ag"><legend class="svelte-1uha8ag">Length</legend> <div class="seg svelte-1uha8ag"><label${attr_class("svelte-1uha8ag", void 0, { "on": true })}><input type="radio"${attr("checked", true, true)} value="east" class="svelte-1uha8ag"/>East only</label> <label${attr_class("svelte-1uha8ag", void 0, { "on": false })}><input type="radio"${attr("checked", false, true)} value="south" class="svelte-1uha8ag"/>East + South</label></div></fieldset> <fieldset class="svelte-1uha8ag"><legend class="svelte-1uha8ag">Rules</legend> <div class="seg svelte-1uha8ag"><label${attr_class("svelte-1uha8ag", void 0, { "on": true })}><input type="radio"${attr("checked", true, true)} value="default" class="svelte-1uha8ag"/>Online</label> <label${attr_class("svelte-1uha8ag", void 0, { "on": false })}><input type="radio"${attr("checked", false, true)} value="ema" class="svelte-1uha8ag"/>EMA 2025</label></div></fieldset> <fieldset class="svelte-1uha8ag"><legend class="svelte-1uha8ag">Opponents</legend> <div class="seg elo svelte-1uha8ag"><!--[-->`);
		const each_array = ensure_array_like(BOT_PRESETS);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let elo = each_array[$$index];
			$$renderer.push(`<label${attr_class("svelte-1uha8ag", void 0, { "on": bots === elo })}><input type="radio"${attr("checked", bots === elo, true)}${attr("value", elo)} class="svelte-1uha8ag"/>${escape_html(elo)}</label>`);
		}
		$$renderer.push(`<!--]--></div></fieldset> <fieldset class="svelte-1uha8ag"><legend class="svelte-1uha8ag">Hints</legend> `);
		$$renderer.select({ value: hints }, ($$renderer) => {
			$$renderer.option({ value: "off" }, ($$renderer) => {
				$$renderer.push(`Off`);
			});
			$$renderer.option({ value: "distance" }, ($$renderer) => {
				$$renderer.push(`Distance ("3 away")`);
			});
			$$renderer.option({ value: "waits" }, ($$renderer) => {
				$$renderer.push(`+ Waiting tiles`);
			});
			$$renderer.option({ value: "full" }, ($$renderer) => {
				$$renderer.push(`+ Discard advice`);
			});
		});
		$$renderer.push(`</fieldset> <button class="btn primary big svelte-1uha8ag" type="submit">Play vs bots</button></form></main>`);
	});
}

export { _page as default };
//# sourceMappingURL=_page.svelte-B3oq_5UQ.js.map
