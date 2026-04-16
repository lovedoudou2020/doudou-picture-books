/* ===== 豆豆绘本馆 — 主逻辑 (app.js) ===== */

/** 由 books.json 异步加载；勿在 data.js 内联大段书目（易因引号产生语法错误） */
let BOOKS = [];
/** fetch 得到的原始书目（不含本机手动添加） */
let BASE_BOOKS = [];

const CUSTOM_BOOKS_KEY = 'doudou_custom_books_v1';

// ===== 状态 =====
let currentPage = 'home';
let currentThemeFilter = 'all';
let currentOriginFilter = 'all';
let currentReadFilter = 'all';
let currentAwardFilter = 'all';
let searchQuery = '';
/** 列表排序：default 保持数据顺序；title 按书名字符串排序（存本机） */
const LIST_SORT_STORE_KEY = 'doudou_list_sort_v1';

function getListSortMode() {
  try {
    const v = localStorage.getItem(LIST_SORT_STORE_KEY);
    return v === 'title' ? 'title' : 'default';
  } catch (e) {
    return 'default';
  }
}

function setListSortMode(mode) {
  try {
    localStorage.setItem(LIST_SORT_STORE_KEY, mode === 'title' ? 'title' : 'default');
  } catch (e) {
    /* 忽略 */
  }
}

/** 不改变入参数组本身，返回新数组 */
function applyListSort(books) {
  const list = books || [];
  if (getListSortMode() !== 'title') return [...list];
  return [...list].sort((a, b) => {
    const ta = String(a && a.title != null ? a.title : '');
    const tb = String(b && b.title != null ? b.title : '');
    try {
      return ta.localeCompare(tb, 'zh-Hans-CN');
    } catch (e) {
      return ta.localeCompare(tb);
    }
  });
}

function clearSearchInputOnly() {
  searchQuery = '';
  const si = document.querySelector('.nav-search input');
  if (si) si.value = '';
}

/** 绘本网格无结果时的文案与操作（context 区分页面/区块） */
function renderEmptyBookGridHtml(context) {
  const copy = {
    library: '这一页暂时没有符合条件的书。不急，好书值得慢慢遇见。',
    theme: '这个主题下暂时空空如也，换个主题标签，或去书库转转？',
    award: '这个奖项下暂时没有对应书目，试试「全部获奖」，或去书库逛逛。',
    chinese: '原创区这里暂时缺位，书库里还有更多中国故事在等你。',
    curated: '网上新书区暂时是空的，家庭书库里满满回忆可以先读起来。',
    homeNew: '最新上架这一角暂时没有书，去书库翻翻全部藏书吧。',
    homeFeatured: '获奖精选里暂时没有找到书，书库里还有更多宝藏。',
    homeChinese: '原创精选暂空，去「中国原创」页或书库慢慢挑。',
    homeTheme: '当前主题下暂时没有书，换个主题按钮，或去书库逛逛。',
    default: '暂时没有找到符合条件的绘本，放宽筛选或去书库瞧瞧？',
  };
  const hint = copy[context] || copy.default;
  const q = (searchQuery || '').trim();
  const searchLine =
    q.length > 0
      ? `<p class="empty-state-search">当前搜索：<strong>${escHtml(q)}</strong></p>`
      : '';
  const clearBtn =
    q.length > 0
      ? `<button type="button" class="btn-empty-clear-search">清除搜索</button>`
      : '';
  return `<div class="empty-state">
    <div class="emoji" aria-hidden="true">📚</div>
    <p class="empty-state-text">${escHtml(hint)}</p>
    ${searchLine}
    <div class="empty-state-actions">
      ${clearBtn}
      <button type="button" class="btn-empty-to-library">去我的书库</button>
    </div>
  </div>`;
}

/** 首页「主题分类」区块当前选中的主题 id（与「按主题」页的 currentThemeFilter 独立） */
let homeThemeFilter = 'all';
/** 教育资讯：当前打开的站内文章 id；null 表示列表页 */
let currentNewsArticleId = null;

/** 站内《3-6发展指南》Word 文件名（与仓库根目录文件一致） */
const MOE_GUIDE_DOC_NAME = '3-6发展指南.doc';

/** 脚本从公开书单补充的书（与家庭 CSV 去重），见「网上新书」页 */
function isWebCuratedBook(book) {
  return book && book.dataSource === 'web_curated';
}

/** 用户在本机表单添加的绘本 */
function isManualBook(book) {
  return book && book.dataSource === 'manual';
}

function getCustomBooksFromLS() {
  try {
    const t = localStorage.getItem(CUSTOM_BOOKS_KEY);
    const a = t ? JSON.parse(t) : [];
    if (!Array.isArray(a)) return [];
    return a.filter(isValidCustomBookRecord);
  } catch (e) {
    return [];
  }
}

function isValidCustomBookRecord(b) {
  return (
    b &&
    typeof b === 'object' &&
    b.dataSource === 'manual' &&
    Number.isFinite(Number(b.id)) &&
    typeof b.title === 'string' &&
    b.title.trim().length > 0
  );
}

