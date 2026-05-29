'use strict';
'require baseclass';
'require rpc';
'require uci';
'require fs';
'require network';

var callGetBuiltinEthernetPorts = rpc.declare({
	object: 'luci',
	method: 'getBuiltinEthernetPorts',
	expect: { result: [] }
});

var callNetworkDeviceStatus = rpc.declare({
	object: 'network.device',
	method: 'status',
	params: [ 'name' ],
	expect: { '': {} }
});

var callNetworkDeviceStatusAll = rpc.declare({
	object: 'network.device',
	method: 'status',
	expect: { '': {} }
});

var callInterfaceDump = rpc.declare({
	object: 'network.interface',
	method: 'dump',
	expect: { interface: [] }
});

return baseclass.extend({
	__init__: function() {
		this.enabled = true;
		this.container = null;
		this._leasesBody = null;
		this._ifaceBody = null;
		this._portsEl = null;
		this._wifiEl = null;
		this._portsModule = null;
		this._wifiModule = null;
		this._mapDivider = null;
		this._mapPanel = null;

		uci.load('echo').then(L.bind(function() {
			this.enabled = uci.get('echo', 'global', 'dashboard') !== '0';
			if (this.enabled) this.init();
		}, this)).catch(function() { this.init(); }.bind(this));
	},

	init: function() {
		var main = document.getElementById('maincontent');
		if (!main) return;

		this.watchPage();
		new MutationObserver(L.bind(this.watchPage, this)).observe(main, {
			childList: true,
			subtree: false
		});
		this.poll();
	},

	isOverviewPage: function() {
		var rp = L.env.requestpath.join('/');
		return rp === 'admin/status/overview' ||
			(document.body.dataset.page || '') === 'admin-status-overview';
	},

	watchPage: function() {
		if (!this.enabled || !this.isOverviewPage()) {
			if (this.container) {
				this.container.remove();
				this.container = null;
			}
			document.body.classList.remove('echo-has-overview');
			return;
		}

		var main = document.getElementById('maincontent');
		if (!main || main.querySelector('#echo-overview')) return;

		this.container = this.buildOverview();
		main.insertBefore(this.container, main.firstChild);
		document.body.classList.add('echo-has-overview');
	},

	buildNetworkMap: function() {
		this._portsEl = E('div', { 'class': 'echo-map-ports' });
		this._wifiEl = E('div', { 'class': 'echo-map-wifi' });
		this._portsModule = E('div', { 'class': 'echo-map-module echo-map-module-ports' }, [
			E('div', { 'class': 'echo-map-module-head' }, [ _('Port Status') ]),
			E('div', { 'class': 'echo-map-module-inner' }, [ this._portsEl ])
		]);
		this._mapDivider = E('div', { 'class': 'echo-map-divider', 'aria-hidden': 'true' });
		this._wifiModule = E('div', { 'class': 'echo-map-module echo-map-module-wifi' }, [
			E('div', { 'class': 'echo-map-module-head' }, [ _('WiFi Radios') ]),
			E('div', { 'class': 'echo-map-module-inner' }, [ this._wifiEl ])
		]);

		this._mapPanel = E('div', { 'class': 'cbi-section echo-panel echo-network-map echo-map-full' }, [
			E('div', { 'class': 'cbi-section-head' }, [ _('Network Map') ]),
			E('div', { 'class': 'echo-map-body' }, [
				this._portsModule,
				this._mapDivider,
				this._wifiModule
			])
		]);

		return this._mapPanel;
	},

	buildOverview: function() {
		this._sysBody = E('tbody', {});
		this._ifaceBody = E('tbody', {});
		this._trafficBody = E('tbody', {});
		this._leasesBody = E('tbody', {});

		return E('div', { id: 'echo-overview', 'class': 'echo-overview' }, [
			this.buildNetworkMap(),
			E('div', { 'class': 'echo-overview-divider', 'aria-hidden': 'true' }),
			E('div', { 'class': 'echo-overview-grid' }, [
				this.panel(_('System Resources'), this.table([
					E('thead', {}, [ E('tr', {}, [
						E('th', {}, [ _('Item') ]),
						E('th', {}, [ _('Value') ]),
						E('th', { 'class': 'echo-col-narrow' }, [ _('Status') ])
					]) ]),
					this._sysBody
				])),
				this.panel(_('Network Interfaces'), this.table([
					E('thead', {}, [ E('tr', {}, [
						E('th', {}, [ _('Interface') ]),
						E('th', {}, [ _('Protocol') ]),
						E('th', {}, [ _('Address') ]),
						E('th', { 'class': 'echo-col-narrow' }, [ _('Status') ])
					]) ]),
					this._ifaceBody
				])),
				this.panel(_('Traffic Summary'), this.table([
					E('thead', {}, [ E('tr', {}, [
						E('th', {}, [ _('Interface') ]),
						E('th', {}, [ _('Download') ]),
						E('th', {}, [ _('Upload') ]),
						E('th', {}, [ _('Total') ])
					]) ]),
					this._trafficBody
				])),
				this.panel(_('Active Clients'), this.table([
					E('thead', {}, [ E('tr', {}, [
						E('th', {}, [ _('Hostname') ]),
						E('th', {}, [ _('IP Address') ]),
						E('th', {}, [ _('MAC') ])
					]) ]),
					this._leasesBody
				]))
			]),
			E('p', { 'class': 'echo-overview-note' }, [
				_('Primary status at a glance. Detailed metrics are shown in the sections below.')
			])
		]);
	},

	panel: function(title, tableEl) {
		return E('div', { 'class': 'cbi-section echo-panel' }, [
			E('div', { 'class': 'cbi-section-head' }, [ title ]),
			tableEl
		]);
	},

	table: function(children) {
		return E('table', { 'class': 'echo-data-table' }, children);
	},

	statusBadge: function(ok, label) {
		return E('span', { 'class': 'label ' + (ok ? 'success' : 'important') }, [
			label || (ok ? _('Online') : _('Offline'))
		]);
	},

	formatBytes: function(n) {
		if (!n || n < 0) return '0 B';
		var u = ['B', 'KB', 'MB', 'GB', 'TB'];
		var i = 0;
		while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
		return n.toFixed(i ? 1 : 0) + ' ' + u[i];
	},

	formatUptime: function(s) {
		if (!s) return '—';
		var d = Math.floor(s / 86400);
		var h = Math.floor((s % 86400) / 3600);
		var m = Math.floor((s % 3600) / 60);
		if (d > 0) return d + 'd ' + h + 'h ' + m + 'm';
		if (h > 0) return h + 'h ' + m + 'm';
		return m + 'm';
	},

	formatSpeedMbps: function(mbps) {
		mbps = parseInt(mbps, 10);
		if (isNaN(mbps) || mbps < 0) return '—';
		if (mbps >= 10000) return '10G';
		if (mbps >= 5000) return '5G';
		if (mbps >= 2500) return '2.5G';
		if (mbps >= 1000) return '1G';
		if (mbps >= 100) return '100M';
		if (mbps > 0) return mbps + 'M';
		return '—';
	},

	isVirtualNetdev: function(name, dev) {
		if (!name || name === 'lo') return true;
		if (/^@(lan|wan|\d+)/.test(name)) return true;
		if (/^(br-|docker|veth|tun|tap|wg|ppp|mv-|ifb|erspan)/.test(name)) return true;
		if (dev && (dev.wireless || dev.type === 'bridge')) return true;
		return false;
	},

	guessPortRole: function(device, ifaces) {
		var lname = (device || '').toLowerCase();
		if (lname.indexOf('wan') >= 0) return 'WAN';

		var i;
		for (i = 0; i < (ifaces || []).length; i++) {
			var iface = ifaces[i];
			var iname = (iface.interface || '').toLowerCase();
			var idev = (iface.device || iface.l3_device || '').toLowerCase();
			if (idev === lname && iname.indexOf('wan') >= 0) return 'WAN';
		}

		return 'LAN';
	},

	updateNetworkMapLayout: function(portCount, wifiCount) {
		if (this._portsModule)
			this._portsModule.hidden = portCount === 0;
		if (this._wifiModule)
			this._wifiModule.hidden = wifiCount === 0;
		if (this._mapDivider)
			this._mapDivider.hidden = !(portCount > 0 && wifiCount > 0);
		if (this._mapPanel)
			this._mapPanel.hidden = portCount === 0 && wifiCount === 0;
	},

	mapEmptyNote: function(msg) {
		return E('p', { 'class': 'echo-map-empty' }, [ msg ]);
	},

	wifiGeneration: function(hwmode, band) {
		band = (band || '').toLowerCase();
		hwmode = (hwmode || '').toLowerCase();
		if (hwmode === 'be' || band === '6g') return _('Wi-Fi 7');
		if (hwmode === 'ax' || hwmode === 'axg') return _('Wi-Fi 6');
		if (hwmode === 'ac' || hwmode === 'nac') return _('Wi-Fi 5');
		if (hwmode === 'n') return _('Wi-Fi 4');
		return _('Wi-Fi');
	},

	bandLabel: function(band) {
		var map = {
			'2g': _('2.4 GHz'),
			'5g': _('5 GHz'),
			'6g': _('6 GHz')
		};
		return map[(band || '').toLowerCase()] || band || '—';
	},

	portRole: function(role) {
		if (role === 'WAN') return _('WAN');
		if (role === 'LAN') return _('LAN');
		return role;
	},

	loadLabel: function(v) {
		v = parseFloat(v);
		if (v >= 1.5) return [_('High'), false];
		if (v >= 0.8) return [_('Moderate'), true];
		return [_('Normal'), true];
	},

	setRow: function(tbody, id, cells) {
		var row = document.getElementById('echo-row-' + id);
		if (!row) {
			row = E('tr', { id: 'echo-row-' + id });
			tbody.appendChild(row);
		}
		row.innerHTML = '';
		cells.forEach(function(c) {
			row.appendChild(E('td', {}, [ c ]));
		});
	},

	poll: function() {
		if (!this.enabled) return;
		var self = this;
		Promise.all([
			this.fetchSystem(),
			this.fetchNetwork(),
			this.fetchLeases(),
			this.fetchNetworkMap()
		]).finally(function() {
			window.setTimeout(function() { self.poll(); }, 10000);
		});
	},

	fetchSystem: function() {
		var self = this;
		if (!this._sysBody) return Promise.resolve();

		return Promise.all([
			rpc.declare({ object: 'system', method: 'info' })(),
			rpc.declare({ object: 'system', method: 'board' })().catch(function() { return {}; })
		]).then(function(res) {
			var info = res[0] || {};
			var board = res[1] || {};
			var load = info.load || [0, 0, 0];
			var l1 = load[0] / 65536;
			var l5 = load[1] / 65536;
			var l15 = load[2] / 65536;
			var ls = self.loadLabel(l1);

			self.setRow(self._sysBody, 'cpu', [
				_('CPU Load (1 / 5 / 15 min)'),
				l1.toFixed(2) + ' / ' + l5.toFixed(2) + ' / ' + l15.toFixed(2),
				self.statusBadge(ls[1], ls[0])
			]);

			var mem = info.memory || {};
			var total = mem.total || 0;
			var free = mem.free || 0;
			var buffered = mem.buffered || 0;
			var cached = mem.cached || 0;
			var used = Math.max(0, total - free - buffered - cached);
			var pct = total ? Math.round((used / total) * 100) : 0;

			self.setRow(self._sysBody, 'mem', [
				_('Memory'),
				self.formatBytes(used) + ' / ' + self.formatBytes(total) + ' (' + pct + '%)',
				self.statusBadge(pct < 90, pct >= 90 ? _('High') : _('Normal'))
			]);

			self.setRow(self._sysBody, 'uptime', [
				_('Uptime'),
				self.formatUptime(info.uptime),
				self.statusBadge(true, _('Running'))
			]);

			if (board.model || board.system) {
				self.setRow(self._sysBody, 'board', [
					_('Device'),
					[ board.model || board.system || '—', board.release ? (' · ' + board.release.description) : '' ].join(''),
					self.statusBadge(true, _('OK'))
				]);
			}
		}).catch(function() {});
	},

	fetchNetwork: function() {
		var self = this;
		if (!this._ifaceBody) return Promise.resolve();

		return rpc.declare({
			object: 'network.interface',
			method: 'dump',
			expect: { interface: [] }
		})().then(function(ifaces) {
			self._ifaceBody.innerHTML = '';
			self._trafficBody.innerHTML = '';

			var shown = 0;
			for (var i = 0; i < ifaces.length; i++) {
				var iface = ifaces[i];
				var name = iface.interface || ('if' + i);
				var up = iface.up === true;
				var proto = iface.proto || '—';
				var addr = '—';

				if (iface['ipv4-address'] && iface['ipv4-address'][0])
					addr = iface['ipv4-address'][0].address + '/' + iface['ipv4-address'][0].mask;
				else if (iface['ipv6-address'] && iface['ipv6-address'][0])
					addr = iface['ipv6-address'][0].address;

				if (name.charAt(0) === '@') continue;

				self._ifaceBody.appendChild(E('tr', {}, [
					E('td', {}, [ E('strong', {}, [ name ]) ]),
					E('td', {}, [ proto ]),
					E('td', { 'class': 'echo-mono' }, [ addr ]),
					E('td', {}, [ self.statusBadge(up) ])
				]));

				var stats = iface.stats || {};
				var rx = stats.rx_bytes || 0;
				var tx = stats.tx_bytes || 0;
				self._trafficBody.appendChild(E('tr', {}, [
					E('td', {}, [ name ]),
					E('td', { 'class': 'echo-mono' }, [ self.formatBytes(rx) ]),
					E('td', { 'class': 'echo-mono' }, [ self.formatBytes(tx) ]),
					E('td', { 'class': 'echo-mono' }, [ self.formatBytes(rx + tx) ])
				]));
				shown++;
			}

			if (shown === 0) {
				self._ifaceBody.appendChild(E('tr', {}, [
					E('td', { colspan: '4', 'class': 'echo-empty' }, [ '—' ])
				]));
			}
		}).catch(function() {});
	},

	fetchLeases: function() {
		var self = this;
		if (!this._leasesBody) return Promise.resolve();

		return rpc.declare({
			object: 'luci-rpc',
			method: 'getDHCPLeases',
			expect: { 'dhcp-leases': [] }
		})().then(function(data) {
			var leases = data['dhcp-leases'] || data.leases || [];
			self._leasesBody.innerHTML = '';

			if (leases.length === 0) {
				self._leasesBody.appendChild(E('tr', {}, [
					E('td', { colspan: '3', 'class': 'echo-empty' }, [ _('No active DHCP clients') ])
				]));
				return leases;
			}

			leases.slice(0, 8).forEach(function(l) {
				self._leasesBody.appendChild(E('tr', {}, [
					E('td', {}, [ l.hostname || '—' ]),
					E('td', { 'class': 'echo-mono' }, [ l.ipaddr || '—' ]),
					E('td', { 'class': 'echo-mono echo-dim' }, [ l.macaddr || '—' ])
				]));
			});

			if (leases.length > 8) {
				self._leasesBody.appendChild(E('tr', {}, [
					E('td', { colspan: '3', 'class': 'echo-more' }, [
						'+ ' + (leases.length - 8) + ' ' + _('more clients')
					])
				]));
			}
			return leases;
		}).catch(function() {
			self._leasesBody.innerHTML = '';
			self._leasesBody.appendChild(E('tr', {}, [
				E('td', { colspan: '3', 'class': 'echo-empty' }, [ '—' ])
			]));
			return [];
		});
	},

	fetchNetworkMap: function() {
		var self = this;
		if (!this._portsEl) return Promise.resolve();

		return Promise.all([
			this.loadEthernetPorts(),
			this.loadWifiRadios()
		]).then(function(res) {
			self.renderPorts(res[0]);
			self.renderWifiRadios(res[1]);
			self.updateNetworkMapLayout(res[0].length, res[1].length);
		}).catch(function() {
			self.renderPorts([]);
			self.renderWifiRadios([]);
			self.updateNetworkMapLayout(0, 0);
		});
	},

	loadEthernetPorts: function() {
		var self = this;

		return Promise.all([
			L.resolveDefault(callGetBuiltinEthernetPorts(), []),
			L.resolveDefault(fs.read('/etc/board.json'), '{}'),
			L.resolveDefault(callInterfaceDump(), []),
			L.resolveDefault(callNetworkDeviceStatusAll(), {}),
			uci.load('network').catch(function() { return null; })
		]).then(function(res) {
			var builtin = res[0] || [];
			var board = {};
			var ifaces = res[2] || [];
			var devStatus = res[3] || {};

			try {
				board = JSON.parse(res[1] || '{}');
			} catch (e) {
				board = {};
			}

			var entries = [];
			var seen = {};

			function pushEntry(device, role, label) {
				if (!device || seen[device]) return;
				seen[device] = true;
				entries.push({
					device: device,
					name: label || device,
					role: (role || 'lan').toUpperCase()
				});
			}

			builtin.forEach(function(p) {
				pushEntry(p.device, p.role, p.device);
			});

			if (entries.length === 0 && board.network) {
				[ 'lan', 'wan' ].forEach(function(role) {
					var block = board.network[role];
					if (!block) return;
					if (Array.isArray(block.ports))
						block.ports.forEach(function(dev) { pushEntry(dev, role); });
					else if (block.device)
						pushEntry(block.device, role);
				});
			}

			if (entries.length === 0) {
				Object.keys(devStatus).sort().forEach(function(name) {
					var d = devStatus[name];
					if (self.isVirtualNetdev(name, d)) return;
					pushEntry(name, self.guessPortRole(name, ifaces), name);
				});
			}

			return Promise.all(entries.map(function(entry) {
				return L.resolveDefault(callNetworkDeviceStatus(entry.device), {}).then(function(st) {
					var up = false;
					var speedMbps = -1;

					try {
						var nd = network.instantiateDevice(entry.device);
						up = nd.getCarrier();
						speedMbps = nd.getSpeed();
					} catch (e) {
						up = !!(st && (st.up || st.link || st.carrier));
						speedMbps = st && st.speed ? st.speed : -1;
					}

					if (entry.role === 'LAN' || entry.role === 'UNKNOWN')
						entry.role = self.guessPortRole(entry.device, ifaces);

					return {
						name: entry.name,
						role: entry.role,
						up: up,
						speed: self.formatSpeedMbps(speedMbps)
					};
				});
			})).then(function(ports) {
				ports.sort(function(a, b) {
					if (a.role !== b.role)
						return a.role === 'WAN' ? -1 : (b.role === 'WAN' ? 1 : 0);
					return L.naturalCompare(a.name, b.name);
				});
				return ports;
			});
		});
	},

	loadWifiRadios: function() {
		var self = this;

		if (L.hasSystemFeature && !L.hasSystemFeature('wifi'))
			return Promise.resolve([]);

		return Promise.all([
			L.resolveDefault(network.getWifiDevices(), []),
			L.resolveDefault(network.getWifiNetworks(), []),
			uci.load('wireless').catch(function() { return null; })
		]).then(function(res) {
			var radios = res[0] || [];
			var networks = res[1] || [];

			if (radios.length === 0)
				return self.loadWifiRadiosFromUci();

			var tasks = networks.map(function(net) {
				return L.resolveDefault(net.getAssocList(), []).then(function(list) {
					net._echoAssoc = list.length;
					return net;
				});
			});

			return Promise.all(tasks).then(function() {
				var out = [];

				radios.sort(function(a, b) {
					return L.naturalCompare(a.getName(), b.getName());
				}).forEach(function(radio) {
					var nets = networks.filter(function(n) {
						return n.getWifiDeviceName() === radio.getName();
					});
					var ssid = '—';
					var enabled = 0;
					var clients = 0;
					var band = '';
					var hwmode = '';

					try {
						var sid = radio.getName();
						band = uci.get('wireless', sid, 'band') || '';
						hwmode = uci.get('wireless', sid, 'hwmode') || '';
					} catch (e) {}

					nets.forEach(function(net) {
						if (net.isDisabled()) return;
						enabled++;
						var active = net.getActiveSSID();
						if (active) ssid = active;
						clients += net._echoAssoc || 0;
					});

					if (ssid === '—' && enabled > 0) {
						try {
							var wifaces = uci.sections('wireless', 'wifi-iface') || [];
							for (var i = 0; i < wifaces.length; i++) {
								if (wifaces[i].device === radio.getName() &&
								    uci.get('wireless', wifaces[i]['.name'], 'disabled') !== '1') {
									ssid = uci.get('wireless', wifaces[i]['.name'], 'ssid') || ssid;
									break;
								}
							}
						} catch (e2) {}
					}

					var bandKey = (band || '').toLowerCase();
					if (!bandKey && radio.getFrequency)
						bandKey = String(radio.getFrequency() || '').indexOf('6') === 0 ? '6g' : '';

					out.push({
						label: self.bandLabel(bandKey),
						gen: self.wifiGeneration(hwmode, bandKey),
						ssid: ssid,
						up: radio.isUp() && enabled > 0,
						meta: clients > 0
							? clients + ' ' + _('Clients')
							: enabled + ' ' + _('SSID'),
						wifi7: hwmode === 'be' || bandKey === '6g'
					});
				});

				return out;
			});
		}).catch(function() {
			return self.loadWifiRadiosFromUci();
		});
	},

	loadWifiRadiosFromUci: function() {
		var self = this;
		var radios = [];

		try {
			var devs = uci.sections('wireless', 'wifi-device') || [];
			var i;

			for (i = 0; i < devs.length; i++) {
				var sname = devs[i]['.name'];
				var band = uci.get('wireless', sname, 'band') || uci.get('wireless', sname, 'hwmode') || '';
				var hwmode = uci.get('wireless', sname, 'hwmode') || '';
				var disabled = uci.get('wireless', sname, 'disabled') === '1';
				var wifaces = uci.sections('wireless', 'wifi-iface') || [];
				var ssid = '—';
				var enabledIfaces = 0;
				var j;

				for (j = 0; j < wifaces.length; j++) {
					if (wifaces[j].device !== sname) continue;
					ssid = uci.get('wireless', wifaces[j]['.name'], 'ssid') || ssid;
					if (uci.get('wireless', wifaces[j]['.name'], 'disabled') !== '1')
						enabledIfaces++;
				}

				radios.push({
					label: self.bandLabel(band),
					gen: self.wifiGeneration(hwmode, band),
					ssid: ssid,
					up: !disabled && enabledIfaces > 0,
					meta: enabledIfaces + ' ' + _('SSID'),
					wifi7: hwmode === 'be' || (band || '').toLowerCase() === '6g'
				});
			}
		} catch (e) {}

		return Promise.resolve(radios);
	},

	renderPorts: function(ports) {
		var self = this;
		this._portsEl.innerHTML = '';

		if (!ports || ports.length === 0) {
			this._portsEl.appendChild(this.mapEmptyNote(_('No Ethernet ports detected on this device.')));
			return;
		}

		ports.forEach(function(p) {
			self._portsEl.appendChild(E('div', {
				'class': 'echo-port' + (p.up ? ' echo-port-up' : ' echo-port-down')
			}, [
				E('div', { 'class': 'echo-port-head' }, [
					E('span', { 'class': 'echo-port-name' }, [ p.name ]),
					E('span', { 'class': 'echo-port-role' }, [ self.portRole(p.role) ])
				]),
				E('span', { 'class': 'echo-port-speed' }, [ p.speed ]),
				E('span', { 'class': 'label ' + (p.up ? 'success' : 'important') }, [
					p.up ? _('Linked') : _('Down')
				])
			]));
		});
	},

	renderWifiRadios: function(radios) {
		var self = this;
		this._wifiEl.innerHTML = '';

		if (!radios || radios.length === 0) {
			this._wifiEl.appendChild(this.mapEmptyNote(_('No wireless radios on this device.')));
			return;
		}

		radios.forEach(function(r) {
			self._wifiEl.appendChild(E('div', {
				'class': 'echo-wifi-card' + (r.up ? ' echo-wifi-up' : '')
			}, [
				E('div', { 'class': 'echo-wifi-head' }, [
					E('span', { 'class': 'echo-wifi-badge' + (r.wifi7 ? ' wifi7' : '') }, [ r.gen ]),
					E('strong', {}, [ r.label ])
				]),
				E('span', { 'class': 'echo-wifi-ssid' }, [ r.ssid ]),
				E('span', { 'class': 'echo-wifi-meta' }, [ r.meta ]),
				E('span', { 'class': 'label ' + (r.up ? 'success' : 'important') }, [
					r.up ? _('Active') : _('Offline')
				])
			]));
		});
	}
});
