'use strict';
'require baseclass';
'require ui';

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

	_isGeneralMenu: function(name, title) {
		var s = ((name || '') + ' ' + (title || '')).toLowerCase();
		if (document.body.classList.contains('theme-openwrt'))
			return s.indexOf('status') >= 0 || s.indexOf('network') >= 0;
		return s.indexOf('status') >= 0;
	},

	_isSystemTopMenu: function(node) {
		var n = (node.name || '').toLowerCase();
		var systemNames = ['status', 'network', 'system', 'services', 'firewall', 'admin', 'opkg'];
		if (systemNames.indexOf(n) >= 0) return true;
		if (this._isVpnMenu(node)) return false;
		return false;
	},

	_isVpnMenu: function(node) {
		var s = ((node.name || '') + ' ' + (node.title || '')).toLowerCase();
		var keys = [
			'vpn', 'passwall', 'openclash', 'homeproxy', 'home-proxy', 'shadowsocks',
			'ssr', 'ssr-plus', 'v2ray', 'xray', 'wireguard', 'openvpn', 'zerotier',
			'ipsec', 'pptp', 'l2tp', 'clash', 'sing-box', 'singbox', 'neko', 'helloworld',
			'frpc', 'frps', 'trojan', 'tuic', 'hysteria', 'brook', 'gost', 'openconnect',
			'strongswan', 'n2n', 'tailscale', 'headscale', 'udp2raw', 'kcptun', 'turboacc',
			'proxy', 'bypass', 'subconverter', 'naive', 'snell', 'outline'
		];
		var i;

		for (i = 0; i < keys.length; i++) {
			if (s.indexOf(keys[i]) >= 0) return true;
		}

		var ik = this._iconKey(node.name);
		return ik === 'vpn' || ik === 'proxy';
	},

	_sortMenuEntries: function(topChildren) {
		var self = this;
		var general = [], advanced = [];

		topChildren.forEach(function(entry, index) {
			var node = entry.node || entry;
			var idx = entry.index != null ? entry.index : index;
			var item = { node: node, index: idx, virtual: false };
			if (self._isGeneralMenu(node.name, node.title))
				general.push(item);
			else
				advanced.push(item);
		});

		return general.concat(advanced);
	},

	_buildTopEntries: function(topChildren) {
		var self = this;
		var system = [], vpn = [], apps = [];

		topChildren.forEach(function(node, index) {
			var entry = { node: node, index: index, virtual: false };
			if (self._isSystemTopMenu(node))
				system.push(entry);
			else if (self._isVpnMenu(node))
				vpn.push(entry);
			else
				apps.push(entry);
		});

		var result = this._sortMenuEntries(system);

		if (vpn.length > 0) {
			result.push({
				virtual: true,
				name: '_echo_vpn',
				title: _('VPN'),
				iconName: 'vpn',
				members: vpn
			});
		}

		if (apps.length > 0) {
			result.push({
				virtual: true,
				name: '_echo_apps',
				title: _('Software'),
				iconName: 'software',
				members: apps
			});
		}

		return result;
	},

	_isVirtualActive: function(entry) {
		var cur = L.env.dispatchpath[0];
		var i;

		for (i = 0; i < entry.members.length; i++) {
			if (entry.members[i].node.name === cur)
				return true;
		}
		return false;
	},

	render: function(tree) {
		var topNav = document.getElementById('top-nav');
		if (!topNav) return;

		topNav.innerHTML = '';

		var moreMenu = document.getElementById('top-nav-more-menu');
		if (moreMenu) moreMenu.innerHTML = '';

		var subNav = document.getElementById('sub-nav');
		if (subNav) {
			subNav.innerHTML = '';
			subNav.classList.remove('active');
		}
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

		if (activeEntry)
			this._renderSubNav(activeEntry);

		this._renderTitle(tree);
		this._renderContentTabs(tree, activeEntry);
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

	_isTopActiveNode: function(topNode, index) {
		return L.env.requestpath.length
			? topNode.name === L.env.dispatchpath[0]
			: index === 0;
	},

	_firstLeafUrl: function(parts, node) {
		var children = ui.menu.getChildren(node);
		if (children.length === 0)
			return L.url.apply(L, parts);
		return this._firstLeafUrl(parts.concat([children[0].name]), children[0]);
	},

	renderTopItem: function(entry) {
		var isTopActive, topUrl, topNode, label, iconName;

		if (entry.virtual) {
			isTopActive = this._isVirtualActive(entry);
			topUrl = this._firstLeafUrl([entry.members[0].node.name], entry.members[0].node);
			label = entry.title;
			iconName = entry.iconName;
		} else {
			topNode = entry.node;
			isTopActive = this._isTopActiveNode(topNode, entry.index);
			topUrl = this._firstLeafUrl([topNode.name], topNode);
			label = topNode.title;
			iconName = topNode.name;
		}

		return E('div', {
			'class': 'nav-section' + (isTopActive ? ' is-active' : ''),
			'data-nav-item': '1'
		}, [
			E('a', {
				'class': 'nav-top' + (isTopActive ? ' active' : '') + (topNode && topNode.readonly ? ' readonly' : ''),
				'href': topUrl,
				'data-name': entry.virtual ? entry.name : topNode.name,
				'title': _(label)
			}, [
				this.getIcon(iconName, label),
				E('span', { 'class': 'nav-label' }, [ _(label) ])
			])
		]);
	},

	_renderSubNav: function(activeEntry) {
		var subNav = document.getElementById('sub-nav');
		if (!subNav) return;

		var self = this;
		var items = [];

		if (activeEntry.virtual) {
			if (activeEntry.members.length <= 1) return;
			activeEntry.members.forEach(function(m) {
				items.push({ node: m.node, active: L.env.dispatchpath[0] === m.node.name });
			});
		} else {
			var l2Children = ui.menu.getChildren(activeEntry.node);
			if (l2Children.length <= 1) return;
			l2Children.forEach(function(l2) {
				items.push({ node: l2, active: L.env.dispatchpath[1] === l2.name });
			});
		}

		items.forEach(function(item) {
			var l2 = item.node;
			var l3Children = ui.menu.getChildren(l2);
			var l2Url;

			if (activeEntry.virtual) {
				l2Url = self._firstLeafUrl([l2.name], l2);
			} else {
				l2Url = l3Children.length
					? self._firstLeafUrl([activeEntry.node.name, l2.name], l2)
					: L.url(activeEntry.node.name, l2.name);
			}

			subNav.appendChild(E('a', {
				'class': 'sub-nav-item' + (item.active ? ' active' : '') + (l2.readonly ? ' readonly' : ''),
				'href': l2Url
			}, [ E('span', { 'class': 'nav-label' }, [ _(l2.title) ]) ]));
		});

		subNav.classList.add('active');
		document.body.classList.add('has-sub-nav');
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

	_renderContentTabs: function(tree, activeEntry) {
		if (activeEntry && activeEntry.virtual) {
			var pluginName = L.env.dispatchpath[0];
			var memberNode = null;
			var i;

			for (i = 0; i < activeEntry.members.length; i++) {
				if (activeEntry.members[i].node.name === pluginName) {
					memberNode = activeEntry.members[i].node;
					break;
				}
			}

			if (!memberNode || L.env.dispatchpath.length < 2) return;
			this.renderTabMenu(memberNode, pluginName, 0, 1);
			return;
		}

		if (L.env.dispatchpath.length < 3) return;

		var node = tree;
		var url = '';
		var i;

		for (i = 0; i < 3 && node; i++) {
			node = node.children[L.env.dispatchpath[i]];
			url += (url ? '/' : '') + L.env.dispatchpath[i];
		}

		if (node) this.renderTabMenu(node, url, 0, 3);
	},

	renderTabMenu: function(tree, url, level, basePathIdx) {
		var container = document.getElementById('content-tabs');
		if (!container || container.dataset.echoAppTabs) return;

		var children = ui.menu.getChildren(tree);
		if (children.length === 0) return;

		var pathIdx = (basePathIdx != null ? basePathIdx : 3) + (level || 0);
		var activeNode = null;

		children.forEach(function(child) {
			var isActive = L.env.dispatchpath[pathIdx] === child.name;
			container.appendChild(E('a', {
				'class': 'content-tab' + (isActive ? ' active' : ''),
				'href': L.url(url, child.name)
			}, [ _(child.title) ]));
			if (isActive) activeNode = child;
		});

		container.classList.add('active');
		document.body.classList.add('has-content-tabs');

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
