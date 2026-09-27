const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["tiles/Back.svg","tiles/Blank.svg","tiles/Chun.svg","tiles/Front.svg","tiles/Haku.svg","tiles/Hatsu.svg","tiles/LICENSE.md","tiles/Man1.svg","tiles/Man2.svg","tiles/Man3.svg","tiles/Man4.svg","tiles/Man5-Dora.svg","tiles/Man5.svg","tiles/Man6.svg","tiles/Man7.svg","tiles/Man8.svg","tiles/Man9.svg","tiles/Nan.svg","tiles/Pei.svg","tiles/Pin1.svg","tiles/Pin2.svg","tiles/Pin3.svg","tiles/Pin4.svg","tiles/Pin5-Dora.svg","tiles/Pin5.svg","tiles/Pin6.svg","tiles/Pin7.svg","tiles/Pin8.svg","tiles/Pin9.svg","tiles/Shaa.svg","tiles/Sou1.svg","tiles/Sou2.svg","tiles/Sou3.svg","tiles/Sou4.svg","tiles/Sou5-Dora.svg","tiles/Sou5.svg","tiles/Sou6.svg","tiles/Sou7.svg","tiles/Sou8.svg","tiles/Sou9.svg","tiles/Ton.svg"]),
	mimeTypes: {".svg":"image/svg+xml",".md":"text/markdown"},
	_: {
		client: {start:"_app/immutable/entry/start.DZyyZjph.js",app:"_app/immutable/entry/app.B-QH2mWQ.js",imports:["_app/immutable/entry/start.DZyyZjph.js","_app/immutable/chunks/bNtj3W_F.js","_app/immutable/chunks/BQA8c7JN.js","_app/immutable/entry/app.B-QH2mWQ.js","_app/immutable/chunks/BQA8c7JN.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./0-QI9PnNx_.js')),
			__memo(() => import('./1-DszCBKQ8.js')),
			__memo(() => import('./2-5HcmuCm-.js')),
			__memo(() => import('./3-DOzbU7m-.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/play",
				pattern: /^\/play\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export { manifest as m };
//# sourceMappingURL=manifest.js-BcB53evw.js.map
