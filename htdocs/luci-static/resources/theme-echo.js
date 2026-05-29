'use strict';
'require baseclass';

return baseclass.extend({
	ORDER: ['auto', 'light', 'dark'],

	read: function() {
		try {
			var s = localStorage.getItem('echo-theme');
			return this.ORDER.indexOf(s) >= 0 ? s : 'auto';
		} catch (e) {
			return 'auto';
		}
	},

	label: function(mode) {
		var labels = {
			auto: _('Theme: Auto (System)'),
			light: _('Theme: Light'),
			dark: _('Theme: Dark')
		};
		return labels[mode] || mode;
	},

	apply: function(mode) {
		var d = document.getElementById('dark-styles');
		var m = document.getElementById('meta-theme-color');
		document.documentElement.dataset.theme = mode;

		if (mode === 'dark') {
			if (d) d.media = 'all';
			if (m) m.content = '#000000';
		} else if (mode === 'light') {
			if (d) d.media = 'not all';
			if (m) m.content = '#f5f5f7';
		} else {
			if (d) d.media = '(prefers-color-scheme: dark)';
			var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
			if (m) m.content = dark ? '#000000' : '#f5f5f7';
		}
	},

	updateToggle: function(mode) {
		var btn = document.getElementById('theme-toggle');
		if (!btn) return;
		var text = this.label(mode);
		btn.title = text;
		btn.setAttribute('aria-label', text);
	},

	cycle: function() {
		var cur = this.read();
		var idx = this.ORDER.indexOf(cur);
		var next = this.ORDER[(idx + 1) % this.ORDER.length];
		try { localStorage.setItem('echo-theme', next); } catch (e) {}
		this.apply(next);
		this.updateToggle(next);
		return next;
	},

	__init__: function() {
		var mode = this.read();
		this.apply(mode);
		this.updateToggle(mode);

		var btn = document.getElementById('theme-toggle');
		if (btn)
			btn.addEventListener('click', L.bind(this.cycle, this));

		if (window.matchMedia) {
			window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', L.bind(function() {
				if (this.read() === 'auto')
					this.apply('auto');
			}, this));
		}
	}
});
