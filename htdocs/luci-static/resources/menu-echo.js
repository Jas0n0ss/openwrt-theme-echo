'use strict';
'require baseclass';
'require ui';
'require menu-bootstrap-core as EchoMenu';

/*
 * Echo navigation — DOM/skin is custom; menu rules follow menu-bootstrap.js
 * (mode menu → sub menu → tab menu). See menu-bootstrap-core.js.
 */
return baseclass.extend({
	__init__: function() {
		this._overflowBound = false;
		ui.menu.load().then(L.bind(this.render, this));
		document.addEventListener('visibilitychange', L.bind(function() {
			if (!document.hidden)
				ui.menu.load().then(L.bind(this.render, this));
		}, this));
	},

	_iconBase: null,
	_iconKeys: null,

	iconFiles: {
		'status': 'status.svg',
		'network': 'network.svg',
		'system': 'system.svg',
		'admin': 'system.svg',
		'services': 'services.svg',
		'wireless': 'wireless.svg',
		'wifi': 'wireless.svg',
		'firewall': 'firewall.svg',
		'vpn': 'vpn.svg',
		'software': 'store.svg',
		'openvpn': 'vpn.svg',
		'wireguard': 'vpn.svg',
		'docker': 'docker.svg',
		'passwall': 'proxy.svg',
		'openclash': 'proxy.svg',
		'homeproxy': 'proxy.svg',
		'shadowsocks': 'proxy.svg',
		'v2ray': 'proxy.svg',
		'ssr': 'proxy.svg',
		'mosdns': 'dns.svg',
		'smartdns': 'dns.svg',
		'adguard': 'firewall.svg',
		'adguardhome': 'firewall.svg',
		'banip': 'firewall.svg',
		'nas': 'storage.svg',
		'samba': 'storage.svg',
		'filebrowser': 'storage.svg',
		'diskman': 'storage.svg',
		'statistics': 'statistics.svg',
		'nlbwmon': 'statistics.svg',
		'netdata': 'statistics.svg',
		'ddns': 'dns.svg',
		'upnp': 'services.svg',
		'transmission': 'download.svg',
		'aria2': 'download.svg',
		'ttyd': 'terminal.svg',
		'istore': 'store.svg',
		'store': 'store.svg',
		'acme': 'vpn.svg',
		'frpc': 'proxy.svg',
		'frps': 'proxy.svg',
		'turboacc': 'proxy.svg',
		'watchcat': 'status.svg',
		'clients': 'clients.svg',
		'_default': 'default.svg'
	},

	_getIconBase: function() {
		if (this._iconBase) return this._iconBase;

		var link = document.querySelector('link[href*="/luci-static/echo/"]');
		if (link) {
			var href = link.getAttribute('href') || '';
			var m = href.match(/^(.*\/luci-static\/echo\/)/);
			if (m) {
				this._iconBase = m[1] + 'icons/menu/';
				return this._iconBase;
			}
		}

		this._iconBase = '/luci-static/echo/icons/menu/';
		return this._iconBase;
	},

	_getIconKeys: function() {
		if (!this._iconKeys) {
			this._iconKeys = Object.keys(this.iconFiles)
				.filter(function(k) { return k !== '_default'; })
				.sort(function(a, b) { return b.length - a.length; });
		}
		return this._iconKeys;
	},

	_iconKey: function(name) {
		if (!name) return '_default';
		if (this.iconFiles[name]) return name;
		var lower = (name + '').toLowerCase();
		var keys = this._getIconKeys();
		for (var i = 0; i < keys.length; i++) {
			if (lower.indexOf(keys[i]) >= 0)
				return keys[i];
		}
		return '_default';
	},

	getIcon: function(name, title) {
		var key = this._iconKey(name);
		var file = this.iconFiles[key] || this.iconFiles._default;
		var url = this._getIconBase() + file;

		if (key === '_default' && title) {
			var letter = (title + '').trim().charAt(0).toUpperCase() || '?';
			return E('span', { 'class': 'nav-icon nav-icon-letter' }, [ letter ]);
		}

		return E('span', {
			'class': 'nav-icon nav-icon-mask',
			'style': '-webkit-mask-image:url("' + url + '");mask-image:url("' + url + '");',
			'title': _(title || name),
			'aria-hidden': 'true'
		});
	},

	_buildTopEntries: function(topChildren) {
		return EchoMenu.sortTopChildren(topChildren);
	},

	render: function(tree) {
		var topNav = document.getElementById('top-nav');
		if (!topNav) return;

		topNav.innerHTML = '';

		var moreMenu = document.getElementById('top-nav-more-menu');
		if (moreMenu) moreMenu.innerHTML = '';

		document.body.classList.remove('has-sub-nav');

		var contentTabs = document.getElementById('content-tabs');
		if (contentTabs) {
			delete contentTabs.dataset.echoAppTabs;
			contentTabs.innerHTML = '';
			contentTabs.classList.remove('active');
		}
		document.body.classList.remove('has-content-tabs');

		var topChildren = ui.menu.getChildren(tree);
		if (topChildren.length === 0) return;

		var self = this;
		var entries = this._buildTopEntries(topChildren);
		var activeEntry = null;

		entries.forEach(function(entry) {
			var section = self.renderTopItem(entry);
			topNav.appendChild(section);
			if (section.classList.contains('is-active'))
				activeEntry = entry;
		});

		topNav.appendChild(this.renderLogoutItem());

		document.querySelectorAll('#echo-nav-bar .nav-section.has-dropdown .nav-dropdown').forEach(function(panel) {
			panel.setAttribute('hidden', '');
			panel.setAttribute('aria-hidden', 'true');
		});

		if (activeEntry && this._getSubItems(activeEntry).length > 0)
			document.body.classList.add('has-sub-nav');
		else
			document.body.classList.remove('has-sub-nav');

		this._closeAllDropdowns();
		this._bindDropdowns();
		this._renderTitle(tree);
		this._renderContentTabs(tree);
		document.body.dataset.page = L.env.requestpath.join('-') || 'home';

		this._syncNavCenter();
		this._syncNavOverflow();
		if (!this._overflowBound) {
			this._overflowBound = true;
			window.addEventListener('resize', L.bind(function() {
				this._syncNavCenter();
				this._syncNavOverflow();
			}, this));
			this._bindMoreMenu();
		}
	},

	_getSubItems: function(entry) {
		var self = this;
		var items = [];

		if (!entry || !entry.node) return items;

		var l2Children = ui.menu.getChildren(entry.node);
		if (l2Children.length === 0) return items;

		l2Children.forEach(function(l2) {
			items.push(self._makeL2Item(l2, entry.node));
		});

		return items;
	},

	_makeL2Item: function(l2, topNode) {
		return {
			node: l2,
			active: L.env.dispatchpath[1] === l2.name,
			url: EchoMenu.l2ItemHref(topNode, l2)
		};
	},

	_navCaret: function() {
		return E('span', { 'class': 'nav-caret', 'aria-hidden': 'true' }, [
			E('svg', {
				'viewBox': '0 0 24 24',
				'fill': 'none',
				'stroke': 'currentColor',
				'stroke-width': '2',
				'width': '12',
				'height': '12'
			}, [
				E('path', { 'd': 'M6 9l6 6 6-6' })
			])
		]);
	},

	renderTopItem: function(entry) {
		var topNode = entry.node;
		var isTopActive = EchoMenu.isModeActive(topNode, entry.index);
		var label = topNode.title;
		var iconName = topNode.name;
		var subItems = this._getSubItems(entry);
		var topHref = EchoMenu.topLevelHref(topNode);
		var sectionChildren;

		sectionChildren = [
			E('a', {
				'class': 'nav-top' +
					(isTopActive ? ' active' : '') +
					(subItems.length > 0 ? ' nav-top-trigger' : '') +
					(topNode.readonly ? ' readonly' : ''),
				'href': topHref,
				'data-name': topNode.name,
				'title': _(label),
				'aria-haspopup': subItems.length ? 'true' : null,
				'aria-expanded': 'false'
			}, [
				this.getIcon(iconName, label),
				E('span', { 'class': 'nav-label' }, [ _(label) ]),
				subItems.length ? this._navCaret() : ''
			])
		];

		if (subItems.length > 0) {
			sectionChildren.push(E('div', {
				'class': 'nav-dropdown',
				'hidden': '',
				'aria-hidden': 'true'
			},
				subItems.map(L.bind(function(item) {
					return E('a', {
						'class': 'nav-dropdown-item' + (item.active ? ' active' : '') +
							(item.node.readonly ? ' readonly' : ''),
						'href': item.url
					}, [ E('span', { 'class': 'nav-label' }, [ _(item.node.title) ]) ]);
				}, this))
			));
		}

		return E('div', {
			'class': 'nav-section' +
				(isTopActive ? ' is-active' : '') +
				(subItems.length > 0 ? ' has-dropdown' : ''),
			'data-nav-item': '1'
		}, sectionChildren);
	},

	renderLogoutItem: function() {
		return E('div', { 'class': 'nav-section nav-logout' }, [
			E('a', {
				'class': 'nav-top nav-logout-link',
				'href': L.url('logout'),
				'title': _('Logout')
			}, [
				E('span', { 'class': 'nav-label' }, [ _('Logout') ])
			])
		]);
	},

	_bindDropdowns: function() {
		var navBar = document.getElementById('echo-nav-bar');
		if (!navBar || this._dropdownBound) return;

		var self = this;
		this._dropdownBound = true;

		navBar.addEventListener('click', function(e) {
			var section = e.target.closest('.nav-section.has-dropdown');
			if (!section) return;

			if (e.target.closest('.nav-dropdown-item'))
				return;

			var btn = section.querySelector('.nav-top');
			if (!btn || e.target.closest('.nav-top') !== btn)
				return;

			e.preventDefault();
			e.stopPropagation();

			var open = !section.classList.contains('open');
			self._closeAllDropdowns();

			if (open) {
				section.classList.add('open');
				btn.setAttribute('aria-expanded', 'true');
				self._setDropdownOpen(section, true);
			}
		});

		document.addEventListener('click', function(e) {
			if (e.target.closest('.nav-section.has-dropdown > .nav-top'))
				return;
			self._closeAllDropdowns();
		});
	},

	_setDropdownOpen: function(section, open) {
		var panel = section && section.querySelector('.nav-dropdown');
		if (!panel) return;

		if (open) {
			panel.removeAttribute('hidden');
			panel.setAttribute('aria-hidden', 'false');
		} else {
			panel.setAttribute('hidden', '');
			panel.setAttribute('aria-hidden', 'true');
		}
	},

	_closeAllDropdowns: function() {
		var self = this;
		document.querySelectorAll('.nav-section.has-dropdown').forEach(function(s) {
			s.classList.remove('open');
			var b = s.querySelector('.nav-top');
			if (b) b.setAttribute('aria-expanded', 'false');
			self._setDropdownOpen(s, false);
		});
	},

	_syncNavCenter: function() {
		var brand = document.querySelector('.header-brand');
		var actions = document.querySelector('.header-actions');
		if (!brand || !actions) return;

		var width = Math.max(brand.offsetWidth, actions.offsetWidth, 120);
		document.documentElement.style.setProperty('--echo-nav-side-width', width + 'px');
	},

	_syncNavOverflow: function() {
		var shell = document.querySelector('.top-nav-shell');
		var wrap = document.querySelector('.top-nav-wrap');
		var nav = document.getElementById('top-nav');
		var moreWrap = document.getElementById('top-nav-more');
		var moreMenu = document.getElementById('top-nav-more-menu');
		if (!shell || !wrap || !nav || !moreWrap || !moreMenu) return;

		var sections = Array.prototype.slice.call(nav.querySelectorAll('[data-nav-item]'));
		var hidden = Array.prototype.slice.call(moreMenu.querySelectorAll('[data-nav-item]'));

		hidden.forEach(function(el) {
			nav.appendChild(el);
		});
		moreMenu.innerHTML = '';
		moreWrap.hidden = true;
		moreWrap.classList.remove('open');

		if (sections.length === 0) return;

		var btn = document.getElementById('top-nav-more-btn');
		var btnWidth = btn ? btn.offsetWidth + 8 : 72;
		var available = shell.clientWidth - btnWidth;

		while (sections.length > 1 && nav.scrollWidth > available) {
			var last = sections.pop();
			moreMenu.insertBefore(last, moreMenu.firstChild);
			moreWrap.hidden = false;
		}
	},

	_bindMoreMenu: function() {
		var moreWrap = document.getElementById('top-nav-more');
		var btn = document.getElementById('top-nav-more-btn');
		if (!moreWrap || !btn) return;

		btn.addEventListener('click', function(e) {
			e.stopPropagation();
			var open = moreWrap.classList.toggle('open');
			btn.setAttribute('aria-expanded', open ? 'true' : 'false');
			var menu = document.getElementById('top-nav-more-menu');
			if (menu) menu.hidden = !open;
		});

		document.addEventListener('click', function() {
			moreWrap.classList.remove('open');
			btn.setAttribute('aria-expanded', 'false');
			var menu = document.getElementById('top-nav-more-menu');
			if (menu) menu.hidden = true;
		});
	},

	_renderTitle: function(tree) {
		var titleEl = document.getElementById('header-title');
		var crumbEl = document.getElementById('header-breadcrumb');
		if (!titleEl) return;

		if (document.body.classList.contains('has-sub-nav')) {
			titleEl.textContent = '';
			if (crumbEl) crumbEl.textContent = '';
			return;
		}

		var node = tree;
		var parts = [];
		var title = '';
		var i;

		for (i = 0; i < L.env.dispatchpath.length && node; i++) {
			node = node.children[L.env.dispatchpath[i]];
			if (node && node.title) {
				title = node.title;
				parts.push(_(node.title));
			}
		}

		titleEl.textContent = title ? _(title) : '';
		if (crumbEl)
			crumbEl.textContent = parts.length > 1 ? parts.slice(0, -1).join(' › ') : '';
	},

	_renderContentTabs: function(tree) {
		if (!EchoMenu.shouldRenderContentTabs()) return;

		var root = EchoMenu.resolveTabRoot(tree);
		if (root) this.renderTabMenu(root.node, root.url, 0, 3);
	},

	/* Same depth/path rules as menu-bootstrap.js renderTabMenu */
	renderTabMenu: function(tree, url, level, basePathIdx) {
		var container = document.getElementById('content-tabs');
		var tabHook = document.getElementById('tabmenu');
		if (!container || container.dataset.echoAppTabs) return;

		var children = ui.menu.getChildren(tree);
		if (children.length === 0) return;

		var pathIdx = (basePathIdx != null ? basePathIdx : 3) + (level || 0);
		var activeNode = null;

		children.forEach(function(child) {
			var isActive = L.env.dispatchpath[pathIdx] === child.name;
			var className = 'content-tab tabmenu-item-' + child.name + (isActive ? ' active' : '');

			container.appendChild(E('a', {
				'class': className,
				'href': L.url(url, child.name)
			}, [ _(child.title) ]));

			if (isActive) activeNode = child;
		});

		container.classList.add('active');
		container.style.display = '';
		document.body.classList.add('has-content-tabs');

		if (tabHook) {
			tabHook.innerHTML = '';
			tabHook.style.display = 'none';
		}

		if (activeNode)
			this.renderTabMenu(activeNode, url + '/' + activeNode.name, (level || 0) + 1, basePathIdx);

		if ((level || 0) === 0 && !container.querySelector('.tab-slider'))
			this._addTabUnderline(container);
	},

	_addTabUnderline: function(container) {
		container.querySelectorAll('.content-tab').forEach(function(tab) {
			tab.addEventListener('click', function() {
				container.querySelectorAll('.content-tab.active').forEach(function(t) {
					t.classList.remove('active');
				});
				tab.classList.add('active');
			});
		});
	}
});