function setCustomBooksToLS(list) {
  try {
    localStorage.setItem(CUSTOM_BOOKS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('无法保存手动添加的绘本', e);
  }
}

function mergeBaseWithCustom() {
  return [...BASE_BOOKS, ...getCustomBooksFromLS()];
}

function nextCustomBookId() {
  const custom = getCustomBooksFromLS();
  const maxB = BASE_BOOKS.length ? Math.max(...BASE_BOOKS.map(b => Number(b.id) || 0), 0) : 0;
  const maxC = custom.length ? Math.max(...custom.map(b => Number(b.id) || 0), 0) : 0;
  return Math.max(maxB, maxC, 0) + 1;
}

const MANUAL_EMOJIS = ['📖', '📚', '🐰', '🌙', '🌸', '🎨', '🚌', '🏠', '🌿', '⭐', '🦖', '🐟', '🍎', '🎒'];
const MANUAL_COLORS = ['#FFF0F0', '#E3F2FD', '#E8F5E9', '#F3E5F5', '#FFF8E1', '#EDE9FE', '#FFEBEE', '#E0F7FA'];

function pickEmojiForTitle(title) {
  let h = 0;
  const s = String(title);
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return MANUAL_EMOJIS[Math.abs(h) % MANUAL_EMOJIS.length];
}

function pickCoverBgForTitle(title) {
  let h = 5381;
  const s = String(title) + 'x';
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return MANUAL_COLORS[Math.abs(h) % MANUAL_COLORS.length];
}

function deleteManualBook(id) {
  const nid = Number(id);
  const list = getCustomBooksFromLS().filter(b => Number(b.id) !== nid);
  setCustomBooksToLS(list);
  const o = getReadOverrides();
  delete o[String(nid)];
  setReadOverrides(o);
  BOOKS = mergeBaseWithCustom();
  closeModal();
  refreshAfterReadOverride();
}

function countReadInList(books) {
  const o = { read: 0, unread: 0, partial: 0 };
  (books || []).forEach(b => {
    const s = getReadStatus(b);
    if (s === 'read') o.read++;
    else if (s === 'partial') o.partial++;
    else o.unread++;
  });
  return o;
}

/** 套装/合辑在 summary 中记为「约 N 册（套）」；单条书目按册数计入总量 */
function volumeCountForBook(book) {
  if (!book || typeof book !== 'object') return 1;
  const v = Number(book.volumeCount);
  if (Number.isFinite(v) && v >= 1) return Math.min(Math.floor(v), 9999);
  const text = String(book.summary || '');
  const m = text.match(/约\s*(\d+)\s*册/);
  if (m) {
    const x = parseInt(m[1], 10);
    if (Number.isFinite(x) && x >= 1) return Math.min(x, 9999);
  }
  return 1;
}

function sumVolumes(books) {
  if (!books || !books.length) return 0;
  let s = 0;
  for (let i = 0; i < books.length; i++) s += volumeCountForBook(books[i]);
  return s;
}

/** 与 statLineFromStats 一致的「按册」汇总（阅读进度仍按书目条目计） */
function statsMetricsFromBooks(books) {
  const list = books || [];
  const c = countReadInList(list);
  return {
    total: sumVolumes(list),
    entryCount: list.length,
    read: c.read,
    unread: c.unread,
    partial: c.partial,
    curated: sumVolumes(list.filter(isWebCuratedBook)),
    manual: sumVolumes(list.filter(isManualBook)),
    chinese: sumVolumes(list.filter(b => b.origin === '中国')),
    awarded: sumVolumes(list.filter(b => b.awards && b.awards.length > 0)),
  };
}

/** 全库或任意列表的体量与阅读分布 */
function getAggregatedStats(bookList) {
  const list = bookList || BOOKS;
  const c = countReadInList(list);
  const m = statsMetricsFromBooks(list);
  return {
    total: m.total,
    /** 书目条目数（与 已读+未读+进行中 之和一致；套装一条可对应多册） */
    entryCount: list.length,
    ...c,
    curated: m.curated,
    manual: m.manual,
    chinese: m.chinese,
    awarded: m.awarded,
  };
}

function statLineFromStats(s, extraParts) {
  const entries = s.entryCount != null ? s.entryCount : (Number(s.read) || 0) + (Number(s.unread) || 0) + (Number(s.partial) || 0);
  const parts = [
    ['共', `${s.total} 册`],
    ['书目', `${entries} 条`],
    ['已读', `${s.read} 条`],
    ['未读', `${s.unread} 条`],
    ['进行中', `${s.partial} 条`],
    ['网上新书', `${s.curated} 册`],
    ['手添绘本', `${s.manual ?? 0} 册`],
    ['中国原创', `${s.chinese} 册`],
    ['有奖项信息', `${s.awarded} 册`],
  ];
  if (extraParts && extraParts.length) parts.push(...extraParts);
  return parts
    .map(([k, v]) => `<span class="stat-item"><span class="stat-k">${k}</span><span class="stat-v">${v}</span></span>`)
    .join('<span class="stat-sep">·</span>');
}

function setStatsBar(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function syncHeroTargets() {
  if (!BOOKS.length) return;
  const s = getAggregatedStats(BOOKS);
  const nums = $$('.hero-stat .num');
  if (nums[0]) {
    nums[0].dataset.target = String(Math.min(999, s.total));
    nums[0].dataset.suffix = '+';
  }
  if (nums[1]) nums[1].dataset.target = String(THEMES.length);
  if (nums[2]) {
    nums[2].dataset.target = String(Math.max(s.awarded, 1));
    nums[2].dataset.suffix = '+';
  }
  if (nums[3]) nums[3].dataset.target = String(Math.min(999, s.chinese));
}

let homeThemeTagBarBound = false;

function booksMatchingAnyDefinedTheme() {
  const themeIds = THEMES.map(t => t.id);
  return BOOKS.filter(b =>
    (b.themes || []).some(t => themeIds.some(id => themeTagMatches(t, id)))
  );
}

function renderHomeThemeTagBar() {
  const bar = document.getElementById('home-theme-tag-bar');
  if (!bar) return;
  const union = booksMatchingAnyDefinedTheme();
  const chips = [
    { id: 'all', icon: '📚', name: '全部', count: sumVolumes(union) },
    ...THEMES.map(t => ({
      id: t.id,
      icon: t.icon,
      name: t.name,
      count: sumVolumes(BOOKS.filter(b => (b.themes || []).some(x => themeTagMatches(x, t.id)))),
    })),
  ];
  bar.innerHTML = chips
    .map(
      c => `<button type="button" class="theme-tag-btn${homeThemeFilter === c.id ? ' active' : ''}" data-theme="${c.id}" role="tab" aria-selected="${homeThemeFilter === c.id}">${c.icon} ${c.name} <span class="theme-tag-count">${c.count} 册</span></button>`
    )
    .join('');
}

function renderHomeThemeBookGrid() {
  const v = homeThemeFilter || 'all';
  let books = v === 'all'
    ? booksMatchingAnyDefinedTheme()
    : BOOKS.filter(b => (b.themes || []).some(x => themeTagMatches(x, v)));
  if (currentPage === 'home' && searchQuery) {
    books = books.filter(b => matchSearch(b, searchQuery));
  }
  renderBookGrid(books, 'home-theme-book-grid', 'homeTheme');
  const themeName = v === 'all' ? '各主题去重汇总' : (THEMES.find(t => t.id === v)?.name || v);
  setStatsBar(
    'home-theme-stats',
    statLineFromStats(
      statsMetricsFromBooks(books),
      [['当前主题', themeName]]
    )
  );
}

function setupHomeThemeTagBarOnce() {
  const bar = document.getElementById('home-theme-tag-bar');
  if (!bar || homeThemeTagBarBound) return;
  homeThemeTagBarBound = true;
  bar.addEventListener('click', e => {
    const btn = e.target.closest('.theme-tag-btn');
    if (!btn) return;
    e.preventDefault();
    homeThemeFilter = btn.dataset.theme || 'all';
    bar.querySelectorAll('.theme-tag-btn').forEach(b => {
      const on = b.dataset.theme === homeThemeFilter;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    renderHomeThemeBookGrid();
  });
}

/** 本机「标为已读」覆盖 books.json 中的 readStatus（无后端时持久化） */
const READ_OVERRIDE_KEY = 'doudou_read_overrides_v1';

function getReadOverrides() {
  try {
    const t = localStorage.getItem(READ_OVERRIDE_KEY);
    const o = t ? JSON.parse(t) : {};
    return o && typeof o === 'object' ? o : {};
  } catch (e) {
    return {};
  }
}

function setReadOverrides(obj) {
  try {
    localStorage.setItem(READ_OVERRIDE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('无法写入阅读进度', e);
  }
}

function markBooksAsRead(ids) {
  const o = getReadOverrides();
  ids.forEach(id => {
    if (id != null && !Number.isNaN(Number(id))) o[String(id)] = 'read';
  });
  setReadOverrides(o);
}

function markBooksAsPartial(ids) {
  const o = getReadOverrides();
  ids.forEach(id => {
    if (id == null || Number.isNaN(Number(id))) return;
    const book = BOOKS.find(b => Number(b.id) === Number(id));
    if (!book || getReadStatus(book) !== 'unread') return;
    o[String(id)] = 'partial';
  });
  setReadOverrides(o);
}

// ===== 工具函数 =====
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function ageLabel(age) {
  if (age === '3-4' || age === '3-5') return '小班';
  if (age === '4-5' || age === '4-6') return '中班/大班';
  if (age === '5-6') return '大班';
  return '全年龄';
}

function ageLabelFull(age) {
  const m = {'3-4':'小班(3-4岁)','3-5':'小班/中班(3-5岁)','3-6':'全年龄(3-6岁)','4-5':'中班(4-5岁)','4-6':'中班/大班(4-6岁)','5-6':'大班(5-6岁)'};
  return m[age] || age;
}

function themeTagMatches(t, themeId) {
  if (t.includes(themeId) || themeId.includes(t)) return true;
  if (themeId === '友谊合作' && (t === '团队合作' || t.includes('分享'))) return true;
  if (themeId === '想象力' && (t === '创造力' || t === '冒险' || t === '勇气与冒险' || t.includes('幽默'))) return true;
  if (themeId === '习惯养成' && t.includes('科学启蒙')) return true;
  if (themeId === '情绪管理' && t === '自我认知') return true;
  return false;
}

function matchTheme(bookThemes, filter) {
  if (filter === 'all') return true;
  return (bookThemes || []).some(t => themeTagMatches(t, filter));
}

function matchOrigin(bookOrigin, filter) {
  if (filter === 'all') return true;
  return bookOrigin === filter;
}

/** 已读 read · 未读 unread · 进行中 partial（优先本机覆盖，其次 books.json） */
function getReadStatus(book) {
  const o = getReadOverrides();
  const over = o[String(book.id)];
  if (over === 'read' || over === 'unread' || over === 'partial') return over;
  const rs = book.readStatus;
  if (rs === 'read' || rs === 'unread' || rs === 'partial') return rs;
  return 'unread';
}

function readStatusLabel(rs) {
  if (rs === 'read') return '已读';
  if (rs === 'partial') return '进行中';
  return '未读';
}

function readStatusChipHtml(book) {
  const rs = getReadStatus(book);
  const cls = rs === 'read' ? 'tag-read' : rs === 'partial' ? 'tag-partial' : 'tag-unread';
  return `<span class="tag ${cls}">${readStatusLabel(rs)}</span>`;
}

/** 检索用：全半角、空白规范化，便于书名等匹配 */
function normalizeForSearch(s) {
  if (s == null) return '';
  let t = String(s).trim();
  try {
    if (typeof t.normalize === 'function') t = t.normalize('NFKC');
  } catch (e) {
    /* 忽略 */
  }
  return t
    .replace(/\u00a0/g, ' ')
    .replace(/[\s\u3000]+/g, ' ')
    .toLowerCase();
}

/** 书名检索：整题 + 按「/、，」拆分的分册名（套装书目） */
function matchBookTitle(book, qNorm) {
  if (!qNorm) return true;
  const raw = book.title || '';
  const full = normalizeForSearch(raw);
  if (full.includes(qNorm)) return true;
  return raw
    .split(/[/／、，,]+/)
    .map(seg => normalizeForSearch(seg))
    .some(seg => seg && seg.includes(qNorm));
}

function matchSearch(book, q) {
  if (!q) return true;
  const qn = normalizeForSearch(q);
  if (!qn) return true;
  if (matchBookTitle(book, qn)) return true;
  const author = book.author ? normalizeForSearch(book.author) : '';
  if (author.includes(qn)) return true;
  const summary = book.summary ? normalizeForSearch(book.summary) : '';
  if (summary.includes(qn)) return true;
  return (book.themes || []).some(t => normalizeForSearch(t).includes(qn));
}

function filterBooks() {
  return BOOKS.filter(b =>
    matchTheme(b.themes, currentThemeFilter) &&
    matchOrigin(b.origin, currentOriginFilter) &&
    matchSearch(b, searchQuery)
  );
}

// ===== 渲染函数 =====
function renderBookCard(book) {
  const awardBadge = book.awards && book.awards.length > 0
    ? `<span class="badge">${escHtml(book.awards[0].length > 10 ? book.awards[0].substring(0, 8) + '…' : book.awards[0])}</span>`
    : '';
  const rs = getReadStatus(book);
  const markBtns =
    rs === 'unread'
      ? `<div class="book-card__mark-btns">
        <button type="button" class="btn-mark-one-partial js-mark-one-partial" data-book-id="${book.id}">标为进行中</button>
        <button type="button" class="btn-mark-one-read js-mark-one-read" data-book-id="${book.id}">标为已读</button>
      </div>`
      : rs === 'partial'
        ? `<div class="book-card__mark-btns">
        <button type="button" class="btn-mark-one-read js-mark-one-read" data-book-id="${book.id}">标为已读</button>
      </div>`
        : '';
  const pickHtml = rs === 'unread' || rs === 'partial'
    ? `<div class="book-card__actions">
        <label class="pick-read"><input type="checkbox" class="js-pick-read" data-book-id="${book.id}"> 选中</label>
        ${markBtns}
      </div>`
    : '';
  const themeTags = (book.themes || [])
    .slice(0, 3)
    .map(t => `<span class="tag tag-theme">${escHtml(t)}</span>`)
    .join('');
  return `
    <div class="book-card" data-book-id="${book.id}">
      <button type="button" class="book-card__main">
        <div class="book-cover" style="background:${escHtml(book.coverBg)}">
          <span class="book-cover-emoji" aria-hidden="true">${book.emoji || '📖'}</span>
          ${awardBadge}
        </div>
        <div class="book-info">
          <h4>${escHtml(book.title)}</h4>
          <div class="author">${escHtml(book.author || '')}</div>
          <div class="tags">
            ${readStatusChipHtml(book)}
            <span class="tag tag-age">${ageLabelFull(book.age)}</span>
            ${themeTags}
            ${book.origin === '中国' ? '<span class="tag tag-origin">🇨🇳 中国原创</span>' : ''}
            ${isWebCuratedBook(book) ? '<span class="tag tag-new">🌐 网上书单</span>' : ''}
            ${isManualBook(book) ? '<span class="tag tag-manual">✏️ 手添</span>' : ''}
          </div>
          <div class="summary">${escHtml(book.summary || '')}</div>
        </div>
      </button>
      ${pickHtml}
    </div>`;
}

function renderBookGrid(books, containerId, emptyContext) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const list = applyListSort(books);
  if (list.length === 0) {
    container.innerHTML = renderEmptyBookGridHtml(emptyContext || 'default');
    updateReadBatchBar();
    return;
  }
  container.innerHTML = list.map(renderBookCard).join('');
  updateReadBatchBar();
}

function refreshAfterReadOverride() {
  switch (currentPage) {
    case 'home': renderHomePage(); break;
    case 'library': renderLibraryPage(currentReadFilter); break;
    case 'theme': renderThemePage(currentThemeFilter); break;
    case 'award': renderAwardPage(currentAwardFilter); break;
    case 'chinese': renderChinesePage(); break;
    case 'curated': renderCuratedPage(); break;
    case 'news': renderNewsPage(currentNewsArticleId); break;
    default: break;
  }
}

function updateReadBatchBar() {
  const bar = document.getElementById('read-batch-bar');
  const countEl = document.getElementById('read-batch-count');
  if (!bar || !countEl) return;
  const n = document.querySelectorAll('.js-pick-read:checked').length;
  if (n === 0) {
    bar.hidden = true;
    countEl.textContent = '';
    document.body.classList.remove('has-read-batch-bar');
    return;
  }
  bar.hidden = false;
  document.body.classList.add('has-read-batch-bar');
  countEl.textContent = `已选 ${n} 本（未读或进行中）`;
}

// ===== 首页 =====
function renderHomePage() {
  const g = getAggregatedStats(BOOKS);
  setStatsBar('home-hero-stats', statLineFromStats(g));

  // 最新上架：脚本从公开书单补充的绘本
  const newBooksAll = BOOKS.filter(b => isWebCuratedBook(b));
  const newBooks = newBooksAll.slice(0, 8);
  renderBookGrid(newBooks, 'new-books', 'homeNew');
  const nb = countReadInList(newBooks);
  setStatsBar(
    'home-new-stats',
    statLineFromStats(
      statsMetricsFromBooks(newBooks),
      [['展示区', `网上新书前 ${newBooks.length} 条展示（全库网上新书 ${sumVolumes(newBooksAll)} 册）`]]
    )
  );

  setupHomeThemeTagBarOnce();
  renderHomeThemeTagBar();
  renderHomeThemeBookGrid();

  const featured = BOOKS.filter(b => b.awards && b.awards.some(a =>
    a.includes('凯迪克金奖') || a.includes('丰子恺') && a.includes('首奖') ||
    a.includes('格林纳威奖大奖') || a.includes('纽伯瑞金奖') ||
    a.includes('2025凯迪克金奖') || a.includes('2025凯迪克银奖')
  )).slice(0, 8);
  const featList = featured.length > 0 ? featured : BOOKS.slice(0, 8);
  renderBookGrid(featList, 'featured-books', 'homeFeatured');
  const fc = countReadInList(featList);
  setStatsBar(
    'home-featured-stats',
    statLineFromStats(statsMetricsFromBooks(featList), [['展示区', `获奖精选前 ${featList.length} 条`]])
  );

  const chinese = BOOKS.filter(b => b.origin === '中国').slice(0, 6);
  renderBookGrid(chinese, 'chinese-books', 'homeChinese');
  const ch = countReadInList(chinese);
  const chAllBooks = BOOKS.filter(b => b.origin === '中国');
  const chAll = sumVolumes(chAllBooks);
  setStatsBar(
    'home-chinese-stats',
    statLineFromStats(
      statsMetricsFromBooks(chinese),
      [['展示区', `原创精选前 ${chinese.length} 条（原创书目合计 ${chAll} 册）`]]
    )
  );
}

// ===== 按主题浏览（仅标签 + 卡片网格）=====
function renderThemeTagBar() {
  const bar = document.getElementById('theme-tag-bar');
  if (!bar) return;
  const chips = [
    { id: 'all', icon: '📚', name: '全部', count: sumVolumes(BOOKS) },
    ...THEMES.map(t => ({
      id: t.id,
      icon: t.icon,
      name: t.name,
      count: sumVolumes(BOOKS.filter(b => (b.themes || []).some(x => themeTagMatches(x, t.id)))),
    })),
  ];
  bar.innerHTML = chips
    .map(
      c => `<button type="button" class="theme-tag-btn${currentThemeFilter === c.id ? ' active' : ''}" data-theme="${c.id}" role="tab" aria-selected="${currentThemeFilter === c.id}">${c.icon} ${c.name} <span class="theme-tag-count">${c.count} 册</span></button>`
    )
    .join('');
}

function renderThemePage(themeFilter) {
  currentThemeFilter = themeFilter || 'all';
  currentOriginFilter = 'all';
  renderThemeTagBar();
  const books = filterBooks();
  renderBookGrid(books, 'theme-book-grid', 'theme');
  const g = getAggregatedStats(books);
  const themeLabel =
    currentThemeFilter === 'all'
      ? '全部主题'
      : `${THEMES.find(t => t.id === currentThemeFilter)?.name || currentThemeFilter}`;
  setStatsBar(
    'theme-stats',
    statLineFromStats(g, [
      ['当前筛选', themeLabel],
    ])
  );
}

// ===== 获奖专区 =====
function renderAwardPage(awardKeyword) {
  currentAwardFilter = awardKeyword || 'all';
  let books;
  if (!awardKeyword || awardKeyword === 'all') {
    books = BOOKS.filter(b => b.awards && b.awards.length > 0);
  } else {
    books = BOOKS.filter(b => b.awards && b.awards.some(a => a.includes(awardKeyword)));
  }
  if (searchQuery) {
    books = books.filter(b => matchSearch(b, searchQuery));
  }
  renderBookGrid(books, 'award-book-grid', 'award');
  $$('#award-page .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.award === (awardKeyword || 'all'));
  });
  const g = getAggregatedStats(books);
  const aw = !awardKeyword || awardKeyword === 'all' ? '全部获奖' : awardKeyword;
  setStatsBar(
    'award-stats',
    statLineFromStats(g, [
      ['奖项筛选', aw],
      ...(searchQuery ? [['搜索', `「${escHtml(searchQuery)}」`]] : []),
    ])
  );
}

// ===== 中国原创 =====
function renderChinesePage() {
  let books = BOOKS.filter(b => b.origin === '中国');
  if (searchQuery) {
    books = books.filter(b => matchSearch(b, searchQuery));
  }
  renderBookGrid(books, 'chinese-book-grid', 'chinese');
  const g = getAggregatedStats(books);
  setStatsBar(
    'chinese-page-stats',
    statLineFromStats(g, [
      ...(searchQuery ? [['搜索', `「${escHtml(searchQuery)}」`]] : []),
    ])
  );
}

// ===== 网上精选新书（脚本合并的 CURATED_EXTRA）=====
function renderCuratedPage() {
  let books = BOOKS.filter(b => isWebCuratedBook(b));
  if (searchQuery) {
    books = books.filter(b => matchSearch(b, searchQuery));
  }
  renderBookGrid(books, 'curated-book-grid', 'curated');
  const g = getAggregatedStats(books);
  setStatsBar(
    'curated-stats',
    statLineFromStats(g, [
      ...(searchQuery ? [['搜索', `「${escHtml(searchQuery)}」`]] : []),
    ])
  );
}

// ===== 我的书库（侧栏阅读进度 + 搜索）=====
function renderLibraryPage(readFilter) {
  currentReadFilter = readFilter || 'all';
  currentThemeFilter = 'all';
  currentOriginFilter = 'all';
  let books = BOOKS;
  if (currentReadFilter !== 'all') {
    books = books.filter(b => getReadStatus(b) === currentReadFilter);
  }
  if (searchQuery) {
    books = books.filter(b => matchSearch(b, searchQuery));
  }
  renderBookGrid(books, 'library-book-grid', 'library');
  const g = getAggregatedStats(books);
  const tabLabel = currentReadFilter === 'all' ? '全部' : readStatusLabel(currentReadFilter);
  setStatsBar(
    'library-stats',
    statLineFromStats(g, [
      ['当前筛选', tabLabel],
      ...(searchQuery ? [[`搜索`, `「${escHtml(searchQuery)}」`]] : []),
    ])
  );
}

function eduNewsItemById(id) {
  const items = typeof EDU_NEWS_ITEMS !== 'undefined' && Array.isArray(EDU_NEWS_ITEMS) ? EDU_NEWS_ITEMS : [];
  if (!id) return null;
  return items.find(x => x.id === id) || null;
}

function eduNewsBodyHtml(item) {
  const raw = item && item.detail ? item.detail : item && item.summary ? item.summary : '';
  return raw
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${escHtml(p)}</p>`)
    .join('');
}

/** 教育资讯里「本机文档」段落：发展指南 .doc 用站内预览，其余仍仅下载 */
function eduNewsLocalDocParagraphHtml(localDoc, localDocLabel, variant) {
  if (!localDoc) return '';
  const docEsc = escHtml(localDoc);
  const label = escHtml(localDocLabel || localDoc);
  const pClass = variant === 'list' ? 'edu-news-list-file' : 'edu-news-link edu-news-local-doc';
  if (localDoc === MOE_GUIDE_DOC_NAME || localDoc.endsWith(MOE_GUIDE_DOC_NAME)) {
    return `<p class="${pClass}"><a href="#" class="js-moe-doc-preview" data-doc="${docEsc}" role="button">${label}</a> · <a href="${docEsc}" download>下载</a></p>`;
  }
  return `<p class="${pClass}"><a href="${docEsc}" download>${label}</a></p>`;
}

// ===== 教育资讯（列表 + 站内详情页；标题不进外链）=====
function renderNewsPage(articleId) {
  const listView = document.getElementById('edu-news-list-view');
  const articleView = document.getElementById('edu-news-article-view');
  if (!listView || !articleView) return;
  const item = articleId ? eduNewsItemById(String(articleId)) : null;
  currentNewsArticleId = item ? item.id : null;

  if (!item) {
    listView.hidden = false;
    articleView.hidden = true;
    articleView.innerHTML = '';
    const box = document.getElementById('edu-news-list');
    if (!box) return;
    const items = typeof EDU_NEWS_ITEMS !== 'undefined' && Array.isArray(EDU_NEWS_ITEMS) ? EDU_NEWS_ITEMS : [];
    box.innerHTML = items
      .map(
        newsItem => {
          const nid = newsItem.id || '';
          const titleHtml = nid
            ? `<h3 class="edu-news-title"><a href="#" class="edu-news-title-link" data-page="news" data-news-id="${escHtml(nid)}">${escHtml(newsItem.title)}</a></h3>`
            : `<h3 class="edu-news-title">${escHtml(newsItem.title)}</h3>`;
          return `
    <article class="edu-news-item">
      <header class="edu-news-head">
        <span class="edu-news-tag">${escHtml(newsItem.tag)}</span>
        <time class="edu-news-date" datetime="${escHtml(newsItem.date)}">${escHtml(newsItem.date)}</time>
      </header>
      ${titleHtml}
      <p class="edu-news-summary">${escHtml(newsItem.summary)}</p>
      ${newsItem.localDoc ? eduNewsLocalDocParagraphHtml(newsItem.localDoc, newsItem.localDocLabel, 'list') : ''}
      ${
        newsItem.url
          ? `<p class="edu-news-list-hint">权威原文见站内详情页底部链接。</p>`
          : ''
      }
    </article>`;
        }
      )
      .join('');
    return;
  }

  listView.hidden = true;
  articleView.hidden = false;
  articleView.innerHTML = `
    <div class="edu-news-article-inner">
      <p class="edu-news-back-row"><button type="button" class="edu-news-back js-edu-news-back">← 返回资讯列表</button></p>
      <header class="edu-news-article-meta">
        <span class="edu-news-tag">${escHtml(item.tag)}</span>
        <time class="edu-news-date" datetime="${escHtml(item.date)}">${escHtml(item.date)}</time>
      </header>
      <h2 class="edu-news-article-title">${escHtml(item.title)}</h2>
      <div class="edu-news-article-body">${eduNewsBodyHtml(item)}${item.detailAppendHtml || ''}</div>
      ${item.localDoc ? eduNewsLocalDocParagraphHtml(item.localDoc, item.localDocLabel, 'article') : ''}
      ${
        item.url
          ? `<p class="edu-news-link"><a href="${escHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escHtml(item.urlLabel || '权威原文')}</a></p>`
          : ''
      }
      <p class="edu-news-source-note">以上为本站摘录整理，政策与活动请以各机构最新发布为准。</p>
    </div>`;
}

// ===== 共读指南 =====
function renderGuidePage() {
  const el = document.getElementById('guide-moe-appendix');
  if (el && typeof MOE_36_GUIDE_APPENDIX_HTML !== 'undefined') {
    el.innerHTML = MOE_36_GUIDE_APPENDIX_HTML;
  }
}

function syncBodyOverflowForModals() {
  const book = document.getElementById('book-modal')?.classList.contains('show');
  const add = document.getElementById('add-book-modal')?.classList.contains('show');
  const moe = document.getElementById('moe-doc-modal')?.classList.contains('show');
  document.body.style.overflow = book || add || moe ? 'hidden' : '';
}

function closeMoeDocModal() {
  const frame = document.getElementById('moe-doc-view-frame');
  if (frame) {
    frame.src = 'about:blank';
    frame.style.display = '';
  }
  document.getElementById('moe-doc-modal')?.classList.remove('show');
  const tip = document.getElementById('moe-doc-view-tip');
  const frameWrap = document.getElementById('moe-doc-frame-wrap');
  if (tip) {
    tip.hidden = true;
    tip.textContent = '';
  }
  if (frameWrap) frameWrap.hidden = false;
  syncBodyOverflowForModals();
}

/** 用 Office 网页嵌入预览 .doc（需 http(s) 访问；file:// 时仅提示下载） */
function openMoeGuideDocPreview(docFileName) {
  const name = (docFileName || MOE_GUIDE_DOC_NAME).trim() || MOE_GUIDE_DOC_NAME;
  closeModal();
  closeAddBookModal();
  const wrap = document.getElementById('moe-doc-modal');
  const frame = document.getElementById('moe-doc-view-frame');
  const tip = document.getElementById('moe-doc-view-tip');
  const frameWrap = document.getElementById('moe-doc-frame-wrap');
  const dl = document.getElementById('moe-doc-dl-link');
  if (!wrap || !frame || !tip || !frameWrap) return;

  if (dl) {
    dl.href = name;
    dl.textContent = `下载 ${name}`;
  }

  wrap.classList.add('show');

  if (window.location.protocol === 'file:') {
    frameWrap.hidden = true;
    frame.removeAttribute('src');
    tip.hidden = false;
    tip.textContent =
      '当前为「本地文件」打开方式，浏览器无法内嵌预览 Word。请在本目录运行 python3 -m http.server 8080 后，用 http://127.0.0.1:8080/ 访问本站再预览；或点击下方「下载」用 Word 打开。';
    syncBodyOverflowForModals();
    return;
  }

  const abs = new URL(name, window.location.href).href;
  frameWrap.hidden = false;
  tip.hidden = true;
  frame.style.display = 'block';
  frame.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(abs)}`;
  syncBodyOverflowForModals();
}

// ===== 绘本详情弹窗 =====
function showBookDetail(id) {
  const book = BOOKS.find(b => b.id === id);
  if (!book) return;
  closeMoeDocModal();
  const modal = $('#book-modal');
  const content = $('#modal-content');
  const themesHtml = (book.themes || [])
    .map(t => `<span class="tag tag-theme">${escHtml(t)}</span>`)
    .join('');
  const awardsHtml = (book.awards || [])
    .map(a => `<li>${escHtml(a)}</li>`)
    .join('');
  const volN = volumeCountForBook(book);
  content.innerHTML = `
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <div class="modal-header">
      <div class="emoji">${book.emoji || '📖'}</div>
      <h2>《${escHtml(book.title)}》</h2>
      <div class="meta">${escHtml(book.author || '')}</div>
      ${isWebCuratedBook(book) ? '<p class="modal-curated-hint">本书由脚本从国图「四季童读」、凯迪克、丰子恺等公开书单检索整理后合并进书库，与家庭书单去重。</p>' : ''}
      ${isManualBook(book) ? '<p class="modal-manual-hint">✏️ 本书为您在本机手动添加，仅保存在此浏览器；不会写入 books.json。</p>' : ''}
      <div class="tags" style="justify-content:center;margin-top:8px">
        ${readStatusChipHtml(book)}
        <span class="tag tag-age">${ageLabelFull(book.age)}</span>
        ${themesHtml}
        ${book.origin === '中国' ? '<span class="tag tag-origin">🇨🇳 中国原创</span>' : ''}
      </div>
    </div>
    <div class="modal-body">
      <section>
        <h3>📌 阅读进度</h3>
        <p>当前标记为 <strong>${readStatusLabel(getReadStatus(book))}</strong>：已读表示通读过；未读表示尚未通读；进行中表示读到一部分。</p>
      </section>
      <section>
        <h3>📖 内容简介</h3>
        <p>${escHtml(book.summary || '')}</p>
      </section>
      ${volN > 1 ? `<section><h3>📚 册数说明</h3><p>本条为合辑或套装，全站「共 X 册」类统计按 <strong>${volN}</strong> 册累加。</p></section>` : ''}
      ${book.awards && book.awards.length ? `
      <section>
        <h3>🏆 获奖信息</h3>
        <ul>${awardsHtml}</ul>
      </section>` : ''}
      <section>
        <h3>💡 为什么推荐？</h3>
        <p>${escHtml(book.whyRead || '')}</p>
      </section>
      <section>
        <h3>👨‍👩‍👧 亲子共读小贴士</h3>
        <div class="tip-box">💛 ${escHtml(book.readingTips || '')}</div>
      </section>
      ${getReadStatus(book) === 'unread' ? `
      <div class="modal-actions">
        <button type="button" class="btn-modal-partial" data-action="mark-partial" data-book-id="${book.id}">标为进行中</button>
        <button type="button" class="btn-modal-read" data-action="mark-read" data-book-id="${book.id}">标为已读</button>
      </div>` : ''}
      ${getReadStatus(book) === 'partial' ? `
      <div class="modal-actions">
        <button type="button" class="btn-modal-read" data-action="mark-read" data-book-id="${book.id}">标为已读</button>
      </div>` : ''}
      ${isManualBook(book) ? `
      <div class="modal-actions modal-actions--split">
        <button type="button" class="btn-modal-delete" data-action="delete-manual" data-book-id="${book.id}">从本机删除（手添）</button>
      </div>` : ''}
    </div>`;
  modal.classList.add('show');
  syncBodyOverflowForModals();
}

function closeModal() {
  $('#book-modal').classList.remove('show');
  syncBodyOverflowForModals();
}

function closeAddBookModal() {
  const m = document.getElementById('add-book-modal');
  if (m) m.classList.remove('show');
  syncBodyOverflowForModals();
}

function buildAddBookThemeCheckboxes() {
  const box = document.getElementById('add-book-themes');
  if (!box) return;
  box.innerHTML = THEMES.map(
    t => `<label class="theme-check"><input type="checkbox" name="add-theme" value="${t.id}"> <span>${t.icon} ${escHtml(t.name)}</span></label>`
  ).join('');
}

function openAddBookModal() {
  closeModal();
  closeMoeDocModal();
  buildAddBookThemeCheckboxes();
  const form = document.getElementById('form-add-book');
  if (form) form.reset();
  const msg = document.getElementById('add-book-form-msg');
  if (msg) msg.textContent = '';
  const originChina = document.querySelector('#form-add-book input[name="origin"][value="中国"]');
  if (originChina) originChina.checked = true;
  document.getElementById('add-book-modal')?.classList.add('show');
  syncBodyOverflowForModals();
}

function submitManualBook(e) {
  e.preventDefault();
  const msg = document.getElementById('add-book-form-msg');
  const title = (document.getElementById('add-title')?.value || '').trim();
  if (!title) {
    if (msg) msg.textContent = '请填写书名。';
    return;
  }
  const author = (document.getElementById('add-author')?.value || '').trim();
  const age = document.getElementById('add-age')?.value || '3-6';
  const originEl = document.querySelector('#form-add-book input[name="origin"]:checked');
  const origin = originEl && originEl.value === '中国' ? '中国' : '外国';
  const themeEls = document.querySelectorAll('#add-book-themes input[name="add-theme"]:checked');
  let themes = [...themeEls].map(el => el.value);
  if (!themes.length) themes = ['亲情与爱'];
  const summary = (document.getElementById('add-summary')?.value || '').trim();
  const whyRead = (document.getElementById('add-why')?.value || '').trim();
  const readingTips = (document.getElementById('add-tips')?.value || '').trim();
  const book = {
    id: nextCustomBookId(),
    title,
    author: author || '（未填写）',
    country: origin === '中国' ? '中国' : '海外',
    emoji: pickEmojiForTitle(title),
    coverBg: pickCoverBgForTitle(title),
    age,
    themes,
    awards: [],
    readStatus: 'unread',
    summary: summary || '家长在本机手动录入的绘本。',
    whyRead: whyRead || '可按孩子兴趣安排共读与延伸活动。',
    readingTips: readingTips || '先聊封面再读内页；喜欢的书值得反复读。',
    origin,
    dataSource: 'manual',
  };
  const list = getCustomBooksFromLS();
  list.push(book);
  setCustomBooksToLS(list);
  BOOKS = mergeBaseWithCustom();
  closeAddBookModal();
  if (msg) msg.textContent = '';
  refreshAfterReadOverride();
}

// ===== 页面切换 =====
const SITE_TITLE_BRAND = '豆豆绘本馆';

function updateDocumentTitle(page, param, libraryRead) {
  if (page === 'news' && param) {
    const item = eduNewsItemById(String(param));
    if (item && item.title) {
      document.title = `${item.title} · ${SITE_TITLE_BRAND}`;
      return;
    }
  }
  const sectionTitles = {
    home: '首页',
    library: '我的书库',
    theme: '按主题',
    award: '获奖专区',
    chinese: '中国原创',
    curated: '网上新书',
    news: '教育资讯',
    guide: '共读指南',
  };
  let section = sectionTitles[page] || SITE_TITLE_BRAND;
  if (page === 'library' && libraryRead && libraryRead !== 'all') {
    section += ` · ${readStatusLabel(libraryRead)}`;
  }
  document.title = `${section} · ${SITE_TITLE_BRAND}`;
}

function navigateTo(page, param, anchorId) {
  currentPage = page;
  $$('.page').forEach(p => p.classList.remove('active'));
  const target = $(`#${page}-page`);
  if (target) target.classList.add('active');

  const libraryRead = page === 'library' ? (param === undefined || param === '' ? 'all' : String(param)) : null;
  $$('.sidebar-nav a').forEach(a => {
    const dp = a.dataset.page;
    if (a.hasAttribute('data-read') && dp === 'library') {
      a.classList.toggle('active', page === 'library' && a.dataset.read === libraryRead);
    } else if (!a.hasAttribute('data-read')) {
      a.classList.toggle('active', dp === page);
    }
  });

  switch(page) {
    case 'home': renderHomePage(); break;
    case 'library': renderLibraryPage(param || 'all'); break;
    case 'theme': renderThemePage(param || 'all'); break;
    case 'award': renderAwardPage(param || 'all'); break;
    case 'chinese': renderChinesePage(); break;
    case 'curated': renderCuratedPage(); break;
    case 'news': renderNewsPage(param); break;
    case 'guide': renderGuidePage(); break;
  }
  const anchor = typeof anchorId === 'string' && anchorId.trim() ? anchorId.trim() : '';
  if (anchor) {
    requestAnimationFrame(() => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  updateDocumentTitle(page, param, libraryRead);
  closeSidebarDrawer();
}

/** 站内带 data-page 的链接（页脚、教育资讯说明等） */
function bindInAppNavAnchors(root) {
  if (!root) return;
  root.addEventListener('click', e => {
    const a = e.target.closest('a[data-page]');
    if (!a || !root.contains(a)) return;
    e.preventDefault();
    const page = a.dataset.page;
    const anchor = a.dataset.anchor;
    if (page === 'library') {
      navigateTo('library', a.dataset.read || 'all', anchor);
    } else if (page === 'news' && a.dataset.newsId) {
      navigateTo('news', a.dataset.newsId, anchor);
    } else {
      navigateTo(page, undefined, anchor);
    }
  });
}

function isMobileSidebarMode() {
  return window.matchMedia('(max-width: 900px)').matches;
}

function closeSidebarDrawer() {
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  const tg = document.getElementById('sidebar-toggle');
  if (sb) sb.classList.remove('is-open');
  if (bd) bd.setAttribute('hidden', '');
  if (tg) tg.setAttribute('aria-expanded', 'false');
}

function openSidebarDrawer() {
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  const tg = document.getElementById('sidebar-toggle');
  if (!sb || !isMobileSidebarMode()) return;
  sb.classList.add('is-open');
  if (bd) bd.removeAttribute('hidden');
  if (tg) tg.setAttribute('aria-expanded', 'true');
}

function toggleSidebarDrawer() {
  const sb = document.getElementById('sidebar');
  if (!sb || !isMobileSidebarMode()) return;
  if (sb.classList.contains('is-open')) closeSidebarDrawer();
  else openSidebarDrawer();
}

// ===== 搜索 =====
function handleSearch(e) {
  searchQuery = e.target.value.trim();
  if (currentPage === 'home') {
    if (searchQuery) {
      const books = BOOKS.filter(b => matchSearch(b, searchQuery));
      renderBookGrid(books, 'featured-books', 'homeFeatured');
      const featC = countReadInList(books);
      setStatsBar(
        'home-featured-stats',
        statLineFromStats(
          statsMetricsFromBooks(books),
          [['搜索', `「${escHtml(searchQuery)}」匹配 ${sumVolumes(books)} 册（${books.length} 条）`]]
        )
      );
      const chBooks = books.filter(b => b.origin === '中国');
      renderBookGrid(chBooks, 'chinese-books', 'homeChinese');
      const chC = countReadInList(chBooks);
      setStatsBar(
        'home-chinese-stats',
        statLineFromStats(
          statsMetricsFromBooks(chBooks),
          [['搜索内原创', `${sumVolumes(chBooks)} 册（${chBooks.length} 条）`]]
        )
      );
      const newB = books.filter(isWebCuratedBook).slice(0, 8);
      renderBookGrid(newB, 'new-books', 'homeNew');
      const nAllList = books.filter(isWebCuratedBook);
      const nC = countReadInList(newB);
      setStatsBar(
        'home-new-stats',
        statLineFromStats(
          statsMetricsFromBooks(newB),
          [['搜索内网上新书', `展示 ${newB.length} 条（匹配 ${nAllList.length} 条 · 合 ${sumVolumes(nAllList)} 册）`]]
        )
      );
      renderHomeThemeBookGrid();
    } else {
      renderHomePage();
    }
  } else if (currentPage === 'theme') {
    renderThemePage(currentThemeFilter);
  } else if (currentPage === 'library') {
    renderLibraryPage(currentReadFilter);
  } else if (currentPage === 'curated') {
    renderCuratedPage();
  } else if (currentPage === 'award') {
    renderAwardPage(currentAwardFilter);
  } else if (currentPage === 'chinese') {
    renderChinesePage();
  }
}

async function loadBookData() {
  const res = await fetch('books.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('books.json HTTP ' + res.status);
  BASE_BOOKS = await res.json();
  BOOKS = mergeBaseWithCustom();
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('app-loading');
  try {
    await loadBookData();
    syncHeroTargets();
    if (loadingEl) loadingEl.hidden = true;
  } catch (e) {
    console.error(e);
    BOOKS = [];
    BASE_BOOKS = [];
    if (loadingEl) loadingEl.hidden = true;
    const main = document.getElementById('app-main');
    if (main) {
      const err = document.createElement('div');
      err.style.cssText = 'background:#FED7D7;color:#822727;padding:10px 16px;text-align:center;font-size:14px;';
      err.textContent = '无法加载 books.json。请在本目录运行：python3 -m http.server 8080，再用浏览器打开 http://127.0.0.1:8080/（不要直接双击打开网页文件）。';
      main.prepend(err);
    }
  }

  document.querySelector('.skip-link')?.addEventListener('click', e => {
    const mainEl = document.getElementById('app-main');
    if (!mainEl) return;
    e.preventDefault();
    mainEl.focus({ preventScroll: true });
    mainEl.scrollIntoView({ block: 'start' });
  });

  bindInAppNavAnchors(document.querySelector('.sidebar-nav-wrap'));
  bindInAppNavAnchors(document.querySelector('.footer-links'));
  bindInAppNavAnchors(document.getElementById('news-page'));
  document.getElementById('news-page')?.addEventListener('click', e => {
    if (e.target.closest('.js-edu-news-back')) {
      e.preventDefault();
      navigateTo('news');
    }
  });

  // Logo 点击
  $('.logo').addEventListener('click', () => navigateTo('home'));

  const btnAddBook = document.getElementById('btn-open-add-book');
  if (btnAddBook) btnAddBook.addEventListener('click', () => openAddBookModal());
  const formAddBook = document.getElementById('form-add-book');
  if (formAddBook) formAddBook.addEventListener('submit', submitManualBook);
  document.getElementById('add-book-modal-close')?.addEventListener('click', closeAddBookModal);
  document.getElementById('add-book-cancel')?.addEventListener('click', closeAddBookModal);
  document.getElementById('add-book-modal')?.addEventListener('click', e => {
    if (e.target.id === 'add-book-modal') closeAddBookModal();
  });

  // 绘本卡片：点主区域打开详情；未读可「进行中/已读」，进行中可「已读」
  // 使用捕获阶段，避免其它节点 stopPropagation 导致点不到委托逻辑
  document.addEventListener(
    'click',
    e => {
    const onePartial = e.target.closest('.js-mark-one-partial');
    if (onePartial) {
      e.preventDefault();
      e.stopPropagation();
      markBooksAsPartial([Number(onePartial.dataset.bookId)]);
      refreshAfterReadOverride();
      return;
    }
    const oneRead = e.target.closest('.js-mark-one-read');
    if (oneRead) {
      e.preventDefault();
      e.stopPropagation();
      markBooksAsRead([Number(oneRead.dataset.bookId)]);
      refreshAfterReadOverride();
      return;
    }
    const delManual = e.target.closest('[data-action="delete-manual"]');
    if (delManual) {
      e.preventDefault();
      const bid = Number(delManual.dataset.bookId);
      if (window.confirm('确定从本机删除这本手添绘本？其阅读标记也会一并清除。')) {
        deleteManualBook(bid);
      }
      return;
    }
    const markModalPartial = e.target.closest('[data-action="mark-partial"]');
    if (markModalPartial) {
      e.preventDefault();
      markBooksAsPartial([Number(markModalPartial.dataset.bookId)]);
      closeModal();
      refreshAfterReadOverride();
      return;
    }
    const markModal = e.target.closest('[data-action="mark-read"]');
    if (markModal) {
      e.preventDefault();
      markBooksAsRead([Number(markModal.dataset.bookId)]);
      closeModal();
      refreshAfterReadOverride();
      return;
    }
    const main = e.target.closest('.book-card__main');
    if (main) {
      const card = main.closest('.book-card');
      const id = card && card.dataset.bookId;
      if (id) showBookDetail(Number(id));
    }
  },
  true
  );

  document.addEventListener('change', e => {
    if (e.target.classList.contains('js-pick-read')) updateReadBatchBar();
  });

  const batchSubmit = document.getElementById('read-batch-submit');
  const batchSubmitPartial = document.getElementById('read-batch-submit-partial');
  const batchClear = document.getElementById('read-batch-clear');
  if (batchSubmit) {
    batchSubmit.addEventListener('click', () => {
      const ids = [...document.querySelectorAll('.js-pick-read:checked')].map(cb => Number(cb.dataset.bookId));
      if (!ids.length) return;
      markBooksAsRead(ids);
      refreshAfterReadOverride();
    });
  }
  if (batchSubmitPartial) {
    batchSubmitPartial.addEventListener('click', () => {
      const ids = [...document.querySelectorAll('.js-pick-read:checked')].map(cb => Number(cb.dataset.bookId));
      const unreadIds = ids.filter(id => {
        const b = BOOKS.find(x => Number(x.id) === Number(id));
        return b && getReadStatus(b) === 'unread';
      });
      if (!unreadIds.length) return;
      markBooksAsPartial(unreadIds);
      refreshAfterReadOverride();
    });
  }
  if (batchClear) {
    batchClear.addEventListener('click', () => {
      document.querySelectorAll('.js-pick-read').forEach(cb => { cb.checked = false; });
      updateReadBatchBar();
    });
  }

  // 搜索（书名支持套装内分册、全半角与空白规范化）
  const searchWrap = document.querySelector('.nav-search');
  const searchInput = searchWrap?.querySelector('input');
  const searchBtn = searchWrap?.querySelector('button[type="button"]');
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', e => {
      clearTimeout(timer);
      timer = setTimeout(() => handleSearch(e), 300);
    });
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(timer);
        handleSearch(e);
      }
    });
  }
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      handleSearch({ target: searchInput });
    });
  }

  const sortSel = document.getElementById('nav-book-sort');
  if (sortSel) {
    sortSel.value = getListSortMode();
    sortSel.addEventListener('change', () => {
      setListSortMode(sortSel.value);
      refreshAfterReadOverride();
    });
  }

  document.getElementById('app-main')?.addEventListener('click', e => {
    if (e.target.classList.contains('btn-empty-to-library')) {
      e.preventDefault();
      clearSearchInputOnly();
      navigateTo('library', 'all');
      return;
    }
    if (e.target.classList.contains('btn-empty-clear-search')) {
      e.preventDefault();
      clearSearchInputOnly();
      refreshAfterReadOverride();
    }
  });

  // 主题卡片点击
  $$('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      navigateTo('theme', card.dataset.theme);
    });
  });

  // 按主题页：分类标签
  document.addEventListener('click', e => {
    const tag = e.target.closest('.theme-tag-btn');
    if (tag && e.target.closest('#theme-page')) {
      e.preventDefault();
      renderThemePage(tag.dataset.theme);
    }
  });

  // Tab 按钮（奖项）
  document.addEventListener('click', e => {
    if (e.target.classList.contains('tab-btn')) {
      const page = e.target.closest('.page')?.id?.replace('-page', '');
      if (page === 'award') renderAwardPage(e.target.dataset.award);
    }
  });

  // 获奖卡片点击
  $$('.award-card').forEach(card => {
    card.addEventListener('click', () => {
      navigateTo('award', card.dataset.award);
    });
  });

  // 模态框外部点击关闭
  $('#book-modal').addEventListener('click', e => {
    if (e.target === $('#book-modal')) closeModal();
  });
  document.getElementById('moe-doc-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('moe-doc-modal')) closeMoeDocModal();
  });
  document.getElementById('moe-doc-modal-close')?.addEventListener('click', () => closeMoeDocModal());

  document.addEventListener('click', e => {
    const preview = e.target.closest('a.js-moe-doc-preview');
    if (!preview) return;
    e.preventDefault();
    openMoeGuideDocPreview(preview.getAttribute('data-doc'));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('moe-doc-modal')?.classList.contains('show')) {
        closeMoeDocModal();
      } else if (document.getElementById('add-book-modal')?.classList.contains('show')) {
        closeAddBookModal();
      } else {
        closeModal();
      }
      closeSidebarDrawer();
    }
  });

  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    toggleSidebarDrawer();
  });
  document.getElementById('sidebar-backdrop')?.addEventListener('click', () => {
    closeSidebarDrawer();
  });
  window.addEventListener('resize', () => {
    if (!isMobileSidebarMode()) closeSidebarDrawer();
  });

  // 滚动效果
  const sidebar = document.getElementById('sidebar');
  const backToTop = $('.back-to-top');
  window.addEventListener('scroll', () => {
    if (sidebar) sidebar.classList.toggle('scrolled', window.scrollY > 20);
    if (backToTop) backToTop.classList.toggle('show', window.scrollY > 400);
  });
  if (backToTop) {
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // 渲染首页后再跑数字动画（与 books.json 数量一致）
  navigateTo('home');
  animateNumbers();
});

// ===== 数字动画 =====
function animateNumbers() {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('.hero-stat .num').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    if (reduceMotion || !Number.isFinite(target)) {
      el.textContent = (Number.isFinite(target) ? target : 0) + (el.dataset.suffix || '');
      return;
    }
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = current + (el.dataset.suffix || '');
    }, 30);
  });
}
