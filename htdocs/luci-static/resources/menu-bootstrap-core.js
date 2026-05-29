'use strict';

/**
 * Shared menu helpers — logic aligned with OpenWrt luci-theme-bootstrap
 * htdocs/luci-static/resources/menu-bootstrap.js
 *
 * Echo keeps its own DOM (#top-nav / .nav-dropdown) but uses the same URL
 * rules, active detection, ordering, and L3+ tab depth as bootstrap.
 */
return {
	isModeActive: function(child, index) {
		return L.env.requestpath.length
			? child.name === L.env.requestpath[0]
			: index === 0;
	},

	/** L1 uses # when the section has any L2 children (bootstrap: submenu.firstElementChild). */
	topLevelHasSubmenu: function(node) {
		return ui.menu.getChildren(node).length > 0;
	},

	topLevelHref: function(node) {
		return this.topLevelHasSubmenu(node) ? '#' : L.url(node.name);
	},

	l2ItemHref: function(topNode, l2Node) {
		var l3 = ui.menu.getChildren(l2Node);
		var parts = [topNode.name, l2Node.name];

		if (l3.length)
			return this.firstLeafUrl(parts, l2Node);

		return L.url.apply(L, parts);
	},

	firstLeafUrl: function(parts, node) {
		var children = ui.menu.getChildren(node);

		if (children.length === 0)
			return L.url.apply(L, parts);

		return this.firstLeafUrl(parts.concat([children[0].name]), children[0]);
	},

	sortTopChildren: function(topChildren) {
		return topChildren.map(function(node, index) {
			var order = (node.order != null && !isNaN(+node.order))
				? +node.order
				: (1000 + index);

			return { node: node, index: index, order: order };
		}).sort(function(a, b) {
			if (a.order !== b.order)
				return a.order - b.order;
			return a.index - b.index;
		});
	},

	shouldRenderContentTabs: function() {
		return L.env.dispatchpath.length >= 3;
	},

	resolveTabRoot: function(tree) {
		var node = tree;
		var url = '';
		var i;

		for (i = 0; i < 3 && node; i++) {
			node = node.children[L.env.dispatchpath[i]];
			url += (url ? '/' : '') + L.env.dispatchpath[i];
		}

		return node ? { node: node, url: url } : null;
	}
};
