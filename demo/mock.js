(function() {
  'use strict';

  var views = {
    dashboard: document.getElementById('view-app'),
    settings: document.getElementById('view-settings'),
    login: document.getElementById('view-login')
  };

  function showView(name) {
    Object.keys(views).forEach(function(k) {
      if (views[k]) views[k].hidden = (k !== name);
    });
    document.querySelectorAll('.demo-btn[data-view]').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.view === name);
    });
  }

  document.querySelectorAll('.demo-btn[data-view]').forEach(function(btn) {
    btn.addEventListener('click', function() { showView(btn.dataset.view); });
  });

  document.getElementById('demo-login-btn').addEventListener('click', function() {
    showView('dashboard');
  });

  showView('dashboard');

  var navBar = document.getElementById('echo-nav-bar');
  if (navBar) {
    navBar.addEventListener('click', function(e) {
      var section = e.target.closest('.nav-section.has-dropdown');
      if (!section || e.target.closest('.nav-dropdown-item') || e.target.closest('.nav-logout-link')) return;

      var btn = section.querySelector('.nav-top:not(.nav-logout-link)');
      if (!btn || e.target.closest('.nav-top') !== btn) return;

      e.preventDefault();
      e.stopPropagation();

      function setDropdownOpen(sec, isOpen) {
        var panel = sec && sec.querySelector('.nav-dropdown');
        if (!panel) return;
        if (isOpen) {
          panel.removeAttribute('hidden');
          panel.setAttribute('aria-hidden', 'false');
        } else {
          panel.setAttribute('hidden', '');
          panel.setAttribute('aria-hidden', 'true');
        }
      }

      function closeAll() {
        document.querySelectorAll('.nav-section.has-dropdown').forEach(function(s) {
          s.classList.remove('open');
          var b = s.querySelector('.nav-top:not(.nav-logout-link)');
          if (b) b.setAttribute('aria-expanded', 'false');
          setDropdownOpen(s, false);
        });
      }

      document.querySelectorAll('.nav-section.has-dropdown .nav-dropdown').forEach(function(p) {
        p.setAttribute('hidden', '');
        p.setAttribute('aria-hidden', 'true');
      });

      var open = !section.classList.contains('open');
      closeAll();
      if (open) {
        section.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        setDropdownOpen(section, true);
      }
    });

    document.addEventListener('click', function(e) {
      if (e.target.closest('.nav-section.has-dropdown > .nav-top')) return;
      document.querySelectorAll('.nav-section.has-dropdown').forEach(function(s) {
        s.classList.remove('open');
        var b = s.querySelector('.nav-top:not(.nav-logout-link)');
        if (b) b.setAttribute('aria-expanded', 'false');
        var panel = s.querySelector('.nav-dropdown');
        if (panel) {
          panel.setAttribute('hidden', '');
          panel.setAttribute('aria-hidden', 'true');
        }
      });
    });
  }

  function applyTheme(mode) {
    var labels = { auto: '系统', light: '浅色', dark: '深色' };
    document.documentElement.dataset.theme = mode;
    var d = document.getElementById('dark-styles');
    var m = document.getElementById('meta-theme-color');
    if (mode === 'dark') { d.media = 'all'; if (m) m.content = '#000000'; }
    else if (mode === 'light') { d.media = 'not all'; if (m) m.content = '#f5f5f7'; }
    else { d.media = '(prefers-color-scheme: dark)'; if (m) m.content = matchMedia('(prefers-color-scheme: dark)').matches ? '#000000' : '#f5f5f7'; }
    var btn = document.getElementById('demo-theme');
    if (btn) btn.textContent = '主题: ' + (labels[mode] || mode);
  }

  function cycleTheme() {
    var order = ['auto', 'light', 'dark'];
    var cur = document.documentElement.dataset.theme || 'auto';
    var next = order[(order.indexOf(cur) + 1) % 3];
    try { localStorage.setItem('echo-theme', next); } catch(e) {}
    applyTheme(next);
  }

  (function initTheme() {
    var s = 'auto';
    try { s = localStorage.getItem('echo-theme') || 'auto'; } catch(e) {}
    applyTheme(['auto', 'light', 'dark'].indexOf(s) >= 0 ? s : 'auto');
  })();

  document.getElementById('theme-toggle').addEventListener('click', cycleTheme);
  document.getElementById('demo-theme').addEventListener('click', cycleTheme);

  document.getElementById('cfg-apply').addEventListener('click', function() {
    document.documentElement.style.setProperty('--echo-primary', document.getElementById('cfg-primary').value);
    document.documentElement.style.setProperty('--echo-brand-gold', document.getElementById('cfg-gold').value);
    var modelEl = document.querySelector('.router-model');
    if (modelEl) modelEl.textContent = document.getElementById('cfg-model').value;
    document.getElementById('echo-overview').style.display =
      document.getElementById('cfg-dashboard').checked ? '' : 'none';
    showView('dashboard');
  });

  function rand(min, max) { return min + Math.random() * (max - min); }

  setInterval(function() {
    var l1 = rand(0.15, 0.85);
    var l5 = l1 * rand(0.7, 0.95);
    var l15 = l1 * rand(0.5, 0.85);
    var memPct = Math.round(rand(45, 72));

    var cpuEl = document.getElementById('demo-cpu');
    if (cpuEl) cpuEl.textContent = l1.toFixed(2) + ' / ' + l5.toFixed(2) + ' / ' + l15.toFixed(2);

    var memEl = document.getElementById('demo-mem');
    if (memEl) memEl.textContent = Math.round(memPct * 2.56) + ' MB / 256 MB (' + memPct + '%)';
  }, 3000);
})();
