(function () {
  var chat = document.getElementById('chat');
  var input = document.getElementById('input');
  var send = document.getElementById('send');
  var opening = document.getElementById('openingBubble');

  var Engine = window.AIAgent;
  var session = {}; // 会话状态：模拟面试状态机

  // ============ 真实使用统计（localStorage，仅本机，可截图）============
  var STATS_KEY = 'ai_agent_stats_v1';
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function loadStats() {
    try {
      var s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      if (!s.createdAt) s.createdAt = new Date().toISOString();
      s.visits = s.visits || 0;
      s.chats = s.chats || 0;
      s.intents = s.intents || {};
      s.daily = s.daily || {};
      return s;
    } catch (e) {
      return { createdAt: new Date().toISOString(), visits: 0, chats: 0, intents: {}, daily: {} };
    }
  }
  function saveStats(s) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {}
  }
  // 每次打开页面记一次访问（同一天同一浏览器只加一次，见 admin 说明）
  (function recordVisit() {
    var s = loadStats();
    var t = todayStr();
    var lastDay = localStorage.getItem('ai_agent_lastvisit');
    if (lastDay !== t) {
      s.visits += 1;
      localStorage.setItem('ai_agent_lastvisit', t);
    }
    if (!s.daily[t]) s.daily[t] = { visits: 0, chats: 0 };
    s.daily[t].visits = s.daily[t].visits || 0;
    saveStats(s);
  })();

  function recordChat(intent) {
    var s = loadStats();
    var t = todayStr();
    s.chats += 1;
    s.intents[intent || 'unknown'] = (s.intents[intent || 'unknown'] || 0) + 1;
    if (!s.daily[t]) s.daily[t] = { visits: 0, chats: 0 };
    s.daily[t].chats = (s.daily[t].chats || 0) + 1;
    saveStats(s);
  }

  function mdSimple(s) {
    return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
  function escapeHtml(s) {
    return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; });
  }

  opening.innerHTML = mdSimple(escapeHtml(Engine.OPENING));
  function scroll() { chat.scrollTop = chat.scrollHeight; }

  function addMsg(role, text, html) {
    var wrap = document.createElement('div');
    wrap.className = 'msg ' + (role === 'user' ? 'user' : 'ai');
    var av = document.createElement('div'); av.className = 'avatar'; av.textContent = role === 'user' ? '我' : 'AI';
    var bubble = document.createElement('div'); bubble.className = 'bubble';
    if (html) bubble.innerHTML = text; else bubble.innerHTML = mdSimple(escapeHtml(text));
    wrap.appendChild(av); wrap.appendChild(bubble);
    chat.appendChild(wrap); scroll();
    return bubble;
  }

  function doSend(text) {
    text = (text || input.value).trim();
    if (!text) return;
    addMsg('user', text);
    input.value = ''; input.style.height = 'auto';
    var bubble = addMsg('ai', '<span class="typing"><i></i><i></i><i></i></span>', true);
    // 纯本地计算，模拟短暂"思考"体验
    setTimeout(function () {
      var res = Engine.reply(text, session);
      var replyText = (typeof res === 'string') ? res : (res && res.text) || '抱歉，暂时无法回复。';
      var intent = (res && res.intent) || 'unknown';
      bubble.innerHTML = mdSimple(escapeHtml(replyText));
      recordChat(intent);
      scroll();
    }, 320);
  }

  send.addEventListener('click', function () { doSend(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  input.addEventListener('input', function () {
    input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 130) + 'px';
  });
  document.querySelectorAll('.chip').forEach(function (c) {
    c.addEventListener('click', function () { doSend(c.getAttribute('data-q')); });
  });
  scroll();
})();
