const $ = id => document.getElementById(id);
const trendsNavigationButton = document.createElement('button');
trendsNavigationButton.id = 'trends-view-toggle';
trendsNavigationButton.type = 'button';
trendsNavigationButton.setAttribute('aria-pressed', 'false');
trendsNavigationButton.textContent = 'Trends';
$('macro-view-toggle')?.insertAdjacentElement('afterend', trendsNavigationButton);
// Keep the built-in Watchlist alongside user-created categories. It remains a
// special list internally so existing saved Watchlist memberships stay intact.
const customListsSection = document.querySelector('.custom-lists-section');
const watchlistSection = document.querySelector('.watchlist-section');
if (customListsSection && watchlistSection && watchlistSection.parentElement !== customListsSection) customListsSection.insertBefore(watchlistSection, $('custom-lists'));
const seed = { NVDA: { name: 'NVIDIA', price: 'Connect market data', change: '—', earnings: 'Connect market data', stance: 'High conviction', story: 'AI compute leader; durability of demand and margins is the central question.', claims: [['AI infrastructure spend remains structurally elevated', 'Hyperscaler capex; Blackwell ramp', 'Capex cuts or inventory build'], ['Platform lock-in sustains premium margins', 'Gross margin; networking attach', 'Pricing pressure or mix deterioration']], checklist: [['Data-center revenue', 'Growth and Blackwell supply commentary'], ['Gross margin', 'New-product ramp pressure']], notes: [['Jul 12', 'Added after channel checks suggested demand visibility remains strong. Watch for buffer inventory.']], news: [['Product', 'Blackwell availability update', 'Confirming'], ['Risk', 'Export-control developments', 'Concerning']] } };
let holdings = structuredClone(seed), ticker = 'NVDA', section = 'thesis', range = '1Y', customChartRange = null, customChartRangeDraft = { start: '', end: '' }, settings = {}, chartData = null, chartError = null, chartView = null, chartDrag = null, chartType = 'line', earningsVisible = 4, newsVisible = 5, financialsView = 'income', financialsPeriod = 'annual', earningsMarkers = false, crosshairGuides = false, supportResistance = false, sharesOutstanding = false, rsiVisible = false, squeezeZoneVisible = false, tickerSort = 'change', quoteRefreshInProgress = false, lastQuoteRefresh = null, chartLoading = false, activeEarningsDetail = null, portfolioMutationInProgress = false, marketRefreshVersion = 0, customListDefaultsApplied = false;
let trendingStocks = [], trendingUpdatedAt = null, trendingNewSymbols = new Set(), trendingBadgeIntroActive = true, trendingBadgeIntroTimer = null, shortableSharesBySymbol = {}, shortableRange = 'today', shortableDisplay = 'table', shortInterestSelectedBarByTicker = {}, redditPostView = false, portfolioPageOpen = false, settingsPageOpen = false, macroPageOpen = false, brokerageDiagnosticsPageOpen = false, macroData = null, macroLoading = false, macroError = '', macroInflationView = 'yoy', newsLoading = false, newsRefreshToken = 0, newsLoadingProgress = 0, plaidState = { configured: false, items: [], portfolio: null }, snapTradeState = { configured: false, connections: [], portfolio: null }, portfolioQuotesUpdatedAt = null;
let trendsPageOpen = false, trendsData = null, trendsLoading = false, trendsError = '', trackedTrendsData = {}, trackedTrendsLoading = false;
let aiAgentPageOpen = false, aiAgentLoading = false, aiAgentCandidates = [], aiAgentStatus = '', aiAgentScannedAt = null, aiAgentTopScore = null, agentAutomationTimer = null, agentAutomationLastStarted = 0, aiAgentEvidenceImage = null, aiAgentEvidenceOutput = null;
const noteDrafts = {};
const noteEditDrafts = {};
let editingNote = null;
const NEWS_ANALYSIS_VERSION = 2;
const holdingSortState = {};
const holdingExpanded = {};
let brokerageAccountsExpanded = false;
let portfolioRefreshInProgress = false;
let portfolioQuoteRefreshInProgress = false;
let snapTradeReconnectDismissed = false;
let pendingSnapTradeReconnect = null;
let activeWorkspacePage = 'dashboard';
let workspaceHistory = [];
let navigatingBack = false;
const overviewInProgress = new Set();
const thesisInProgress = new Set();
const newsAnalysisInProgress = new Set();
const smaPeriods = new Set([20]);
const sectionScrollPositions = {};
const shortSqueezeCache = new Map();
const displayText = value => String(value).replace(/\bS\s*(?:&amp;(?:amp;)?|&#38;|&)\s*P\s*;?(?:\s*500)?\b(?!\s*Global)/gi, 'S&P 500');
const localDateKey = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const escape = value => displayText(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
function saveActiveNoteDraft() {
  const input = document.activeElement?.matches?.('#new-note, [data-note-editor]') ? document.activeElement : $('new-note');
  const symbol = input?.dataset.ticker;
  if (!symbol) return;
  if (input.matches?.('[data-note-editor]')) noteEditDrafts[`${symbol}:${input.dataset.noteIndex}`] = input.value;
  else noteDrafts[symbol] = input.value;
}
function activeNoteFocus() {
  const input = document.activeElement?.matches?.('#new-note, [data-note-editor]') ? document.activeElement : null;
  if (!input || document.activeElement !== input || !input.dataset.ticker) return null;
  return { ticker: input.dataset.ticker, noteIndex: input.dataset.noteIndex, editor: input.matches('[data-note-editor]') ? 'edit' : 'new', start: input.selectionStart, end: input.selectionEnd, direction: input.selectionDirection };
}
function removeRetiredDossierNotes() {
  let changed = false;
  const cleanNotes = notes => Array.isArray(notes) ? notes.filter(note => {
    const isRetiredDefault = /^new research dossier created\.?$/i.test(String(note?.[1] || '').trim());
    if (isRetiredDefault) changed = true;
    return !isRetiredDefault;
  }) : [];
  for (const dossier of Object.values(holdings)) {
    if (!dossier || typeof dossier !== 'object') continue;
    const cleaned = cleanNotes(dossier.notes);
    if (Array.isArray(dossier.notes) && cleaned.length !== dossier.notes.length) dossier.notes = cleaned;
    if (Object.hasOwn(dossier, 'researchDeskHistory')) { delete dossier.researchDeskHistory; changed = true; }
  }
  for (const archived of Object.values(settings.noteArchive || {})) {
    if (!archived || typeof archived !== 'object') continue;
    const cleaned = cleanNotes(archived.notes);
    if (Array.isArray(archived.notes) && cleaned.length !== archived.notes.length) archived.notes = cleaned;
    if (Object.hasOwn(archived, 'researchDeskHistory')) { delete archived.researchDeskHistory; changed = true; }
  }
  return changed;
}
const formatDailyMove = dossier => {
  if (!dossier) return '—';
  const percent = Number.parseFloat(dossier.change);
  const dollars = Number(dossier.priceChange);
  if (Number.isFinite(dollars) && Number.isFinite(percent)) {
    return `${dollars < 0 ? '-' : ''}${Math.abs(dollars).toFixed(2)} (${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%)`;
  }
  return dossier.change || '—';
};
const formatExtendedPrice = value => Number.isFinite(value) ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
const activeUSMarketExtendedSession = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const value = type => parts.find(part => part.type === type)?.value;
  const day = value('weekday');
  const minuteOfDay = Number(value('hour')) * 60 + Number(value('minute'));
  // Keep the last after-hours quote visible while the market is closed. It is
  // cleared when the next regular session begins.
  if (!['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(day)) return 'post';
  if (minuteOfDay >= 4 * 60 && minuteOfDay < 9 * 60 + 30) return 'pre';
  if (minuteOfDay >= 9 * 60 + 30 && minuteOfDay < 16 * 60) return 'regular';
  return 'post';
};
const extendedHoursMove = dossier => {
  const activeSession = activeUSMarketExtendedSession();
  const preMarket = activeSession === 'pre' && Number.isFinite(dossier?.preMarket);
  const afterHours = activeSession === 'post' && Number.isFinite(dossier?.afterHours);
  if (!preMarket && !afterHours) return null;
  const price = preMarket ? dossier.preMarket : dossier.afterHours;
  const change = preMarket ? dossier.preMarketChange : dossier.afterHoursChange;
  const percent = preMarket ? dossier.preMarketPercent : dossier.afterHoursPercent;
  if (!Number.isFinite(price)) return null;
  const movement = Number.isFinite(change) && Number.isFinite(percent) ? ` ${change >= 0 ? '+' : '-'}${Math.abs(change).toFixed(2)} (${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%)` : '';
  return { label: preMarket ? 'Pre-market' : 'After-hours', text: `${preMarket ? 'Pre' : 'After'} ${formatExtendedPrice(price)}${movement}`, positive: Number.isFinite(percent) ? percent >= 0 : Number.isFinite(change) ? change >= 0 : null };
};
const persist = () => window.portfolioApp.save(Object.fromEntries(Object.entries(holdings).filter(([, dossier]) => !dossier.isSearchResult)));
// Keep chart annotations in settings as well as the ticker dossier. Search-only
// symbols are intentionally omitted from the main saved holdings file, so this
// archive makes their saved dates survive when the user leaves and searches for
// the same symbol again.
const savedChartEventDates = symbol => [...new Set([...(Array.isArray(holdings[symbol]?.chartEventDates) ? holdings[symbol].chartEventDates : []), ...(Array.isArray(settings.chartEventDates?.[symbol]) ? settings.chartEventDates[symbol] : [])])].filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
const storeChartEventDates = (symbol, dates) => {
  const normalized = [...new Set(dates)].filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
  if (holdings[symbol]) holdings[symbol].chartEventDates = normalized;
  settings.chartEventDates ||= {};
  settings.chartEventDates[symbol] = normalized;
  return normalized;
};
const earningsSourceRank = item => {
  const source = String(item?.source || '').toLowerCase();
  if (source.includes('alpha vantage')) return 4;
  if (source.includes('financial modeling prep')) return 3;
  if (source.includes('benzinga') || source.includes('nasdaq')) return 2;
  if (source.includes('sec edgar')) return 1;
  return 0;
};
const retainEarningsHistory = (existing = {}, incoming = {}) => {
  const incomingActuals = Array.isArray(incoming.actuals) ? incoming.actuals : [];
  // Keep previously saved earnings rows while sources refresh. A partial
  // same-day response must never replace the historical table with one row.
  const existingActuals = existing.actuals || [];
  const dated = [...existingActuals, ...incomingActuals]
    .filter(item => /^\d{4}-\d{2}-\d{2}$/.test(String(item?.date || '')))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const clusters = [];
  for (const item of dated) {
    const cluster = clusters.at(-1);
    const gap = cluster ? (Date.parse(`${item.date}T12:00:00Z`) - Date.parse(`${cluster.latestDate}T12:00:00Z`)) / 86400000 : Infinity;
    if (!cluster || gap > 35) clusters.push({ latestDate: item.date, items: [item] });
    else { cluster.latestDate = item.date; cluster.items.push(item); }
  }
  const actuals = clusters.map(cluster => {
    const candidates = [...cluster.items].sort((a, b) => earningsSourceRank(b) - earningsSourceRank(a));
    const primary = candidates[0];
    const firstActual = field => candidates.find(item => Number.isFinite(item?.[field]))?.[field] ?? null;
    // Preserve an available EPS/revenue figure when the chosen release-date
    // source has not populated that field yet.
    return {
      ...primary,
      epsActual: Number.isFinite(primary.epsActual) ? primary.epsActual : firstActual('epsActual'),
      revenueActual: Number.isFinite(primary.revenueActual) ? primary.revenueActual : firstActual('revenueActual'),
      epsForecast: Number.isFinite(primary.epsForecast) ? primary.epsForecast : firstActual('epsForecast'),
      revenueForecast: Number.isFinite(primary.revenueForecast) ? primary.revenueForecast : firstActual('revenueForecast')
    };
  });
  return { ...existing, ...incoming, actuals };
};
const earningsMarkerLoads = new Set();
async function refreshOfficialEarningsMarkers(symbol = ticker) {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (!normalized || earningsMarkerLoads.has(normalized) || !window.portfolioApp.earningsMarkers) return;
  earningsMarkerLoads.add(normalized);
  try {
    const markers = await window.portfolioApp.earningsMarkers(normalized);
    const dossier = holdings[normalized];
    if (!dossier || !Array.isArray(markers) || !markers.length) return;
    dossier.earningsHistory = retainEarningsHistory(dossier.earningsHistory, { actuals: markers });
    await persist();
    if (normalized === ticker) renderChart();
  } catch {
    // The existing provider history stays visible if SEC is temporarily busy.
  } finally {
    earningsMarkerLoads.delete(normalized);
  }
}
const isTickerEntry = dossier => !dossier?.isSearchResult && dossier?.inTickers !== false;
const isWatchlistEntry = dossier => !dossier?.isSearchResult && dossier?.inWatchlist === true;
const customLists = () => {
  const lists = Array.isArray(settings.customLists) ? settings.customLists : [];
  // Each app launch begins with custom categories collapsed. Watchlist is kept
  // separate and remains open; users can still expand custom lists this session.
  if (lists.length && !customListDefaultsApplied) {
    lists.forEach(list => { list.collapsed = true; });
    customListDefaultsApplied = true;
    void window.portfolioApp.saveSettings(settings);
  }
  return lists;
};
const isCustomListEntry = (dossier, listId) => !dossier?.isSearchResult && Array.isArray(dossier?.customLists) && dossier.customLists.includes(listId);
const listDisplayName = destination => destination === 'tickers' ? 'Tickers' : destination === 'watchlist' ? 'Watchlist' : customLists().find(list => list.id === destination)?.name || 'list';
const needsCompanyOverview = dossier => !dossier.aiOverview || /please provide me with the company story|company name to research|start with the company story/i.test(dossier.story || '');
const earningsTimingHelp = timing => ({ bmo: 'BMO means Before Market Open.', amc: 'AMC means After Market Close.', tbd: 'The company has not announced whether earnings will be released before market open or after market close.' })[timing] || '';
const newDossier = (name, isSearchResult = true) => ({ name: name || 'Company profile loading…', price: 'Loading…', earnings: 'Loading…', stance: 'Research started', story: 'Company overview loading from market data.', claims: [['Core bull claim', 'Metric or evidence that would support it', 'Specific evidence that would challenge it'], ['Key risk to test', 'Early warning indicator', 'Risk becoming reality']], checklist: [['Primary KPI', 'What result would support or weaken the thesis'], ['Management commentary', 'Question to answer on the earnings call']], notes: [], news: [], ...(isSearchResult ? { isSearchResult: true } : {}) });
const settingsPage = $('settings-page');
['api-settings-panel', 'snaptrade-settings-panel'].forEach(id => {
  const panel = $(id);
  if (!panel) return;
  panel.querySelector('[id^="close-"]')?.remove();
  panel.hidden = false;
  settingsPage.insertBefore(panel, $('backup-settings-panel'));
});
function brokerageAccounts() { return Array.isArray(settings.plaidAccounts) ? settings.plaidAccounts : []; }
const money = value => Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value)) : '—';
const marketCap = value => Number.isFinite(Number(value)) && Number(value) > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(Number(value)) : 'Unavailable';
const plaidItemFor = brokerageId => (plaidState.items || []).find(item => item.brokerageId === brokerageId);
async function loadPlaidState() { try { plaidState = await window.portfolioApp.plaidStatus(); } catch { plaidState = { configured: false, items: [], portfolio: null }; } }
function updatePlaidConfigFields() {
  $('plaid-environment').value = plaidState.environment || 'sandbox';
  $('plaid-redirect-uri').value = plaidState.redirectUri || '';
  $('plaid-client-id').placeholder = plaidState.configured ? 'Saved locally — enter a new ID to replace it' : 'Plaid Client ID';
  $('plaid-secret').placeholder = plaidState.configured ? 'Saved locally — enter a new secret to replace it' : 'Plaid secret';
  $('plaid-config-status').textContent = plaidState.configured ? `Configured for ${plaidState.environment}.` : 'Plaid credentials have not been configured.';
}
function renderBrokerageAccounts() {
  const container = $('brokerage-accounts');
  const accounts = brokerageAccounts();
  container.innerHTML = accounts.length ? accounts.map(account => `<article class="brokerage-account"><div><strong>${escape(account.name)}</strong><small>${escape(account.nickname || 'No account nickname')} · Plaid setup required</small></div><button type="button" data-remove-brokerage="${escape(account.id)}" aria-label="Remove ${escape(account.name)}">Remove</button></article>`).join('') : '<p class="brokerage-empty">No brokerage accounts configured yet.</p>';
  document.querySelectorAll('[data-remove-brokerage]').forEach(button => button.onclick = async () => {
    settings.plaidAccounts = brokerageAccounts().filter(account => account.id !== button.dataset.removeBrokerage);
    await window.portfolioApp.saveSettings(settings);
    renderBrokerageAccounts();
    if (portfolioPageOpen) renderPortfolioPage();
  });
}
function renderPortfolioPage() {
  const accounts = brokerageAccounts();
  $('portfolio-page').innerHTML = `<div class="portfolio-heading"><div><h2>Portfolio</h2><p>Brokerage positions will appear here after a secure Plaid connection is enabled.</p></div><button id="portfolio-manage-accounts" type="button">Manage brokerage accounts</button></div><section class="portfolio-summary"><article><span>Connected accounts</span><strong>0</strong><small>${accounts.length ? `${accounts.length} configured` : 'None configured'}</small></article><article><span>Portfolio value</span><strong>Unavailable</strong><small>Connect an account to load balances.</small></article><article><span>Today</span><strong>—</strong><small>Live portfolio changes will appear here.</small></article></section><section class="portfolio-accounts"><h3>Brokerage accounts</h3>${accounts.length ? accounts.map(account => `<article><div><strong>${escape(account.name)}</strong><span>${escape(account.nickname || 'Brokerage account')}</span></div><small>Waiting for Plaid connection</small></article>`).join('') : '<p>Use “Brokerage accounts” in the dashboard sidebar to add your first account.</p>'}</section>`;
  $('portfolio-manage-accounts').onclick = () => {
    portfolioPageOpen = false;
    $('app-layout').hidden = false;
    $('plaid-settings-panel').hidden = false;
    $('api-settings-panel').hidden = true;
    updateWorkspaceView();
    renderBrokerageAccounts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}
function renderBrokerageAccounts() {
  const container = $('brokerage-accounts'), accounts = brokerageAccounts();
  container.innerHTML = accounts.length ? accounts.map(account => {
    const item = plaidItemFor(account.id);
    const status = item ? `Connected to ${escape(item.institution)}` : (plaidState.configured ? 'Ready to connect' : 'Plaid setup required');
    const action = item ? `<button type="button" data-disconnect-brokerage="${escape(account.id)}">Disconnect</button>` : `<button type="button" data-connect-brokerage="${escape(account.id)}" ${plaidState.configured ? '' : 'disabled'}>Connect with Plaid</button>`;
    return `<article class="brokerage-account"><div><strong>${escape(account.name)}</strong><small>${escape(account.nickname || 'No account nickname')} - ${status}</small></div><div class="brokerage-row-actions">${action}<button type="button" data-remove-brokerage="${escape(account.id)}">Remove</button></div></article>`;
  }).join('') : '<p class="brokerage-empty">No brokerage accounts configured yet.</p>';
  document.querySelectorAll('[data-remove-brokerage]').forEach(button => button.onclick = async () => {
    if (plaidItemFor(button.dataset.removeBrokerage)) await window.portfolioApp.disconnectPlaid(button.dataset.removeBrokerage);
    settings.plaidAccounts = brokerageAccounts().filter(account => account.id !== button.dataset.removeBrokerage);
    await window.portfolioApp.saveSettings(settings); await loadPlaidState(); renderBrokerageAccounts(); if (portfolioPageOpen) renderPortfolioPage();
  });
  document.querySelectorAll('[data-connect-brokerage]').forEach(button => button.onclick = async () => { try { await window.portfolioApp.connectPlaid(button.dataset.connectBrokerage); $('plaid-config-status').textContent = 'Plaid Link opened in a secure connection window.'; } catch (error) { $('plaid-config-status').textContent = error.message || 'Could not open Plaid Link.'; } });
  document.querySelectorAll('[data-disconnect-brokerage]').forEach(button => button.onclick = async () => { await window.portfolioApp.disconnectPlaid(button.dataset.disconnectBrokerage); await loadPlaidState(); renderBrokerageAccounts(); if (portfolioPageOpen) renderPortfolioPage(); });
}
function renderPortfolioPage() {
  const accounts = brokerageAccounts(), portfolio = plaidState.portfolio || { accounts: [], holdings: [], errors: [] };
  const connected = (plaidState.items || []).length, holdingRows = portfolio.holdings || [];
  const value = (portfolio.accounts || []).reduce((total, account) => total + (Number(account.balances?.current) || 0), 0);
  const accountMarkup = portfolio.accounts?.length ? portfolio.accounts.map(account => `<article><div><strong>${escape(account.name || account.official_name || 'Investment account')}</strong><span>${escape(account.institution)}${account.mask ? ` - •${escape(account.mask)}` : ''}</span></div><small>${money(account.balances?.current)}</small></article>`).join('') : (accounts.length ? accounts.map(account => `<article><div><strong>${escape(account.name)}</strong><span>${escape(account.nickname || 'Brokerage account')}</span></div><small>${plaidItemFor(account.id) ? 'Syncing holdings...' : 'Waiting for Plaid connection'}</small></article>`).join('') : '<p>Use Brokerage accounts in the dashboard sidebar to add your first account.</p>');
  const holdings = holdingRows.length ? `<section class="portfolio-holdings"><h3>Holdings</h3><table><thead><tr><th>Security</th><th>Quantity</th><th>Price</th><th>Market value</th></tr></thead><tbody>${holdingRows.map(holding => `<tr><td>${escape(holding.security?.ticker_symbol || holding.security?.name || 'Security')}</td><td>${Number(holding.quantity || 0).toLocaleString()}</td><td>${money(holding.institution_price)}</td><td>${money(holding.institution_value)}</td></tr>`).join('')}</tbody></table></section>` : '';
  $('portfolio-page').innerHTML = `<div class="portfolio-heading"><div><h2>Portfolio</h2><p>${portfolio.lastSyncedAt ? `Last updated ${new Date(portfolio.lastSyncedAt).toLocaleString()}.` : 'Connect an account to load holdings and balances.'}</p></div><div class="portfolio-page-actions"><button id="portfolio-refresh" type="button" ${connected ? '' : 'disabled'}>Refresh portfolio</button><button id="portfolio-manage-accounts" type="button">Manage brokerage accounts</button></div></div><section class="portfolio-summary"><article><span>Connected brokerages</span><strong>${connected}</strong><small>${accounts.length ? `${accounts.length} configured` : 'None configured'}</small></article><article><span>Portfolio value</span><strong>${connected ? money(value) : 'Unavailable'}</strong><small>${connected ? 'Reported account balances' : 'Connect an account to load balances.'}</small></article><article><span>Holdings</span><strong>${holdingRows.length || '—'}</strong><small>${portfolio.errors?.length ? `${portfolio.errors.length} connection needs attention` : 'Authorized investment positions'}</small></article></section><section class="portfolio-accounts"><h3>Brokerage accounts</h3>${accountMarkup}</section>${holdings}${portfolio.errors?.length ? `<p class="portfolio-errors">${portfolio.errors.map(error => `${escape(error.institution)}: ${escape(error.message)}`).join('<br>')}</p>` : ''}`;
  $('portfolio-refresh').onclick = () => { void refreshPlaidPortfolio(); };
  $('portfolio-manage-accounts').onclick = () => { portfolioPageOpen = false; $('app-layout').hidden = false; $('plaid-settings-panel').hidden = false; $('api-settings-panel').hidden = true; updateWorkspaceView(); renderBrokerageAccounts(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
}
async function loadSnapTradeState() { try { snapTradeState = await window.portfolioApp.snapTradeStatus(); } catch { snapTradeState = { configured: false, connections: [], portfolio: null }; } }
function updateSnapTradeFields() {
  $('snaptrade-client-id').placeholder = snapTradeState.configured ? 'Saved locally - enter a new ID to replace it' : 'SnapTrade Personal Client ID';
  $('snaptrade-consumer-key').placeholder = snapTradeState.configured ? 'Saved locally - enter a new Consumer Key to replace it' : 'SnapTrade Consumer Key';
  $('snaptrade-config-status').textContent = snapTradeState.configured ? 'SnapTrade Personal is configured.' : 'Add your SnapTrade Personal API key to connect a brokerage.';
}
function renderBrokerageAccounts() {
  const element = $('brokerage-accounts');
  if (!element) return;
  const connected = snapTradeState.connections?.length || snapTradeState.portfolio?.accounts?.length || 0;
  element.innerHTML = `<article class="brokerage-account"><div><strong>Brokerage Connections</strong><small>${connected ? `${connected} connected account${connected === 1 ? '' : 's'}` : (snapTradeState.configured ? 'Ready to connect through SnapTrade' : 'SnapTrade setup required')}</small></div><div class="brokerage-row-actions"><button id="snaptrade-connect" type="button" ${snapTradeState.configured ? '' : 'disabled'}>${connected ? 'Connect another' : 'Connect brokerage'}</button><button id="snaptrade-sync" type="button" ${connected ? '' : 'disabled'}>Refresh</button></div></article>`;
  $('snaptrade-connect').onclick = async () => { try { await window.portfolioApp.connectSnapTrade(); $('snaptrade-config-status').textContent = 'SnapTrade Connection Portal opened. After a successful connection it will close automatically and refresh the dashboard.'; } catch (error) { $('snaptrade-config-status').textContent = error.message || 'Could not open SnapTrade.'; } };
  $('snaptrade-sync').onclick = () => { void refreshSnapTradePortfolio(true); };
}
function requiresSnapTradeReconnect() {
  const errors = snapTradeState.portfolio?.errors || [];
  return (snapTradeState.connections || []).some(connection => connection.disabled) || errors.some(error => /re-authentication|disabled connection/i.test(String(error?.message || '')));
}
function maybeShowSnapTradeReconnectModal() {
  const modal = $('snaptrade-reconnect-modal');
  if (!requiresSnapTradeReconnect()) { snapTradeReconnectDismissed = false; return; }
  if (!portfolioPageOpen || snapTradeReconnectDismissed || !modal?.hidden) return;
  const brokenConnection = (snapTradeState.connections || []).find(connection => connection.disabled);
  openSnapTradeReconnectModal({ connectionId: brokenConnection?.id || '', institution: brokenConnection?.institution || 'Brokerage' });
}
function renderPortfolioPage() {
  const portfolio = snapTradeState.portfolio || { accounts: [], holdings: [], errors: [] }, accountRows = portfolio.accounts || [], holdingRows = portfolio.holdings || [];
  const value = accountRows.reduce((total, account) => total + (Number(account.balances?.current) || 0), 0);
  const accountMarkup = accountRows.length ? accountRows.map(account => `<article><div><strong>${escape(account.name || 'Investment account')}</strong><span>${escape(account.institution || 'Brokerage')}${account.mask ? ` - ${escape(account.mask)}` : ''}</span></div><small>${money(account.balances?.current)}</small></article>`).join('') : '<p>Connect a brokerage account to load your holdings.</p>';
  const holdings = holdingRows.length ? `<section class="portfolio-holdings"><h3>Holdings</h3><table><thead><tr><th>Security</th><th>Quantity</th><th>Price</th><th>Market value</th></tr></thead><tbody>${holdingRows.map(holding => `<tr><td>${escape(holding.instrument?.symbol || holding.instrument?.ticker || holding.instrument?.description || holding.instrument?.name || 'Security')}</td><td>${Number(holding.quantity || 0).toLocaleString()}</td><td>${money(holding.price)}</td><td>${money(holding.value)}</td></tr>`).join('')}</tbody></table></section>` : '';
  $('portfolio-page').innerHTML = `<div class="portfolio-heading"><div><h2>Portfolio</h2><p>${portfolio.lastSyncedAt ? `Last updated ${new Date(portfolio.lastSyncedAt).toLocaleString()}.` : 'Connect a brokerage account through SnapTrade.'}</p></div><div class="portfolio-page-actions"><button id="portfolio-refresh" type="button" ${snapTradeState.configured ? '' : 'disabled'}>Refresh portfolio</button><button id="portfolio-manage-accounts" type="button">Manage brokerage accounts</button></div></div><section class="portfolio-summary"><article><span>Connected accounts</span><strong>${accountRows.length}</strong><small>SnapTrade Personal</small></article><article><span>Portfolio value</span><strong>${accountRows.length ? money(value) : 'Unavailable'}</strong><small>Reported brokerage balances</small></article><article><span>Holdings</span><strong>${holdingRows.length || '—'}</strong><small>Authorized positions</small></article></section><section class="portfolio-accounts"><h3>Brokerage accounts</h3>${accountMarkup}</section>${holdings}`;
  if (portfolio.errors?.length) $('portfolio-page').insertAdjacentHTML('beforeend', `<p class="portfolio-errors">${portfolio.errors.map(error => `${escape(error.institution)}: ${escape(error.message)}`).join('<br>')}</p>`);
  $('portfolio-refresh').onclick = () => { void refreshSnapTradePortfolio(); };
  $('portfolio-manage-accounts').onclick = () => { portfolioPageOpen = false; settingsPageOpen = true; updateWorkspaceView(); renderBrokerageAccounts(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
}
const gainLossText = holding => {
  if (!Number.isFinite(holding.gainLoss)) return '—';
  return `${holding.gainLoss >= 0 ? '+' : '-'}${money(Math.abs(holding.gainLoss))}`;
};
const brokerageSyncTime = value => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Not reported by SnapTrade';
};
const hasStaleHoldingsSync = value => {
  const date = value ? new Date(value) : null;
  return Boolean(date && !Number.isNaN(date.getTime()) && Date.now() - date.getTime() > 36 * 60 * 60 * 1000);
};
const isOpenPortfolioHolding = holding => {
  const quantity = Number(holding?.quantity);
  const value = Number(holding?.value);
  return !(Number.isFinite(quantity) && Math.abs(quantity) <= 1e-8 && (!Number.isFinite(value) || Math.abs(value) < 0.005));
};
function renderPortfolioPage() {
  const portfolio = snapTradeState.portfolio || { accounts: [], holdings: [] }, accountRows = portfolio.accounts || [], holdingRows = (portfolio.holdings || []).filter(isOpenPortfolioHolding);
  const value = accountRows.reduce((total, account) => total + (Number(account.balances?.current) || 0), 0);
  const holdingTables = accountRows.filter(account => holdingRows.some(holding => String(holding.accountId) === String(account.id))).map(account => {
    const accountId = account.id, state = holdingSortState[accountId] || { column: 'security', direction: 'asc' }, expanded = holdingExpanded[accountId] !== false;
    const rows = holdingRows.filter(holding => String(holding.accountId) === String(accountId)).sort((left, right) => {
      const text = value => String(value ?? '').toLocaleUpperCase();
      const security = value => value.instrument?.symbol || value.instrument?.ticker || value.instrument?.description || value.instrument?.name || '';
      const numericValue = (holding, column) => column === 'priceDifference'
        ? Number(holding.price) - Number(holding.averagePrice)
        : Number(holding[column]);
      const leftValue = state.column === 'security' ? text(security(left)) : numericValue(left, state.column);
      const rightValue = state.column === 'security' ? text(security(right)) : numericValue(right, state.column);
      const comparison = state.column === 'security' ? leftValue.localeCompare(rightValue) : ((Number.isFinite(leftValue) ? leftValue : -Infinity) - (Number.isFinite(rightValue) ? rightValue : -Infinity));
      return state.direction === 'asc' ? comparison : -comparison;
    });
    const heading = (label, column) => {
      const active = state.column === column ? state.direction : '';
      return `<th>${label}<button type="button" class="holding-sort" data-holding-account="${escape(accountId)}" data-holding-column="${column}" aria-label="Sort ${label} ${active || 'ascending or descending'}" title="Sort ${label}"><i class="${active === 'asc' ? 'active' : ''}">▲</i><i class="${active === 'desc' ? 'active' : ''}">▼</i></button></th>`;
    };
    return `<section class="portfolio-holdings" data-holding-table="${escape(accountId)}"><div class="portfolio-holdings-heading"><div class="holding-account-summary"><h3>${escape(account.institution || 'Brokerage')} — ${escape(account.name || 'Investment account')}</h3><p>${account.mask ? `Account ${escape(account.mask)}` : 'Investment account'} · ${rows.length} holding${rows.length === 1 ? '' : 's'}</p></div><div class="holding-heading-actions"><button type="button" class="holding-toggle" data-holding-toggle="${escape(accountId)}" aria-expanded="${expanded}">${expanded ? 'Hide table' : 'Show table'}</button></div><strong class="holding-total-balance">Total balance: ${money(account.balances?.current)}</strong><strong class="holding-cash-position">Cash position: ${Number.isFinite(account.balances?.cash) ? money(account.balances.cash) : 'Unavailable'}</strong></div><div class="holding-table-wrap" ${expanded ? '' : 'hidden'}><table><thead><tr>${heading('Security', 'security')}${heading('Quantity', 'quantity')}${heading('Price', 'price')}${heading('Market value', 'value')}${heading('Gain / loss %', 'gainLossPercent')}${heading('Gain / loss', 'gainLoss')}</tr></thead><tbody>${rows.length ? rows.map(holding => `<tr><td>${escape(holding.instrument?.symbol || holding.instrument?.ticker || holding.instrument?.description || holding.instrument?.name || 'Security')}</td><td>${Number(holding.quantity || 0).toLocaleString()}</td><td>${money(holding.price)}</td><td>${money(holding.value)}</td><td class="${Number(holding.gainLossPercent) > 0 ? 'holding-gain' : Number(holding.gainLossPercent) < 0 ? 'holding-loss' : 'holding-neutral'}">${Number.isFinite(holding.gainLossPercent) ? `${holding.gainLossPercent >= 0 ? '+' : ''}${holding.gainLossPercent.toFixed(2)}%` : '—'}</td><td class="${Number(holding.gainLoss) > 0 ? 'holding-gain' : Number(holding.gainLoss) < 0 ? 'holding-loss' : 'holding-neutral'}">${gainLossText(holding)}</td></tr>`).join('') : '<tr><td colspan="6" class="holding-empty">Holdings are still syncing from this brokerage.</td></tr>'}</tbody></table></div></section>`;
  }).join('');
  $('portfolio-page').innerHTML = `<div class="portfolio-heading"><div><h2>Portfolio</h2><p>${portfolio.lastSyncedAt ? `Last updated ${new Date(portfolio.lastSyncedAt).toLocaleString()}.` : 'Connect a brokerage account through SnapTrade.'}</p></div><div class="portfolio-page-actions"><button id="portfolio-refresh" type="button" ${snapTradeState.configured ? '' : 'disabled'}>Refresh portfolio</button></div></div><section class="portfolio-summary"><article><span>Connected accounts</span><strong>${accountRows.length}</strong><small>SnapTrade Personal</small></article><article><span>Portfolio value</span><strong>${accountRows.length ? money(value) : 'Unavailable'}</strong></article><article><span>Holdings</span><strong>${holdingRows.length || '—'}</strong><small>Authorized positions</small></article></section><section class="portfolio-accounts"><div class="portfolio-accounts-heading"><h3>Brokerage accounts</h3><button id="brokerage-accounts-toggle" type="button" class="brokerage-accounts-toggle" aria-label="${brokerageAccountsExpanded ? 'Minimize brokerage accounts' : 'Expand brokerage accounts'}" aria-expanded="${brokerageAccountsExpanded}">${brokerageAccountsExpanded ? '−' : '+'}</button></div><div ${brokerageAccountsExpanded ? '' : 'hidden'}>${accountRows.length ? accountRows.map(account => `<article><div><strong>${escape(account.name || 'Investment account')}</strong><span>${escape(account.institution || 'Brokerage')}${account.mask ? ` - ${escape(account.mask)}` : ''}</span></div><small>${money(account.balances?.current)}</small></article>`).join('') : '<p>Connect a brokerage account to load your holdings.</p>'}</div></section>${holdingTables}`;
  if (portfolio.errors?.length) $('portfolio-page').insertAdjacentHTML('beforeend', `<p class="portfolio-errors">${portfolio.errors.map(error => `${escape(error.institution)}: ${escape(error.message)}`).join('<br>')}</p>`);
  $('portfolio-refresh').insertAdjacentHTML('afterend', `<button id="portfolio-manual-refresh" type="button" ${snapTradeState.configured ? '' : 'disabled'}>Manual refresh</button>`);
  $('portfolio-refresh').onclick = () => { void refreshSnapTradePortfolio(true); };
  $('portfolio-manual-refresh').onclick = openSnapTradeManualRefreshModal;
  $('brokerage-accounts-toggle').onclick = () => { brokerageAccountsExpanded = !brokerageAccountsExpanded; renderPortfolioPage(); };
  document.querySelectorAll('[data-holding-toggle]').forEach(button => button.onclick = () => { const id = button.dataset.holdingToggle; holdingExpanded[id] = !(holdingExpanded[id] !== false); renderPortfolioPage(); });
  document.querySelectorAll('[data-holding-column]').forEach(button => button.onclick = () => { const id = button.dataset.holdingAccount, column = button.dataset.holdingColumn, previous = holdingSortState[id] || { column: 'security', direction: 'asc' }; holdingSortState[id] = { column, direction: previous.column === column && previous.direction === 'asc' ? 'desc' : 'asc' }; renderPortfolioPage(); });
  maybeShowSnapTradeReconnectModal();
}
function macroSparkline(rows = [], valueKey = 'value', unit = 'units') {
  const points = rows.map(row => ({ value: Number(row[valueKey] ?? row.value), date: row.date || macroMonth(row) })).filter(row => Number.isFinite(row.value)).slice(-24);
  if (!points.length) return '<div class="macro-chart-empty">History unavailable</div>';
  const values = points.map(point => point.value);
  const low = Math.min(...values), high = Math.max(...values), span = Math.max(high - low, Math.abs(high) * .02, 1);
  const gap = 2, width = (300 - gap * (values.length - 1)) / values.length;
  const bars = points.map(({ value, date }, index) => {
    const height = Math.max(3, ((value - low) / span) * 54 + 3);
    const x = index * (width + gap), y = 66 - height;
    return `<rect data-macro-bar data-macro-date="${escape(date)}" data-macro-value="${escape(value.toLocaleString(undefined, { maximumFractionDigits: 4 }))}" data-macro-unit="${escape(unit)}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}"><title>${escape(date)} — ${value.toLocaleString()} ${unit}</title></rect>`;
  }).join('');
  return `<svg class="macro-sparkline" viewBox="0 0 300 78" role="img" aria-label="Recent historical bar chart; select a bar for its date and value"><line x1="0" y1="66" x2="300" y2="66"/>${bars}</svg><p class="macro-bar-readout" aria-live="polite">Select a bar for its date and value.</p>`;
}
function macroBlsValue(row) { return row && Number.isFinite(Number(row.value)) ? Number(row.value) : null; }
function macroMonth(row) { return row?.year && row?.periodName ? `${row.periodName} ${row.year}` : 'Latest release'; }
function macroYoY(rows = []) {
  const values = rows.map(row => Number(row.value)).filter(Number.isFinite);
  return values.length > 12 && values.at(-13) !== 0 ? ((values.at(-1) / values.at(-13)) - 1) * 100 : null;
}
function macroYoYSeries(rows = []) {
  const points = rows.map(row => ({ value: Number(row.value), date: row.date || macroMonth(row) })).filter(row => Number.isFinite(row.value));
  return points.slice(12).map((point, index) => ({ date: point.date, value: points[index].value ? ((point.value / points[index].value) - 1) * 100 : null })).filter(point => Number.isFinite(point.value));
}
function macroMoMSeries(rows = []) {
  const points = rows.map(row => ({ value: Number(row.value), date: row.date || macroMonth(row) })).filter(row => Number.isFinite(row.value));
  return points.slice(1).map((point, index) => ({ date: point.date, value: points[index].value ? ((point.value / points[index].value) - 1) * 100 : null })).filter(point => Number.isFinite(point.value));
}
function formatMacroPercent(value, decimals = 1) {
  if (!Number.isFinite(value)) return 'Unavailable';
  const normalized = Math.abs(value) < (0.5 * 10 ** -decimals) ? 0 : value;
  return `${normalized.toFixed(decimals)}%`;
}
function macroReleaseDate(dayOfWeek) { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + ((dayOfWeek - date.getDay() + 7) % 7 || 7)); return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function renderMacroPage() {
  const page = $('macro-page');
  if (!macroData) { page.innerHTML = `<div class="macro-heading"><div><h2>Macro Dashboard</h2><p>U.S. growth, labor, inflation, and business activity from official releases.</p></div></div><div class="macro-loading">${macroError ? escape(macroError) : '<i></i> Fetching the latest releases'}</div>`; return; }
  const bls = macroData?.bls || {}, fred = macroData?.fred || {}, commodities = macroData?.commodities || {}, history = macroData?.history || {};
  const card = (title, definition, value, detail, source, href, chart = '') => `<article class="macro-card"><div class="macro-card-heading"><span class="macro-indicator" tabindex="0">${escape(title)} <i aria-hidden="true">?</i><span class="macro-tooltip" role="tooltip">${escape(definition)}</span></span><a href="${href}" target="_blank" rel="noreferrer">Source</a></div><strong>${escape(value)}</strong><small>${escape(detail)}</small>${chart}</article>`;
  const payrolls = macroBlsValue(bls.payrolls), unemployment = macroBlsValue(bls.unemployment), cpiYoy = macroYoY(history.cpi), coreYoy = macroYoY(history.coreCpi);
  const cpiYoyHistory = macroYoYSeries(history.cpi), coreCpiYoyHistory = macroYoYSeries(history.coreCpi), cpiMoMHistory = macroMoMSeries(history.cpi), coreCpiMoMHistory = macroMoMSeries(history.coreCpi);
  const cpiMoM = cpiMoMHistory.at(-1)?.value ?? null, coreMoM = coreCpiMoMHistory.at(-1)?.value ?? null;
  const inflationIsMoM = macroInflationView === 'mom';
  const inflationControls = `<div class="macro-inflation-toggle" role="group" aria-label="Inflation chart measure"><button type="button" data-inflation-view="mom" class="${inflationIsMoM ? 'active' : ''}" aria-pressed="${inflationIsMoM}">MoM</button><button type="button" data-inflation-view="yoy" class="${inflationIsMoM ? '' : 'active'}" aria-pressed="${!inflationIsMoM}">YoY</button></div>`;
  const privatePayrolls = history.privatePayrolls || [];
  const privatePayrollChange = privatePayrolls.length > 1 ? (macroBlsValue(privatePayrolls.at(-1)) - macroBlsValue(privatePayrolls.at(-2))) * 1000 : null;
  const claims = fred.claims, pmi = fred.pmi, manufacturingOutput = fred.manufacturingOutput, oil = fred.oil, gdp = fred.gdp, spending = fred.spending, income = fred.income, lithium = commodities.lithium, gold = commodities.gold, silver = commodities.silver;
  const adp = macroData?.adp, gdpNow = macroData?.gdpNow;
  const cards = [
    card('Private Employment Change', 'Monthly change in private-sector payrolls. ADP is used when available; BLS is the clearly labelled fallback.', adp?.value ? `${adp.value.toLocaleString()} jobs` : Number.isFinite(privatePayrollChange) ? `${privatePayrollChange >= 0 ? '+' : ''}${privatePayrollChange.toLocaleString()} jobs` : 'Unavailable', adp?.period || (Number.isFinite(privatePayrollChange) ? `BLS private-payroll proxy · ${macroMonth(bls.privatePayrolls)}` : 'Monthly ADP release'), 'ADP / BLS', adp?.value ? 'https://adpemploymentreport.com/' : 'https://www.bls.gov/news.release/empsit.nr0.htm', macroSparkline(privatePayrolls, 'value', 'thousand jobs')),
    card('Nonfarm Payrolls', 'The number of jobs added or lost across U.S. nonfarm employers in the latest month, reported in thousands.', payrolls ? `${payrolls.toLocaleString()}K` : 'Unavailable', macroMonth(bls.payrolls), 'BLS', 'https://www.bls.gov/news.release/empsit.nr0.htm', macroSparkline(history.payrolls, 'value', 'thousand jobs')),
    card('Unemployment Rate', 'The share of people in the labor force who are actively seeking work but do not have a job.', unemployment !== null ? `${unemployment.toFixed(1)}%` : 'Unavailable', macroMonth(bls.unemployment), 'BLS', 'https://www.bls.gov/news.release/empsit.nr0.htm', macroSparkline(history.unemployment, 'value', '%')),
    card('Initial Jobless Claims', 'New applications for unemployment benefits filed during the latest week. It is a timely signal of labor-market stress.', claims ? `${Math.round(claims.value * 1000).toLocaleString()}` : 'Unavailable', claims ? `Week ending ${claims.date}` : 'Weekly DOL release', 'FRED / DOL', 'https://fred.stlouisfed.org/series/ICSA', macroSparkline(history.claims, 'value', 'thousand claims')),
    card('Manufacturing Activity', 'ISM PMI measures survey-based manufacturing conditions; above 50 generally signals expansion. A Federal Reserve output index is shown when ISM blocks retrieval.', pmi ? `ISM PMI ${pmi.value.toFixed(1)}` : manufacturingOutput ? `Output index ${manufacturingOutput.value.toFixed(1)}` : 'Unavailable', pmi ? `ISM release · ${pmi.date}` : manufacturingOutput ? `ISM blocked automated retrieval · Fed manufacturing output · ${manufacturingOutput.date}` : 'Monthly release', pmi ? 'ISM' : 'Federal Reserve', pmi ? 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/pmi/' : 'https://fred.stlouisfed.org/series/IPMAN', macroSparkline(pmi ? history.pmi : history.manufacturingOutput, 'value', 'index points')),
    card('Oil Price', 'West Texas Intermediate (WTI) crude-oil spot price in U.S. dollars per barrel. It is a widely used U.S. benchmark for oil prices.', oil ? `$${oil.value.toFixed(2)} / bbl` : 'Unavailable', oil ? `WTI spot · ${oil.date}` : 'Daily FRED update', 'FRED', 'https://fred.stlouisfed.org/series/DCOILWTICO', macroSparkline(history.oil, 'value', 'USD / barrel')),
    card('Lithium Carbonate Spot Price', 'Battery-grade lithium carbonate, 99.5% Li2CO3 minimum, traded in China. Prices are quoted in Chinese yuan per metric tonne.', lithium ? `${lithium.value.toLocaleString()} ${lithium.unit}` : 'Unavailable', lithium ? `Latest public spot assessment${lithium.date ? ` · ${lithium.date}` : ''}` : 'Public daily pricing', 'Trading Economics', 'https://tradingeconomics.com/commodity/lithium', macroSparkline(history.lithium, 'value', 'CNY / tonne')),
    card('Gold Price', 'Gold futures are used as a liquid U.S.-dollar proxy for the current gold price, quoted per troy ounce.', gold ? `$${gold.value.toFixed(2)} / oz` : 'Unavailable', gold?.date ? `Latest futures close · ${gold.date}` : 'Daily market pricing', 'Yahoo Finance', 'https://finance.yahoo.com/quote/GC%3DF', macroSparkline(history.gold, 'value', 'USD / troy oz')),
    card('Silver Price', 'Silver futures are used as a liquid U.S.-dollar proxy for the current silver price, quoted per troy ounce.', silver ? `$${silver.value.toFixed(2)} / oz` : 'Unavailable', silver?.date ? `Latest futures close · ${silver.date}` : 'Daily market pricing', 'Yahoo Finance', 'https://finance.yahoo.com/quote/SI%3DF', macroSparkline(history.silver, 'value', 'USD / troy oz')),
    card('Atlanta Fed GDPNow', 'A frequently updated model estimate of current-quarter real GDP growth, not an official BEA GDP release.', gdpNow?.value !== undefined ? `${gdpNow.value.toFixed(1)}%` : 'Unavailable', gdpNow?.updatedAt ? `Updated ${new Date(gdpNow.updatedAt).toLocaleDateString()}` : 'Real-time estimate', 'Atlanta Fed', 'https://www.atlantafed.org/cqer/research/gdpnow/', macroSparkline(history.gdpNow, 'value', '% annualized')),
    card('Real GDP Growth', 'Inflation-adjusted growth in the total output of the U.S. economy, reported at an annualized quarterly rate.', gdp ? `${gdp.value.toFixed(1)}%` : 'Unavailable', gdp ? `Latest BEA estimate · ${gdp.date}` : 'Quarterly BEA release', 'FRED / BEA', 'https://fred.stlouisfed.org/series/A191RL1Q225SBEA', macroSparkline(history.gdp, 'value', '% annualized')),
    card('Headline CPI (All Items)', 'Consumer-price inflation for the broad all-items basket, including food and energy. Use the toggle to view the latest monthly change or 12-month change.', inflationIsMoM ? (cpiMoM !== null ? `${formatMacroPercent(cpiMoM, 2)} MoM` : 'Unavailable') : (cpiYoy !== null ? `${formatMacroPercent(cpiYoy)} YoY` : 'Unavailable'), macroMonth(bls.cpi), 'BLS', 'https://www.bls.gov/news.release/cpi.nr0.htm', `${inflationControls}${macroSparkline(inflationIsMoM ? cpiMoMHistory : cpiYoyHistory, 'value', inflationIsMoM ? '% MoM' : '% YoY')}`),
    card('Core CPI (Ex Food & Energy)', 'Consumer-price inflation excluding food and energy. It is a companion measure to headline CPI that reduces volatile food and energy moves. Use the toggle to view the latest monthly change or 12-month change.', inflationIsMoM ? (coreMoM !== null ? `${formatMacroPercent(coreMoM, 2)} MoM` : 'Unavailable') : (coreYoy !== null ? `${formatMacroPercent(coreYoy)} YoY` : 'Unavailable'), macroMonth(bls.coreCpi), 'BLS', 'https://www.bls.gov/news.release/cpi.nr0.htm', `${inflationControls}${macroSparkline(inflationIsMoM ? coreCpiMoMHistory : coreCpiYoyHistory, 'value', inflationIsMoM ? '% MoM' : '% YoY')}`),
    card('Consumer Spending', 'Personal consumption expenditures: the annualized dollar value of household spending on goods and services.', spending ? `$${(spending.value / 1000).toFixed(1)}T` : 'Unavailable', spending ? `PCE · ${spending.date}` : 'Monthly BEA release', 'FRED / BEA', 'https://fred.stlouisfed.org/series/PCE', macroSparkline(history.spending, 'value', 'million USD annualized')),
    card('Personal Income', 'Annualized income received by households from wages, benefits, investments, and other sources.', income ? `$${(income.value / 1000).toFixed(1)}T` : 'Unavailable', income ? `Annual rate · ${income.date}` : 'Monthly BEA release', 'FRED / BEA', 'https://fred.stlouisfed.org/series/PI', macroSparkline(history.income, 'value', 'million USD annualized'))
  ].join('');
  page.innerHTML = `<div class="macro-heading"><div><h2>Macro Dashboard</h2><p>U.S. growth, labor, inflation, and business activity from official releases.</p><span class="data-source">Sources: BLS, BEA, U.S. Department of Labor, Federal Reserve Bank of Atlanta, ADP, ISM, and FRED.</span></div><div class="macro-page-actions"><button id="macro-refresh" type="button">Refresh macro data</button></div></div><section class="macro-section"><div class="macro-section-heading"><h3>Latest Indicators</h3><span>${macroData?.updatedAt ? `Updated ${new Date(macroData.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</span></div><div class="macro-grid">${cards}</div></section><section class="macro-section macro-calendar"><div class="macro-section-heading"><h3>Typical Release Rhythm</h3><span>Dates can shift for holidays</span></div><div class="macro-calendar-grid"><article><strong>ADP Employment</strong><span>Early month · next Wednesday ${macroReleaseDate(3)}</span></article><article><strong>Employment Situation</strong><span>First Friday of month</span></article><article><strong>Initial Jobless Claims</strong><span>Weekly · next Thursday ${macroReleaseDate(4)}</span></article><article><strong>ISM Manufacturing PMI</strong><span>First business day of month</span></article><article><strong>CPI &amp; Core CPI</strong><span>Mid-month · BLS release</span></article><article><strong>Personal Income &amp; Spending</strong><span>Late month · BEA release</span></article><article><strong>Advance GDP</strong><span>Late month following quarter-end</span></article><article><strong>GDPNow</strong><span>Updated after relevant source releases</span></article></div></section>${macroData?.errors?.length ? `<p class="macro-notice">Some public sources are temporarily unavailable. The remaining indicators continue to display normally.</p>` : ''}`;
  document.querySelectorAll('[data-macro-bar]').forEach(bar => bar.onclick = () => {
    const readout = bar.closest('.macro-card')?.querySelector('.macro-bar-readout');
    if (readout) readout.textContent = `${bar.dataset.macroDate} — ${bar.dataset.macroValue} ${bar.dataset.macroUnit}`;
  });
  document.querySelectorAll('[data-inflation-view]').forEach(button => button.onclick = () => { macroInflationView = button.dataset.inflationView; renderMacroPage(); });
  $('macro-refresh').onclick = () => { void refreshMacroData(true); };
}
async function refreshMacroData(force = false) {
  if (macroLoading) return;
  macroLoading = true; if (macroPageOpen) renderMacroPage();
  try { macroError = ''; macroData = await window.portfolioApp.refreshMacro(force); }
  catch (error) { macroError = error?.message || 'Macro data could not be loaded.'; }
  finally { macroLoading = false; if (macroPageOpen) renderMacroPage(); }
}
function trendsInterestChart(data) {
  const points = data?.points || [];
  if (!points.length) return '<div class="trends-chart-empty">No trend data is available for this range.</div>';
  const width = 920, height = 360, left = 52, right = 22, top = 20, bottom = 42, plotWidth = width - left - right, plotHeight = height - top - bottom;
  const x = index => left + (points.length < 2 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const y = value => top + plotHeight - (Math.max(0, Math.min(100, Number(value) || 0)) / 100) * plotHeight;
  const colors = ['#61a8e6', '#ef9a55', '#75c99b', '#bb8ff0', '#e8739c'];
  const grid = [0, 25, 50, 75, 100].map(value => `<g><line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}"/><text x="${left - 10}" y="${y(value) + 4}" text-anchor="end">${value}</text></g>`).join('');
  const labelIndexes = [...new Set([0, Math.round((points.length - 1) / 2), points.length - 1])];
  const labels = labelIndexes.map(index => {
    const point = points[index], anchor = index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle';
    const date = new Date(point?.time);
    const label = Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(points.length > 55 ? { year: 'numeric' } : {}) }) : point?.label || '';
    return `<text x="${x(index)}" y="${height - 14}" text-anchor="${anchor}">${escape(label)}</text>`;
  }).join('');
  const series = data.terms.map((term, termIndex) => `<polyline class="trends-line" style="stroke:${colors[termIndex % colors.length]}" points="${points.map((point, index) => `${x(index).toFixed(1)},${y(point.values?.[termIndex]).toFixed(1)}`).join(' ')}"><title>${escape(term)}</title></polyline>`).join('');
  const dots = data.terms.map((term, termIndex) => points.map((point, index) => `<circle class="trends-point" cx="${x(index).toFixed(1)}" cy="${y(point.values?.[termIndex]).toFixed(1)}" r="4" fill="${colors[termIndex % colors.length]}"><title>${escape(`${term}: ${point.values?.[termIndex] ?? 0} · ${point.label}`)}</title></circle>`).join('')).join('');
  return `<div class="trends-chart-wrap"><svg class="trends-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Google Trends interest over time">${grid}${series}${dots}${labels}</svg></div>`;
}
function renderTrendsPage() {
  const page = $('trends-page');
  const terms = Array.isArray(settings.trendsTerms) ? settings.trendsTerms : [];
  const timeframe = settings.trendsTimeframe || 'today 12-m';
  const ranges = [['now 7-d', '7 days'], ['today 1-m', '1 month'], ['today 3-m', '3 months'], ['today 12-m', '12 months'], ['today 5-y', '5 years'], ['all', 'Max']];
  const chips = terms.map((term, index) => `<span class="trends-term-chip">${escape(term)}<button type="button" data-trends-remove="${index}" aria-label="Remove ${escape(term)}">×</button></span>`).join('') || '<span class="trends-empty-terms">Add up to five search terms.</span>';
  const chart = trendsLoading ? '<div class="trends-loading"><i></i><span>Loading Google Trends interest data…</span></div>' : trendsData ? trendsInterestChart(trendsData) : `<div class="trends-chart-empty">${escape(trendsError || 'Add a search term to begin.')}</div>`;
  page.innerHTML = `<div class="trends-heading"><div><h2>Search Trends</h2><p>Google Trends interest over time for the topics you follow.</p><span class="data-source">Source: Google Trends via the pytrends interest-over-time endpoint. Values are relative search interest (0–100), not search volume.</span></div><button id="trends-refresh" type="button" ${terms.length ? '' : 'disabled'}>Refresh</button></div><section class="trends-controls"><form id="trends-add-form"><label for="trends-term-input">Search index</label><div><input id="trends-term-input" maxlength="100" placeholder="e.g. Artificial intelligence" ${terms.length >= 5 ? 'disabled' : ''}><button type="submit" ${terms.length >= 5 ? 'disabled' : ''}>Add</button></div></form><div class="trends-range-control"><span>Timeframe</span><div>${ranges.map(([value, label]) => `<button type="button" data-trends-range="${value}" class="${timeframe === value ? 'active' : ''}">${label}</button>`).join('')}</div></div><div class="trends-term-list">${chips}</div></section><section class="trends-panel"><div class="trends-panel-heading"><h3>Interest over time</h3><span>${trendsData?.updatedAt ? `Updated ${new Date(trendsData.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</span></div>${chart}</section>`;
  $('trends-add-form').onsubmit = async event => { event.preventDefault(); const input = $('trends-term-input'), term = input.value.trim(); if (!term || terms.some(item => item.toLowerCase() === term.toLowerCase())) return; settings.trendsTerms = [...terms, term].slice(0, 5); input.value = ''; await window.portfolioApp.saveSettings(settings); trendsData = null; void refreshTrendsData(); renderTrendsPage(); };
  $('trends-refresh').onclick = () => { void refreshTrendsData(true); };
  document.querySelectorAll('[data-trends-remove]').forEach(button => button.onclick = async () => { settings.trendsTerms = terms.filter((_, index) => index !== Number(button.dataset.trendsRemove)); trendsData = null; await window.portfolioApp.saveSettings(settings); renderTrendsPage(); if (settings.trendsTerms.length) void refreshTrendsData(); });
  document.querySelectorAll('[data-trends-range]').forEach(button => button.onclick = async () => { settings.trendsTimeframe = button.dataset.trendsRange; trendsData = null; await window.portfolioApp.saveSettings(settings); renderTrendsPage(); if (terms.length) void refreshTrendsData(); });
}
async function refreshTrendsData() {
  const terms = Array.isArray(settings.trendsTerms) ? settings.trendsTerms : [];
  if (trendsLoading || !terms.length) return;
  trendsLoading = true; trendsError = ''; if (trendsPageOpen) renderTrendsPage();
  try { trendsData = await window.portfolioApp.trendsInterest({ terms, timeframe: settings.trendsTimeframe || 'today 12-m' }); }
  catch (error) { trendsError = error?.message || 'Google Trends data could not be loaded.'; }
  finally { trendsLoading = false; if (trendsPageOpen) renderTrendsPage(); }
}
const renderTrendsPageBase = renderTrendsPage;
function trackedTrendIndexes() { return Array.isArray(settings.trackedTrendIndexes) ? settings.trackedTrendIndexes : []; }
function socialArbitrageKeywords() { return Array.isArray(settings.socialArbitrageKeywords) ? settings.socialArbitrageKeywords : []; }
function recordTrendSearch(term) {
  const normalized = String(term || '').trim();
  if (!normalized) return;
  settings.trendsSearchHistory = [normalized, ...(Array.isArray(settings.trendsSearchHistory) ? settings.trendsSearchHistory : []).filter(item => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 10);
}
async function refreshTrackedTrendIndexes() {
  const indexes = trackedTrendIndexes();
  if (trackedTrendsLoading || !indexes.length) return;
  trackedTrendsLoading = true;
  try {
    // Request each tracked index on its own scale. Google Trends normalizes an
    // individual series to 0–100; batching unrelated terms would distort it.
    for (const index of indexes) {
      try {
        // A one-month request provides daily observations, so the card can
        // compare the latest interest level with the prior day.
        const data = await window.portfolioApp.trendsInterest({ terms: [index], timeframe: 'today 1-m' });
        const latest = data?.points?.at(-1);
        const previous = data?.points?.at(-2);
        if (latest) {
          const value = Number(latest.values?.[0]) || 0, previousValue = Number(previous?.values?.[0]);
          trackedTrendsData[index.toLowerCase()] = { value, previousValue: Number.isFinite(previousValue) ? previousValue : null, change: Number.isFinite(previousValue) ? value - previousValue : null, label: latest.label || '', updatedAt: data.updatedAt };
        }
      } catch { /* Preserve the most recent value when Google temporarily limits a single index. */ }
    }
  } finally {
    trackedTrendsLoading = false;
    if (trendsPageOpen) renderTrendsPage();
  }
}
function renderTrendsEnhancements() {
  const page = $('trends-page');
  if (!page || !trendsPageOpen) return;
  const selectedTimeframe = settings.trendsTimeframe || 'today 12-m';
  const trendTimeframes = [['now 1-H', 'Past hour'], ['now 4-H', 'Past 4 hours'], ['now 1-d', 'Past 24 hours'], ['now 7-d', 'Past week'], ['today 1-m', 'Past month'], ['today 3-m', 'Past 3 months'], ['today 12-m', 'Past year'], ['today 5-y', 'Past 5 years'], ['all', '2004 – present'], [String(new Date().getFullYear()), String(new Date().getFullYear())], [String(new Date().getFullYear() - 1), String(new Date().getFullYear() - 1)]];
  const rangeControl = page.querySelector('.trends-range-control');
  if (rangeControl) rangeControl.innerHTML = `<span>Timeframe</span><select id="trends-timeframe-select" aria-label="Google Trends timeframe">${trendTimeframes.map(([value, label]) => `<option value="${value}" ${selectedTimeframe === value ? 'selected' : ''}>${label}</option>`).join('')}</select>`;
  const trendsNotice = trendsData?.rateLimited
    ? 'Google Trends is temporarily rate-limiting requests. A zero baseline is shown until the next update.'
    : trendsData?.noHistory
      ? 'No Google Trends history was returned for this search and range. A zero baseline is shown.'
      : trendsData?.fallbackNotice;
  if (trendsNotice) page.querySelector('.trends-panel-heading')?.insertAdjacentHTML('afterend', `<p class="trends-fallback-notice">${escape(trendsNotice)}</p>`);
  const history = Array.isArray(settings.trendsSearchHistory) ? settings.trendsSearchHistory : [];
  const form = $('trends-add-form');
  form?.insertAdjacentHTML('afterend', `<div class="trends-search-history"><span>Recent searches</span><div>${history.length ? history.map((term, index) => `<button type="button" data-trends-history="${index}">${escape(term)}</button>`).join('') : '<small>Your recent searches will appear here.</small>'}</div></div>`);
  const tracked = trackedTrendIndexes();
  const cards = tracked.map((index, position) => {
    const value = trackedTrendsData[index.toLowerCase()];
    const direction = Number.isFinite(value?.change) ? value.change > 0 ? 'up' : value.change < 0 ? 'down' : 'flat' : '';
    const change = Number.isFinite(value?.change) ? `${value.change >= 0 ? '+' : ''}${value.change} vs prior day` : 'Prior-day comparison pending';
    return `<article class="tracked-trend-card" data-tracked-trend-card="${position}" tabindex="0" role="button" aria-label="Open ${escape(index)} in interest-over-time chart"><div><strong>${escape(index)}</strong><small>${value?.label || 'Awaiting latest reading'}</small><em class="tracked-trend-change ${direction}">${escape(change)}</em></div><b>${value ? `${value.value}<span>/100</span>` : '—'}</b><button type="button" data-tracked-trend-remove="${position}" aria-label="Remove ${escape(index)}">×</button></article>`;
  }).join('') || '<p class="trends-empty-terms">Add an index to keep its latest trend reading visible here.</p>';
  page.insertAdjacentHTML('beforeend', `<section class="tracked-trends-section"><div class="trends-panel-heading"><div><h3>Tracked Indexes</h3><span>Refreshes while this page is open. Latest interest is relative to each index’s selected range.</span></div><button id="tracked-trends-refresh" type="button" ${tracked.length ? '' : 'disabled'}>${trackedTrendsLoading ? 'Updating…' : 'Update indexes'}</button></div><form id="tracked-trends-add-form" class="tracked-trends-add"><input id="tracked-trends-input" maxlength="100" placeholder="Add an index to track" ${tracked.length >= 8 ? 'disabled' : ''}><button type="submit" ${tracked.length >= 8 ? 'disabled' : ''}>Track index</button></form><div class="tracked-trends-grid">${cards}</div></section>`);
  form.onsubmit = async event => {
    event.preventDefault();
    const input = $('trends-term-input'), term = input.value.trim();
    if (!term) return;
    recordTrendSearch(term);
    settings.trendsTerms = [term];
    input.value = '';
    trendsData = null;
    await window.portfolioApp.saveSettings(settings);
    void refreshTrendsData();
    renderTrendsPage();
  };
  $('trends-timeframe-select').onchange = async event => {
    settings.trendsTimeframe = event.target.value; trendsData = null;
    await window.portfolioApp.saveSettings(settings); void refreshTrendsData(); renderTrendsPage();
  };
  document.querySelectorAll('[data-trends-history]').forEach(button => button.onclick = async () => {
    const term = history[Number(button.dataset.trendsHistory)]; if (!term) return;
    settings.trendsTerms = [term]; trendsData = null;
    await window.portfolioApp.saveSettings(settings);
    void refreshTrendsData(); renderTrendsPage();
  });
  $('tracked-trends-add-form').onsubmit = async event => {
    event.preventDefault(); const input = $('tracked-trends-input'), index = input.value.trim();
    if (!index || tracked.some(item => item.toLowerCase() === index.toLowerCase())) return;
    settings.trackedTrendIndexes = [...tracked, index].slice(0, 8); input.value = '';
    await window.portfolioApp.saveSettings(settings); renderTrendsPage(); void refreshTrackedTrendIndexes();
  };
  $('tracked-trends-refresh').onclick = () => { void refreshTrackedTrendIndexes(); };
  document.querySelectorAll('[data-tracked-trend-card]').forEach(card => {
    const open = async () => {
      const index = tracked[Number(card.dataset.trackedTrendCard)]; if (!index) return;
      recordTrendSearch(index); settings.trendsTerms = [index]; trendsData = null;
      await window.portfolioApp.saveSettings(settings); void refreshTrendsData(); renderTrendsPage();
      requestAnimationFrame(() => page.querySelector('.trends-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
    card.onclick = event => { if (!(event.target instanceof HTMLElement) || !event.target.closest('[data-tracked-trend-remove]')) void open(); };
    card.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void open(); } };
  });
  document.querySelectorAll('[data-tracked-trend-remove]').forEach(button => button.onclick = async () => {
    settings.trackedTrendIndexes = tracked.filter((_, index) => index !== Number(button.dataset.trackedTrendRemove));
    await window.portfolioApp.saveSettings(settings); renderTrendsPage();
  });

  // Keep a simple, persistent idea bank alongside the trends research surface.
  // These phrases are deliberately independent of Google Trends terms: saving a
  // TikTok research idea never changes the chart that is currently open.
  const controls = page.querySelector('.trends-controls');
  const panel = page.querySelector('.trends-panel');
  const keywords = socialArbitrageKeywords();
  if (controls && panel) {
    const keywordItems = keywords.map((keyword, index) => `<li><span>${escape(keyword)}</span><button type="button" data-social-keyword-remove="${index}" aria-label="Remove ${escape(keyword)}">×</button></li>`).join('') || '<li class="social-keyword-empty">Add words, product ideas, or phrases to research on TikTok.</li>';
    const layout = document.createElement('div');
    layout.className = 'trends-research-layout';
    const main = document.createElement('div');
    main.className = 'trends-research-main';
    controls.before(layout);
    layout.append(main);
    main.append(controls, panel);
    layout.insertAdjacentHTML('beforeend', `<aside class="social-keywords-panel" aria-label="TikTok Social Arbitrage Keywords"><div><h3>TikTok Social-Arbitrage Keywords</h3><p>Private phrase list for social-arbitrage research.</p></div><form id="social-keyword-add-form"><input id="social-keyword-input" maxlength="120" placeholder="Add a word or phrase"><button type="submit">Add</button></form><ul class="social-keyword-list">${keywordItems}</ul></aside>`);
  }
  $('social-keyword-add-form').onsubmit = async event => {
    event.preventDefault();
    const input = $('social-keyword-input');
    const keyword = input.value.trim();
    if (!keyword || keywords.some(item => item.toLowerCase() === keyword.toLowerCase())) return;
    settings.socialArbitrageKeywords = [...keywords, keyword].slice(0, 100);
    await window.portfolioApp.saveSettings(settings);
    renderTrendsPage();
  };
  document.querySelectorAll('[data-social-keyword-remove]').forEach(button => button.onclick = async () => {
    settings.socialArbitrageKeywords = keywords.filter((_, index) => index !== Number(button.dataset.socialKeywordRemove));
    await window.portfolioApp.saveSettings(settings);
    renderTrendsPage();
  });
}
renderTrendsPage = () => { renderTrendsPageBase(); renderTrendsEnhancements(); };
function renderBrokerageDiagnosticsPage() {
  const page = $('brokerage-diagnostics-page');
  const portfolio = snapTradeState.portfolio || { accounts: [], holdings: [], errors: [] };
  const accounts = portfolio.accounts || [];
  const brokerageGroups = [...accounts.reduce((groups, account) => {
    const key = String(account.connectionId || account.institution || account.id);
    const existing = groups.get(key) || { key, institution: account.institution || 'Brokerage', accounts: [] };
    existing.accounts.push(account);
    groups.set(key, existing);
    return groups;
  }, new Map()).values()];
  const accountDiagnostics = brokerageGroups.map(group => {
    const groupAccounts = group.accounts;
    const connectionDisabled = groupAccounts.some(account => account.connectionDisabled);
    const accountNames = groupAccounts.map(account => account.name || 'Investment account').join(', ');
    const accountStatusRows = groupAccounts.map(account => {
      const accountFreshness = account.freshness === 'realtime'
        ? 'Real-time'
        : account.freshness === 'delayed'
          ? 'Delayed / cached'
          : 'Not reported by SnapTrade';
      const syncStale = hasStaleHoldingsSync(account.lastHoldingsSync);
      const connectionLabel = account.connectionDisabled ? 'Re-authentication required' : (syncStale ? 'Active — sync stale' : 'Active');
      return `<tr><td>${escape(account.name || 'Investment account')}${account.mask ? `<small>${escape(account.mask)}</small>` : ''}</td><td>${accountFreshness}</td><td class="${account.connectionDisabled || syncStale ? 'holding-loss' : 'holding-gain'}">${connectionLabel}</td><td>${escape(brokerageSyncTime(account.lastHoldingsSync))}</td><td>${escape(brokerageSyncTime(portfolio.lastSyncedAt))}</td></tr>`;
    }).join('');
    return `<section class="brokerage-diagnostics"><div class="brokerage-diagnostics-heading"><div><h3>${escape(group.institution)}</h3><p>${escape(`${groupAccounts.length} account${groupAccounts.length === 1 ? '' : 's'}: ${accountNames}`)}</p></div><button type="button" class="diagnostics-brokerage-reconnect" data-diagnostics-brokerage-reconnect="${escape(groupAccounts[0]?.connectionId || '')}" data-diagnostics-brokerage-name="${escape(group.institution)}" data-diagnostics-brokerage-disabled="${connectionDisabled}">Reconnect</button></div><table class="brokerage-status-table"><colgroup><col class="brokerage-status-account"><col class="brokerage-status-freshness"><col class="brokerage-status-connection"><col class="brokerage-status-sync"><col class="brokerage-status-request"></colgroup><thead><tr><th>Account</th><th>Data freshness</th><th>Connection</th><th>Last holdings sync</th><th>Dashboard request</th></tr></thead><tbody>${accountStatusRows}</tbody></table></section>`;
  }).join('');
  page.innerHTML = `<div class="settings-page-heading"><div><h2>Brokerage Diagnostics</h2><p>SnapTrade connection state, freshness, and sync timing used by the Portfolio page.</p></div><div class="portfolio-page-actions"><button id="diagnostics-refresh" type="button">Refresh portfolio</button><button id="diagnostics-settings" type="button">Settings</button></div></div><p id="diagnostics-status" role="status"></p>${accountDiagnostics || '<section class="api-settings-panel"><p>No brokerage account data is available yet. Connect an account in Settings, then refresh the portfolio.</p></section>'}${portfolio.errors?.length ? `<p class="portfolio-errors">${portfolio.errors.map(error => `${escape(error.institution)}: ${escape(error.message)}`).join('<br>')}</p>` : ''}`;
  $('diagnostics-refresh').onclick = () => { void refreshSnapTradePortfolio(true); };
  $('diagnostics-settings').onclick = () => { brokerageDiagnosticsPageOpen = false; settingsPageOpen = true; updateWorkspaceView(); };
  page.querySelectorAll('[data-diagnostics-brokerage-reconnect]').forEach(button => {
    button.onclick = async () => {
      const institution = button.dataset.diagnosticsBrokerageName || 'Brokerage';
      if (button.dataset.diagnosticsBrokerageDisabled === 'true') {
        openSnapTradeReconnectModal({ connectionId: button.dataset.diagnosticsBrokerageReconnect, institution });
        return;
      }
      button.disabled = true;
      try {
        await window.portfolioApp.connectSnapTrade();
        $('diagnostics-status').textContent = `SnapTrade Connection Portal opened for ${institution}. Complete sign-in, then use Done to return and refresh the dashboard.`;
      } catch (error) {
        $('diagnostics-status').textContent = error.message || 'Could not open SnapTrade connection.';
      } finally {
        button.disabled = false;
      }
    };
  });
}
function workspacePage() {
  if (brokerageDiagnosticsPageOpen) return 'diagnostics';
  if (settingsPageOpen) return 'settings';
  if (aiAgentPageOpen) return 'ai-agent';
  if (trendsPageOpen) return 'trends';
  if (macroPageOpen) return 'macro';
  if (portfolioPageOpen) return 'portfolio';
  return 'dashboard';
}
function updateWorkspaceView() {
  const page = workspacePage();
  if (page !== activeWorkspacePage) {
    if (!navigatingBack) workspaceHistory.push(activeWorkspacePage);
    activeWorkspacePage = page;
  }
  navigatingBack = false;
  const dashboardOpen = page === 'dashboard';
  $('app-header').hidden = !dashboardOpen;
  $('app-layout').hidden = !dashboardOpen;
  $('portfolio-page').hidden = !portfolioPageOpen;
  $('settings-page').hidden = !settingsPageOpen;
  $('macro-page').hidden = !macroPageOpen;
  $('trends-page').hidden = !trendsPageOpen;
  $('ai-agent-page').hidden = !aiAgentPageOpen;
  $('brokerage-diagnostics-page').hidden = !brokerageDiagnosticsPageOpen;
  $('dashboard-view-toggle').setAttribute('aria-pressed', String(dashboardOpen));
  $('macro-view-toggle').setAttribute('aria-pressed', String(macroPageOpen));
  $('trends-view-toggle').setAttribute('aria-pressed', String(trendsPageOpen));
  $('ai-agent-view-toggle').setAttribute('aria-pressed', String(aiAgentPageOpen));
  $('portfolio-view-toggle').setAttribute('aria-pressed', String(portfolioPageOpen));
  $('settings-view-toggle').setAttribute('aria-pressed', String(settingsPageOpen));
  $('navigation-back').disabled = workspaceHistory.length === 0;
  if (portfolioPageOpen) renderPortfolioPage();
  if (settingsPageOpen) renderBrokerageAccounts();
  if (macroPageOpen) renderMacroPage();
  if (trendsPageOpen) renderTrendsPage();
  if (aiAgentPageOpen) renderAiAgentPage();
  if (brokerageDiagnosticsPageOpen) renderBrokerageDiagnosticsPage();
}
function showWorkspacePage(page) {
  portfolioPageOpen = page === 'portfolio';
  settingsPageOpen = page === 'settings';
  macroPageOpen = page === 'macro';
  trendsPageOpen = page === 'trends';
  aiAgentPageOpen = page === 'ai-agent';
  brokerageDiagnosticsPageOpen = page === 'diagnostics';
  updateWorkspaceView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function openDashboard() { showWorkspacePage('dashboard'); }
function navigateWorkspaceBack() {
  const previous = workspaceHistory.pop();
  if (!previous) return;
  navigatingBack = true;
  showWorkspacePage(previous);
}
function openPortfolioTicker(symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(normalized)) return;
  if (!holdings[normalized]) holdings[normalized] = newDossier(normalized);
  ticker = normalized;
  section = 'thesis';
  redditPostView = null;
  chartView = null;
  earningsVisible = 4;
  newsVisible = 5;
  portfolioPageOpen = false;
  settingsPageOpen = false;
  macroPageOpen = false;
  trendsPageOpen = false;
  aiAgentPageOpen = false;
  updateWorkspaceView();
  render();
  $('ticker-input').value = normalized;
  $('message').textContent = `Viewing ${normalized} from your portfolio.`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  void refreshMarketData();
}
const renderPortfolioPageWithDashboard = renderPortfolioPage;
renderPortfolioPage = () => {
  renderPortfolioPageWithDashboard();
  const portfolio = snapTradeState.portfolio || { accounts: [], holdings: [] };
  const headingCopy = document.querySelector('.portfolio-heading > div:first-child');
  const headingStatus = headingCopy?.querySelector('p');
  if (headingStatus) {
    const brokerStatus = portfolio.lastSyncedAt ? `Brokerage holdings synced ${new Date(portfolio.lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Brokerage holdings have not been synced';
    const quoteStatus = portfolioQuotesUpdatedAt ? `market prices updated ${portfolioQuotesUpdatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'market prices pending';
    headingStatus.textContent = snapTradeState.configured ? `${brokerStatus} · ${quoteStatus}.` : 'Connect a brokerage account in Settings to load holdings and balances.';
    const source = document.createElement('span');
    source.className = 'data-source';
    source.textContent = 'Source: SnapTrade for holdings · market-price provider for displayed equity prices';
    headingCopy.append(source);
  }
  if (portfolio.accounts?.length && !(portfolio.holdings || []).filter(isOpenPortfolioHolding).length) {
    const empty = document.createElement('section');
    empty.className = 'portfolio-empty-state';
    empty.innerHTML = '<h3>No open positions</h3><p>This connected account has no positions with a current quantity or market value. Use Refresh portfolio after a trade settles.</p>';
    document.querySelector('.portfolio-accounts')?.insertAdjacentElement('afterend', empty);
  }
  document.querySelectorAll('.portfolio-holdings tbody tr').forEach(row => {
    const cell = row.querySelector('td:first-child');
    const symbol = cell?.textContent?.trim().toUpperCase();
    if (!cell || !/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol || '')) return;
    const button = document.createElement('button');
    button.className = 'portfolio-ticker-link';
    button.type = 'button';
    button.textContent = symbol;
    button.title = `Open ${symbol} in Individual Stock Dashboard`;
    button.onclick = () => openPortfolioTicker(symbol);
    cell.textContent = '';
    cell.append(button);
  });
  // SnapTrade supplies average purchase price / book price for positions when
  // the connected brokerage exposes cost basis. Add it beside live price.
  document.querySelectorAll('.portfolio-holdings[data-holding-table]').forEach(table => {
    const accountId = String(table.dataset.holdingTable || '');
    const account = (portfolio.accounts || []).find(item => String(item.id) === accountId);
    const cash = Number(account?.balances?.cash);
    const cashPosition = table.querySelector('.holding-cash-position');
    if (cashPosition) cashPosition.textContent = `Cash position: ${Number.isFinite(cash) ? money(cash) : 'Unavailable'}`;
    const headerRow = table.querySelector('thead tr');
    const priceIndex = [...(headerRow?.children || [])].findIndex(cell => cell.textContent.trim().startsWith('Price'));
    if (priceIndex < 0) return;
    const averageHeader = document.createElement('th');
    const averageSort = holdingSortState[accountId] || { column: 'security', direction: 'asc' };
    const averageSortActive = averageSort.column === 'averagePrice' ? averageSort.direction : '';
    averageHeader.innerHTML = `Average cost<button type="button" class="holding-sort" data-holding-account="${escape(accountId)}" data-holding-column="averagePrice" aria-label="Sort Average cost ${averageSortActive || 'ascending or descending'}" title="Sort Average cost"><i class="${averageSortActive === 'asc' ? 'active' : ''}">&#9650;</i><i class="${averageSortActive === 'desc' ? 'active' : ''}">&#9660;</i></button>`;
    averageHeader.title = 'Brokerage-reported average purchase price. Options are reported per contract.';
    headerRow.children[priceIndex].insertAdjacentElement('afterend', averageHeader);
    const differenceHeader = document.createElement('th');
    const differenceSort = holdingSortState[accountId] || { column: 'security', direction: 'asc' };
    const differenceSortActive = differenceSort.column === 'priceDifference' ? differenceSort.direction : '';
    differenceHeader.innerHTML = `Price difference<button type="button" class="holding-sort" data-holding-account="${escape(accountId)}" data-holding-column="priceDifference" aria-label="Sort Price difference ${differenceSortActive || 'ascending or descending'}" title="Sort Price difference"><i class="${differenceSortActive === 'asc' ? 'active' : ''}">&#9650;</i><i class="${differenceSortActive === 'desc' ? 'active' : ''}">&#9660;</i></button>`;
    differenceHeader.title = 'Current price minus average cost for one share.';
    averageHeader.insertAdjacentElement('afterend', differenceHeader);
    const headerTitles = {
      'Average cost': 'Average Cost',
      'Price difference': 'Price Difference',
      'Market value': 'Market Value',
      'Gain / loss %': 'Gain / Loss %',
      'Gain / loss': 'Gain / Loss'
    };
    headerRow.querySelectorAll('th').forEach(header => {
      const titleNode = [...header.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      const title = titleNode?.textContent.trim();
      if (titleNode && headerTitles[title]) titleNode.textContent = `${headerTitles[title]}`;
    });
    table.querySelectorAll('tbody tr').forEach(row => {
      const security = row.children[0]?.textContent?.trim();
      const holding = (portfolio.holdings || []).find(item => String(item.accountId) === accountId && String(item.instrument?.symbol || item.instrument?.ticker || item.instrument?.description || item.instrument?.name || '').trim() === security);
      const cell = document.createElement('td');
      const average = Number(holding?.averagePrice);
      cell.textContent = Number.isFinite(average) ? money(average) : 'Unavailable';
      cell.title = holding?.instrument?.kind === 'option' ? 'Average cost per option contract, as reported by the brokerage.' : 'Average cost per share, as reported by the brokerage.';
      row.children[priceIndex]?.insertAdjacentElement('afterend', cell);
      const differenceCell = document.createElement('td');
      const currentPrice = Number(holding?.price);
      const difference = currentPrice - average;
      if (Number.isFinite(difference)) {
        differenceCell.textContent = `${difference >= 0 ? '+' : '-'}${money(Math.abs(difference))}`;
        differenceCell.className = difference > 0 ? 'holding-gain' : difference < 0 ? 'holding-loss' : 'holding-neutral';
      } else {
        differenceCell.textContent = 'Unavailable';
        differenceCell.className = 'holding-neutral';
      }
      differenceCell.title = 'Difference between the current price and average cost for one share.';
      cell.insertAdjacentElement('afterend', differenceCell);
    });
  });
};
function boundedAgentScore(value) { return Math.max(0, Math.min(100, Number(value) || 0)); }
function agentAutomationConfig() {
  const current = settings.agentAutomation && typeof settings.agentAutomation === 'object' ? settings.agentAutomation : {};
  return { enabled: current.enabled !== false, topScore: 75, lastDailyScanDate: current.lastDailyScanDate || '' };
}
function easternTimeParts() {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return values;
}
function shouldRunDailyAgentScan() {
  const values = easternTimeParts();
  if (values.weekday === 'Sat' || values.weekday === 'Sun') return false;
  const config = agentAutomationConfig();
  // Run as soon as the background dashboard starts for a new U.S. trading
  // day. A computer that was off at a particular hour should not miss a scan.
  return config.lastDailyScanDate !== `${values.year}-${values.month}-${values.day}`;
}
function updateAgentAutomationUi() {
  const control = $('agent-automation-enabled'), status = $('agent-automation-status');
  if (!control || !status) return;
  const config = agentAutomationConfig();
  control.checked = config.enabled;
  status.textContent = config.enabled
    ? `Automatic scans run once when the dashboard first runs on each U.S. trading day. Each pass evaluates the next 20 unscanned listed companies, saves local results, and maintains a rolling top 10. After the full universe is covered, the next pass starts a comparison cycle. Only new scores of ${config.topScore}+ notify you.`
    : 'Automatic scans are paused. You can still run an agent scan manually.';
}
function configureAgentAutomation({ runNow = false } = {}) {
  if (agentAutomationTimer) clearInterval(agentAutomationTimer);
  agentAutomationTimer = null;
  updateAgentAutomationUi();
  if (!agentAutomationConfig().enabled) return;
  const tick = () => {
    if (!shouldRunDailyAgentScan() || aiAgentLoading || Date.now() - agentAutomationLastStarted < 10 * 60 * 1000) return;
    void runAiAgentScan({ automated: true, daily: true });
  };
  agentAutomationTimer = setInterval(tick, 60 * 1000);
  if (runNow) tick();
}
function agentAssessment(score) {
  if (score >= 90) return { label: 'Layup', action: 'Extraordinary evidence required; independently verify every key fact before acting.' };
  if (score >= 85) return { label: 'Exceptional', action: 'Run a formal red-team review before considering the thesis.' };
  if (score >= 75) return { label: 'Strong social-arbitrage candidate', action: 'Verify primary evidence, financial exposure, and the catalyst now.' };
  if (score >= 65) return { label: 'Research', action: 'Investigate the exposure map, financial materiality, and disconfirmation conditions.' };
  if (score >= 50) return { label: 'Watchlist', action: 'Insufficient conviction. Wait for more independent behavioral evidence.' };
  return { label: 'Ignore', action: 'Do not act on this signal.' };
}
function agentPostText(post) { return `${post?.title || ''} ${post?.body || ''}`.replace(/\s+/g, ' ').trim(); }
function agentEvidenceFromPosts(posts) {
  const investorPattern = /\b(stock|ticker|shares|calls|puts|options|buy the stock|price target|analyst|earnings play|short squeeze|to the moon|market cap)\b/i;
  const groups = { purchaseIntent: [], confirmedPurchases: [], repeatPurchases: [], supplyConstraints: [], adoption: [], switching: [], negative: [], investor: [], consumer: [] };
  posts.forEach(post => {
    const text = agentPostText(post);
    if (investorPattern.test(text)) groups.investor.push(post); else groups.consumer.push(post);
    if (/\b(need (this|one)|where can i buy|where do i get|want to buy)\b/i.test(text)) groups.purchaseIntent.push(post);
    if (/\b(i bought|purchased|ordered|mine arrived|just got)\b/i.test(text)) groups.confirmedPurchases.push(post);
    if (/\b(second|third|fourth|again|repeat|another order|restock)\b/i.test(text)) groups.repeatPurchases.push(post);
    if (/\b(sold out|out of stock|can't keep.*stocked|no inventory|back.?order)\b/i.test(text)) groups.supplyConstraints.push(post);
    if (/\b(everyone (at|in)|all my|started using|new users|adoption)\b/i.test(text)) groups.adoption.push(post);
    if (/\b(switched from|stopped buying|instead of)\b/i.test(text)) groups.switching.push(post);
    if (/\b(hate|not worth|returned|broken|disappointed|avoid)\b/i.test(text)) groups.negative.push(post);
  });
  return groups;
}
function agentDataAvailability(value, fallback = 'DATA UNAVAILABLE.') { return value ? value : fallback; }
function agentUniverseState(universe) {
  const saved = settings.agentUniverseScan && typeof settings.agentUniverseScan === 'object' ? settings.agentUniverseScan : {};
  const signature = `${universe.length}:${universe[0]?.symbol || ''}:${universe.at(-1)?.symbol || ''}`;
  if (saved.universeSignature !== signature) return { universeSignature: signature, cursor: 0, cycle: 1, scanned: {}, leaders: [] };
  return { universeSignature: signature, cursor: Number(saved.cursor) || 0, cycle: Number(saved.cycle) || 1, scanned: saved.scanned && typeof saved.scanned === 'object' ? saved.scanned : {}, leaders: Array.isArray(saved.leaders) ? saved.leaders : [] };
}
function nextUniverseBatch(universe, state, size = 20) {
  const start = Math.max(0, Math.min(state.cursor, Math.max(0, universe.length - 1)));
  const rows = Array.from({ length: Math.min(size, universe.length) }, (_, offset) => universe[(start + offset) % universe.length]);
  return { rows, start, wraps: start + rows.length >= universe.length, nextCursor: (start + rows.length) % universe.length };
}
function currentEasternDateKey() {
  const east = easternTimeParts();
  return `${east.year}-${east.month}-${east.day}`;
}
function restoreAiAgentLeaderboard() {
  if (!aiAgentEvidenceOutput && settings.agentLastEvidenceOutput) aiAgentEvidenceOutput = settings.agentLastEvidenceOutput;
  // Keep candidates saved before the meaningful-evidence gate was introduced.
  // They remain visible as legacy leads until a current scan can validate or
  // replace them; otherwise an application update would make a user's saved
  // leaderboard appear to have been erased.
  const leaders = Array.isArray(settings.agentUniverseScan?.leaders)
    ? settings.agentUniverseScan.leaders.map(candidate => ({
      ...candidate,
      legacyUnverified: candidate?.meaningful !== true
    }))
    : [];
  // This is the permanent display policy: retain the stored leaderboard and
  // always render its current top ten. Scans may add, update, or reorder a
  // lead, but must never clear the saved leaderboard as a side effect.
  aiAgentCandidates = leaders.sort((a, b) => Number(b.score) - Number(a.score) || new Date(b.lastScanned || 0) - new Date(a.lastScanned || 0)).slice(0, 10);
  aiAgentTopScore = aiAgentCandidates[0]?.score ?? null;
  const dates = aiAgentCandidates.map(candidate => Date.parse(candidate.lastScanned || '')).filter(Number.isFinite);
  aiAgentScannedAt = dates.length ? new Date(Math.max(...dates)) : null;
}
function dailyAgentScanCompleted() { return agentAutomationConfig().lastDailyScanDate === currentEasternDateKey(); }
function inboxPreliminaryScore(categories, independentEvidence) {
  const values = new Set(categories || []);
  let behavioral = 0, commerce = 0, independent = independentEvidence ? 4 : 0, penalties = 0;
  if (values.has('adoption')) behavioral += 4;
  if (values.has('brand_switching')) behavioral += 4;
  if (values.has('supply_constraint')) { behavioral += 3; commerce += 3; }
  if (values.has('purchase_intent')) { behavioral += 2; commerce += 2; }
  if (values.has('confirmed_purchase')) { behavioral += 3; commerce += 5; }
  if (values.has('repeat_purchase')) { behavioral += 3; commerce += 5; }
  if (values.has('negative_experience')) penalties += 3;
  if (values.has('investor_chatter')) penalties += 15;
  const score = boundedAgentScore(Math.min(15, behavioral) + Math.min(10, commerce) + independent - penalties);
  return { score: Math.round(score), behavioral: Math.min(15, behavioral), commerce: Math.min(10, commerce), independent, penalties };
}
function meaningfulEvidenceCandidate(candidate) {
  const categories = new Set(candidate?.categories || []);
  const realWorldBehavior = ['purchase_intent', 'confirmed_purchase', 'repeat_purchase', 'supply_constraint', 'adoption', 'brand_switching'].some(category => categories.has(category));
  // Social-arbitrage discovery requires a named public-company connection and
  // an observable behavior/commerce signal. Vague sentiment and investor
  // chatter are explicitly not enough to affect a score.
  if (!candidate?.ticker || !realWorldBehavior || categories.has('investor_chatter')) return false;
  return inboxPreliminaryScore(candidate.categories, candidate.independentEvidence).score >= 8;
}
function evidenceInboxEntries() { return Array.isArray(settings.agentEvidenceInbox) ? settings.agentEvidenceInbox : []; }
async function analyzeEvidenceInboxText(text, image = null) {
  const analysis = await window.portfolioApp.analyzeEvidence({ text, imageData: image?.dataUrl || '' });
  const createdAt = new Date().toISOString();
  const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt, text: text.slice(0, 40000), image: image ? { name: image.name, type: image.type, size: image.size } : null, analysis };
  settings.agentEvidenceInbox = [entry, ...evidenceInboxEntries()].slice(0, 50);
  const state = settings.agentUniverseScan && typeof settings.agentUniverseScan === 'object' ? settings.agentUniverseScan : { leaders: [], scanned: {}, cycle: 1, cursor: 0 };
  const leaders = new Map((state.leaders || []).map(candidate => [candidate.symbol, candidate]));
  const linked = analysis.candidates.filter(meaningfulEvidenceCandidate);
  const disregarded = analysis.candidates.filter(candidate => !meaningfulEvidenceCandidate(candidate));
  entry.status = linked.length ? 'accepted' : 'disregarded';
  entry.disregardedReason = linked.length ? '' : (disregarded.length ? 'No candidate met the minimum requirement for a named ticker plus observable real-world behavior or commerce evidence.' : 'No public company or ticker could be identified from the pasted material.');
  linked.forEach(candidate => {
    const preliminary = inboxPreliminaryScore(candidate.categories, candidate.independentEvidence);
    const existing = leaders.get(candidate.ticker);
    const score = Math.max(Number(existing?.score) || 0, preliminary.score);
    const record = existing || { symbol: candidate.ticker, name: candidate.company || candidate.ticker, posts: [], videos: [], filings: [], articles: [], dataQuality: 'LOW', awareness: 'DATA UNAVAILABLE.', catalyst: 'DATA UNAVAILABLE.', thesis: 'Manual Evidence Inbox entry. Automated validation, financial materiality, market-awareness, and catalyst evidence remain DATA UNAVAILABLE.', disconfirmation: 'The pasted evidence may be anecdotal, unverified, unrelated to company economics, or contradicted by broader evidence.', breakdown: { behavioral: 0, acceleration: 0, commerce: 0, independent: 0, materiality: 0, awareness: 0 } };
    record.name = candidate.company || record.name;
    record.score = score;
    record.meaningful = true;
    record.assessment = agentAssessment(score);
    record.observedChange = candidate.observedChange || record.observedChange || 'DATA UNAVAILABLE.';
    record.consumerEvidence = `Manual Evidence Inbox: ${(candidate.categories || []).join(', ') || 'other'}. ${candidate.financialLink}`;
    record.breakdown = { behavioral: Math.max(Number(record.breakdown?.behavioral) || 0, preliminary.behavioral), acceleration: Number(record.breakdown?.acceleration) || 0, commerce: Math.max(Number(record.breakdown?.commerce) || 0, preliminary.commerce), independent: Math.max(Number(record.breakdown?.independent) || 0, preliminary.independent), materiality: Number(record.breakdown?.materiality) || 0, awareness: Number(record.breakdown?.awareness) || 0 };
    record.penalties = Math.max(Number(record.penalties) || 0, preliminary.penalties);
    record.lastScanned = createdAt;
    record.cycle = state.cycle || 1;
    record.manualEvidence = { entryId: entry.id, confidence: candidate.confidence, categories: candidate.categories, limitations: candidate.limitations };
    leaders.set(record.symbol, record);
  });
  state.leaders = [...leaders.values()].sort((a, b) => b.score - a.score || new Date(b.lastScanned || 0) - new Date(a.lastScanned || 0)).slice(0, 100);
  settings.agentUniverseScan = state;
  aiAgentEvidenceOutput = {
    createdAt,
    usedImage: Boolean(image),
    summary: analysis.summary,
    candidates: analysis.candidates,
    linked: linked.length,
    disregarded: disregarded.length,
    rejectionReason: entry.disregardedReason
  };
  settings.agentLastEvidenceOutput = aiAgentEvidenceOutput;
  restoreAiAgentLeaderboard();
  await window.portfolioApp.saveSettings(settings);
  return { analysis, linked: linked.length, disregarded: disregarded.length, rejectionReason: entry.disregardedReason };
}
function renderAiAgentPage() {
  const page = $('ai-agent-page');
  const scanned = aiAgentScannedAt ? `Last scanned ${aiAgentScannedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'No automated scan has been run yet';
  const cards = aiAgentCandidates.map((candidate, index) => {
    const evidence = candidate.posts?.length
      ? candidate.posts.slice(0, 3).map(post => `<li><a href="${escape(post.url)}" target="_blank" rel="noreferrer">${escape(post.title)}</a><span>${escape(post.subreddit)} · ${new Date(post.created * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></li>`).join('')
      : '<li><span>No underlying Reddit posts were retrievable. Treat the mention count as unverified.</span></li>';
    const videos = candidate.videos?.length
      ? `<p><b>Public YouTube discovery results:</b></p><ul>${candidate.videos.slice(0, 3).map(video => `<li><a href="${escape(video.url)}" target="_blank" rel="noreferrer">${escape(video.title)}</a><span>${escape(video.channel)} Â· ${video.publishedAt ? new Date(video.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'date unavailable'}</span></li>`).join('')}</ul>`
      : '';
    const filings = candidate.filings?.length ? `<p><b>Recent SEC filings:</b> ${candidate.filings.map(item => `${escape(item.form)} (${escape(item.date)})`).join(', ')}</p>` : `<p><b>SEC filings:</b> ${escape(candidate.secNotice || 'DATA UNAVAILABLE.')}</p>`;
    const media = candidate.articles?.length ? `<p><b>Recent public media:</b></p><ul>${candidate.articles.slice(0, 3).map(article => `<li><a href="${escape(article.url)}" target="_blank" rel="noreferrer">${escape(article.title)}</a><span>${escape(article.domain)}</span></li>`).join('')}</ul>` : `<p><b>Public media:</b> ${escape(candidate.mediaNotice || 'DATA UNAVAILABLE.')}</p>`;
    return `<article class="agent-candidate-card">
      <div class="agent-candidate-heading"><div><button type="button" class="agent-ticker" data-agent-ticker="${escape(candidate.symbol)}">${escape(candidate.symbol)}</button><h3>${escape(candidate.name)}</h3></div><strong>${candidate.score}<span>/100</span></strong></div>
      <p class="agent-assessment">${escape(candidate.legacyUnverified ? 'Previously saved — needs current evidence validation' : (candidate.assessment?.label || 'Unverified'))}</p>
      <p><b>Last evaluated:</b> ${escape(candidate.lastScanned ? new Date(candidate.lastScanned).toLocaleString() : 'DATA UNAVAILABLE.')} · Cycle ${escape(String(candidate.cycle || 1))}</p>
      <p><b>Observed change:</b> ${escape(candidate.observedChange)}</p>
      <p><b>Consumer / industry evidence:</b> ${escape(candidate.consumerEvidence)}</p>
      <p><b>Wall Street awareness:</b> ${escape(candidate.awareness)}</p>
      <p><b>Catalyst:</b> ${escape(candidate.catalyst)}</p>
      <p><b>Core thesis:</b> ${escape(candidate.thesis)}</p>
      <p><b>Disconfirmation:</b> ${escape(candidate.disconfirmation)}</p>
      <div class="agent-score-grid"><span>Behavioral change <b>${candidate.breakdown.behavioral}/15</b></span><span>Acceleration <b>${candidate.breakdown.acceleration}/10</b></span><span>Commerce <b>${candidate.breakdown.commerce}/10</b></span><span>Independent confirmation <b>${candidate.breakdown.independent}/10</b></span><span>Financial materiality <b>${candidate.breakdown.materiality}/15</b></span><span>Wall Street ignorance <b>${candidate.breakdown.awareness}/15</b></span><span>Penalties <b>-${candidate.penalties}</b></span><span>Data quality <b>${candidate.dataQuality}</b></span></div>
      <p class="agent-action"><b>Research posture:</b> ${escape(candidate.legacyUnverified ? 'This lead was saved before the current evidence rules. Treat it as a historical reference until the agent has reevaluated it.' : (candidate.assessment?.action || 'DATA UNAVAILABLE.'))}</p>
      <details><summary>Sources and recent evidence</summary><ul>${evidence}</ul>${videos}${filings}${media}<p><a href="https://www.reddit.com/search/?q=${encodeURIComponent(candidate.symbol)}" target="_blank" rel="noreferrer">Search Reddit for ${escape(candidate.symbol)}</a></p></details>
    </article>`;
  }).join('');
  const scanDone = dailyAgentScanCompleted();
  const output = aiAgentEvidenceOutput;
  const outputCandidates = output?.candidates?.length
    ? `<div class="agent-output-candidates">${output.candidates.map(candidate => `<section><b>${escape(candidate.ticker || candidate.company || 'No company identified')}</b><span>${escape(candidate.confidence || 'low')} confidence</span><p>${escape(candidate.observedChange || 'No usable observed change extracted.')}</p><small>${escape((candidate.categories || []).join(', ') || 'No behavioral category identified.')}</small><p class="agent-output-limits">${escape(candidate.limitations || 'DATA UNAVAILABLE.')}</p></section>`).join('')}</div>`
    : '<p class="agent-output-empty">No public company or usable behavioral evidence was identified from the submitted material.</p>';
  const outputPanel = `<aside class="agent-output-panel" aria-live="polite"><div><span class="agent-eyebrow">EVIDENCE INBOX</span><h3>Agent Output</h3><p class="agent-output-subtitle">What the agent extracted from your latest submitted evidence.</p></div>${output ? `<p class="agent-output-time">${escape(output.createdAt ? new Date(output.createdAt).toLocaleString() : 'Just now')}${output.usedImage ? ' · screenshot analyzed' : ''}</p><p class="agent-output-summary"><b>Assessment:</b> ${escape(output.summary || 'DATA UNAVAILABLE.')}</p><div class="agent-output-status ${output.linked ? 'accepted' : 'disregarded'}">${output.linked ? `${output.linked} meaningful candidate${output.linked === 1 ? '' : 's'} added or updated.` : `Disregarded: ${escape(output.rejectionReason || 'The evidence did not meet the social-arbitrage requirements.')}`}</div>${outputCandidates}` : '<p class="agent-output-empty">Submit text or a screenshot through Evidence Inbox to see the extracted company, behavior signals, limitations, and whether the evidence affected the leaderboard.</p>'}</aside>`;
  page.innerHTML = `<div class="agent-page-heading"><div><span class="agent-eyebrow">SOCIAL ARBITRAGE</span><h2>AI Agent</h2><p>Surfaces research leads from unusual community attention and checks the signal against recent discussion and market movement.</p></div><button id="agent-run-scan" type="button" ${aiAgentLoading ? 'disabled' : ''}>${aiAgentLoading ? 'Scanning…' : scanDone ? 'Today’s scan complete' : 'Run today’s scan'}</button></div>
    <section class="agent-disclosure"><b>Research assistance only.</b> Each daily pass saves a local score for the next 20 listed common stocks and keeps a combined top-10 leaderboard. Saved candidates stay visible through scans and agent updates; new evidence updates or reorders the list instead of clearing it. Once the entire universe is covered, the next cycle rescans and compares new evidence with the prior score. Scores above 75 require a separate red-team review before any consideration. Missing evidence is shown as DATA UNAVAILABLE; no facts are inferred from silence.</section>
    <section class="agent-evidence-inbox"><div><h3>Evidence Inbox</h3><p>Paste observations, article excerpts, public posts, or notes. The local AI identifies explicitly named public companies, classifies behavior evidence, and saves the original text locally.</p><p><b>Important:</b> A URL by itself cannot be read. Paste the relevant post text, video transcript, caption, article excerpt, and useful comments; include the source URL and date for reference. TikTok, Instagram, X, Reddit, and YouTube material works when its relevant text is included here. You can also paste a screenshot directly into this box or drag a PNG, JPG, or WebP screenshot onto it; visible text is analyzed locally, but the image itself is not saved.</p></div><textarea id="agent-evidence-text" maxlength="40000" placeholder="Paste text, paste a screenshot, or drag a screenshot into this box. Include the company or ticker, source URL, date, and observed behavior when available."></textarea><div class="agent-image-attachment"><input id="agent-evidence-image" type="file" accept="image/png,image/jpeg,image/webp" /><span id="agent-evidence-image-status">${aiAgentEvidenceImage ? `Screenshot attached: ${escape(aiAgentEvidenceImage.name)}` : 'Paste or drag a screenshot into the box above (PNG, JPG, or WebP; up to about 6 MB). The file picker is optional.'}</span><button id="agent-clear-evidence-image" type="button" ${aiAgentEvidenceImage ? '' : 'disabled'}>Remove screenshot</button></div><div id="agent-evidence-image-preview" class="agent-evidence-image-preview" ${aiAgentEvidenceImage ? '' : 'hidden'}></div><div class="agent-inbox-actions"><button id="agent-analyze-evidence" type="button" ${aiAgentLoading ? 'disabled' : ''}>Analyze And Save Evidence</button><span id="agent-evidence-status">${evidenceInboxEntries().length ? `${evidenceInboxEntries().length} saved evidence entries.` : 'No saved Evidence Inbox entries yet.'}</span></div></section>
    <div class="agent-scan-status"><span>${escape(aiAgentStatus || scanned)}</span><span>Sources: official U.S. listing directories, Nasdaq market screen, SEC EDGAR, GDELT, Reddit, and public YouTube data</span></div>
    <div class="agent-results">${cards || `<section class="agent-empty">${aiAgentScannedAt ? `<h3>NO QUALIFYING SOCIAL-ARBITRAGE OPPORTUNITY FOUND</h3><p>The highest preliminary score was ${Number.isFinite(aiAgentTopScore) ? `${aiAgentTopScore}/100` : 'unavailable'}. The available evidence did not establish a verified behavioral change, material company exposure, market-awareness gap, and catalyst together.</p>` : '<h3>Ready to scan</h3><p>Run a scan to test currently available public evidence. No trades or external actions will be taken.</p>'}</section>`}</div>${outputPanel}`;
  const outputNode = page.querySelector('.agent-output-panel');
  const agentLayout = document.createElement('div');
  agentLayout.className = 'agent-page-layout';
  const agentMain = document.createElement('div');
  agentMain.className = 'agent-page-main';
  [...page.children].forEach(child => { if (child !== outputNode) agentMain.append(child); });
  agentLayout.append(agentMain, outputNode);
  page.replaceChildren(agentLayout);
  $('agent-run-scan').onclick = () => {
    if (dailyAgentScanCompleted()) {
      aiAgentStatus = 'Today’s daily scan has already completed. The saved rolling top 10 is shown above; the next automatic scan will run the first time the dashboard starts on the next U.S. trading day.';
      renderAiAgentPage();
      return;
    }
    void runAiAgentScan({ daily: true });
  };
  const attachmentStatus = $('agent-evidence-image-status');
  const imagePreview = $('agent-evidence-image-preview');
  const renderImagePreview = () => {
    imagePreview.replaceChildren();
    if (!aiAgentEvidenceImage?.dataUrl) { imagePreview.hidden = true; return; }
    const image = document.createElement('img');
    image.src = aiAgentEvidenceImage.dataUrl;
    image.alt = 'Evidence screenshot preview';
    imagePreview.append(image);
    imagePreview.hidden = false;
  };
  const setEvidenceImage = file => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { attachmentStatus.textContent = 'Use a PNG, JPG, or WebP screenshot.'; return; }
    if (file.size > 6 * 1024 * 1024) { attachmentStatus.textContent = 'Use a screenshot smaller than about 6 MB.'; return; }
    const reader = new FileReader();
    reader.onload = () => { aiAgentEvidenceImage = { dataUrl: String(reader.result || ''), name: file.name || 'pasted-screenshot', type: file.type, size: file.size }; attachmentStatus.textContent = `Screenshot attached: ${aiAgentEvidenceImage.name}. It will be analyzed locally and not saved.`; $('agent-clear-evidence-image').disabled = false; renderImagePreview(); };
    reader.readAsDataURL(file);
  };
  $('agent-evidence-image').onchange = event => setEvidenceImage(event.target.files?.[0]);
  $('agent-clear-evidence-image').onclick = () => { aiAgentEvidenceImage = null; $('agent-evidence-image').value = ''; attachmentStatus.textContent = 'Paste or drag a screenshot into the box above (PNG, JPG, or WebP; up to about 6 MB). The file picker is optional.'; $('agent-clear-evidence-image').disabled = true; renderImagePreview(); };
  const evidenceTextBox = $('agent-evidence-text');
  const imageFromItems = items => [...(items || [])].map(item => item.kind === 'file' ? item.getAsFile?.() : item).find(item => item?.type?.startsWith('image/'));
  evidenceTextBox.addEventListener('paste', event => {
    const file = imageFromItems(event.clipboardData?.items) || [...(event.clipboardData?.files || [])].find(item => item.type?.startsWith('image/'));
    if (file) { event.preventDefault(); setEvidenceImage(file); }
  });
  evidenceTextBox.addEventListener('dragover', event => { if (imageFromItems(event.dataTransfer?.items) || event.dataTransfer?.files?.length) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } });
  evidenceTextBox.addEventListener('drop', event => {
    const file = imageFromItems(event.dataTransfer?.items) || [...(event.dataTransfer?.files || [])].find(item => item.type?.startsWith('image/'));
    if (file) { event.preventDefault(); setEvidenceImage(file); }
  });
  renderImagePreview();
  $('agent-analyze-evidence').onclick = async () => {
    const input = $('agent-evidence-text');
    const status = $('agent-evidence-status');
    const text = input.value.trim();
    if (text.length < 25 && !aiAgentEvidenceImage) { status.textContent = 'Paste evidence or attach a screenshot before analyzing it.'; return; }
    $('agent-analyze-evidence').disabled = true;
    status.textContent = 'Analyzing the pasted evidence locally…';
    try {
      const result = await analyzeEvidenceInboxText(text, aiAgentEvidenceImage);
      aiAgentEvidenceImage = null;
      aiAgentStatus = result.linked ? `Evidence Inbox saved. ${result.linked} meaningful, explicitly identified ticker${result.linked === 1 ? '' : 's'} was added or updated in the rolling leaderboard. ${result.disregarded ? `${result.disregarded} weak or unsupported candidate${result.disregarded === 1 ? ' was' : 's were'} disregarded.` : ''}` : `Evidence Inbox saved as disregarded. ${result.rejectionReason}`;
      renderAiAgentPage();
    } catch (error) {
      status.textContent = error.message || 'Could not analyze this Evidence Inbox entry.';
      $('agent-analyze-evidence').disabled = false;
    }
  };
  page.querySelectorAll('[data-agent-ticker]').forEach(button => button.onclick = () => openPortfolioTicker(button.dataset.agentTicker));
}
async function runAiAgentScan({ automated = false, daily = false } = {}) {
  if (aiAgentLoading) return;
  aiAgentLoading = true;
  agentAutomationLastStarted = Date.now();
  aiAgentStatus = 'Screening the U.S. listed-stock universe, then collecting evidence for the leading discovery shortlist…';
  renderAiAgentPage();
  try {
    const universe = await window.portfolioApp.usCommonStockUniverse();
    const universeCount = universe.length;
    if (!universeCount) throw new Error('The official U.S. listing directories returned no common-stock candidates.');
    const cycleState = agentUniverseState(universe);
    const batch = nextUniverseBatch(universe, cycleState, 20);
    const leads = batch.rows;
    const symbols = leads.map(item => item.symbol);
    const [marketRows, postAttempts, youtubeAttempts, secAttempts, mediaAttempts] = await Promise.all([
      window.portfolioApp.refreshAllMarketData(symbols).catch(() => []),
      Promise.allSettled(symbols.map(symbol => window.portfolioApp.redditPosts(symbol))),
      settings.youtubeApiKey
        ? Promise.allSettled(leads.map(item => window.portfolioApp.youtubeEvidence({ symbol: item.symbol, name: item.name })))
        : Promise.resolve([]),
      Promise.allSettled(symbols.map(symbol => window.portfolioApp.secAgentEvidence(symbol))),
      Promise.allSettled(leads.map(item => window.portfolioApp.gdeltAgentEvidence({ symbol: item.symbol, name: item.name })))
    ]);
    const marketBySymbol = Object.fromEntries([
      ...leads.map(item => [item.symbol, item]),
      ...(marketRows || []).map(item => [item.symbol, item])
    ]);
    const previous = cycleState.scanned || {};
    const allCandidates = leads.map((lead, index) => {
      const posts = postAttempts[index]?.status === 'fulfilled' ? (postAttempts[index].value.posts || []) : [];
      const videos = youtubeAttempts[index]?.status === 'fulfilled' ? (youtubeAttempts[index].value.videos || []) : [];
      const sec = secAttempts[index]?.status === 'fulfilled' ? secAttempts[index].value : { filings: [], notice: 'DATA UNAVAILABLE.' };
      const media = mediaAttempts[index]?.status === 'fulfilled' ? mediaAttempts[index].value : { articles: [], notice: 'DATA UNAVAILABLE.' };
      const evidence = agentEvidenceFromPosts(posts);
      const youtubeEvidence = agentEvidenceFromPosts(videos.map(video => ({ title: video.title, body: video.description, subreddit: 'YouTube' })));
      const consumerCommunities = new Set([...evidence.consumer.map(post => post.subreddit), ...youtubeEvidence.consumer.map(() => 'YouTube')].filter(Boolean));
      const priorMentions = Number(previous?.[lead.symbol]?.mentions);
      const observedSignals = evidence.purchaseIntent.length + evidence.confirmedPurchases.length + evidence.repeatPurchases.length + evidence.supplyConstraints.length + evidence.adoption.length + evidence.switching.length + youtubeEvidence.purchaseIntent.length + youtubeEvidence.confirmedPurchases.length + youtubeEvidence.repeatPurchases.length + youtubeEvidence.supplyConstraints.length + youtubeEvidence.adoption.length + youtubeEvidence.switching.length;
      const consumerEvidenceCount = evidence.consumer.length + youtubeEvidence.consumer.length;
      const behavioral = Math.min(15, evidence.consumer.length * 2 + youtubeEvidence.consumer.length + Math.min(5, observedSignals));
      const acceleration = Number.isFinite(priorMentions) && priorMentions > 0
        ? Math.round(Math.min(10, Math.max(0, ((posts.length - priorMentions) / priorMentions) * 10))) : 0;
      const commerce = Math.min(10, evidence.purchaseIntent.length * 2 + evidence.confirmedPurchases.length * 3 + evidence.repeatPurchases.length * 3 + evidence.supplyConstraints.length * 2 + youtubeEvidence.purchaseIntent.length + youtubeEvidence.confirmedPurchases.length * 2 + youtubeEvidence.repeatPurchases.length * 2 + youtubeEvidence.supplyConstraints.length);
      // Results from an independent platform count only as discovery evidence.
      // They do not by themselves establish purchases, revenue, or a trade thesis.
      const independent = Math.min(10, consumerCommunities.size * 3 + (consumerCommunities.size >= 3 ? 1 : 0) + (videos.length >= 3 ? 2 : videos.length ? 1 : 0) + (media.articles.length >= 3 ? 1 : 0));
      const spread = 0; // Public post data does not reliably identify geography or demographics.
      const materiality = 0; // No reliable incremental-revenue or consensus data is available in this scan.
      const unexpectedness = 0; // Requires management, analyst, or consensus comparison data.
      const awareness = evidence.investor.length === 0 && evidence.consumer.length >= 3 ? 6 : 0;
      const catalyst = 0; // A dated information-parity event was not independently verified.
      const riskReward = 0; // Valuation and downside cannot be supported from this evidence alone.
      const baseScore = behavioral + acceleration + commerce + independent + spread + materiality + unexpectedness + awareness + catalyst + riskReward;
      const dailyMove = Math.abs(Number(marketBySymbol[lead.symbol]?.quote?.dp) || 0);
      let penalties = 0;
      // Unknown is not negative evidence. Penalties apply only to concrete issues
      // observed in the evidence, rather than to missing data by default.
      if (!consumerEvidenceCount || evidence.investor.length > consumerEvidenceCount) penalties += 20;
      if (consumerEvidenceCount && consumerCommunities.size <= 1) penalties += 15;
      if (dailyMove >= 50) penalties += 10;
      const score = Math.round(boundedAgentScore(baseScore - penalties));
      const meaningful = consumerEvidenceCount > 0 && observedSignals > 0 && evidence.investor.length <= consumerEvidenceCount && score >= 8;
      const assessment = agentAssessment(score);
      const observedChange = (posts.length || videos.length) ? `${evidence.consumer.length} consumer/industry-style and ${evidence.investor.length} investor-style Reddit posts plus ${youtubeEvidence.consumer.length} consumer/industry-style public YouTube results were retrieved. This is discovery evidence, not verified demand data.` : 'DATA UNAVAILABLE.';
      const consumerEvidence = consumerEvidenceCount ? `${evidence.confirmedPurchases.length + youtubeEvidence.confirmedPurchases.length} confirmed-purchase, ${evidence.repeatPurchases.length + youtubeEvidence.repeatPurchases.length} repeat-purchase, ${evidence.supplyConstraints.length + youtubeEvidence.supplyConstraints.length} supply-constraint, and ${evidence.switching.length + youtubeEvidence.switching.length} brand-switching statements were detected. These are keyword classifications, not independently verified sales data.` : 'DATA UNAVAILABLE.';
      const awarenessLabel = evidence.investor.length ? 'MEDIUM — investor-style discussion appears in the retrieved public posts; broader Wall Street awareness is DATA UNAVAILABLE.' : 'LOW (preliminary) — no investor-style discussion appeared in the retrieved posts; broader Wall Street awareness is DATA UNAVAILABLE.';
      const thesis = `The market expectation is DATA UNAVAILABLE. Public posts provide a preliminary behavior hypothesis only; no verified economic exposure map, financial materiality estimate, or information-parity catalyst has been established.`;
      return { symbol: lead.symbol, name: lead.name || lead.symbol, mentions: posts.length, posts, videos, filings: sec.filings || [], secNotice: sec.notice, articles: media.articles || [], mediaNotice: media.notice, score, meaningful, assessment, observedChange, consumerEvidence, awareness: awarenessLabel, catalyst: 'DATA UNAVAILABLE.', thesis, disconfirmation: 'Any verified evidence that demand is not recurring, is not commercial, lacks company exposure, or is already reflected in estimates invalidates this hypothesis.', penalties, dataQuality: (posts.length || videos.length || media.articles?.length || sec.filings?.length) ? 'LOW' : 'LOW', breakdown: { behavioral, acceleration, commerce, independent, materiality, awareness } };
    }).sort((a, b) => b.score - a.score);
    const completedAt = new Date().toISOString();
    const priorScores = Object.fromEntries(allCandidates.map(candidate => [candidate.symbol, Number(previous?.[candidate.symbol]?.score) || 0]));
    allCandidates.forEach(candidate => { candidate.lastScanned = completedAt; candidate.cycle = cycleState.cycle; });
    const qualifyingCandidates = allCandidates.filter(candidate => candidate.meaningful);
    // Preserve legacy saved leads while new scans only add candidates that pass
    // the current gate. A later validated result for the same symbol replaces
    // the legacy record.
    const leaders = new Map((cycleState.leaders || []).map(candidate => [candidate.symbol, candidate]));
    qualifyingCandidates.forEach(candidate => leaders.set(candidate.symbol, candidate));
    const retainedLeaders = [...leaders.values()].sort((a, b) => b.score - a.score || new Date(b.lastScanned || 0) - new Date(a.lastScanned || 0)).slice(0, 100);
    const highPriorityCandidates = qualifyingCandidates.filter(candidate => candidate.score >= 75);
    const newTopLeads = highPriorityCandidates.filter(candidate => priorScores[candidate.symbol] < 75);
    allCandidates.forEach(candidate => { cycleState.scanned[candidate.symbol] = { score: candidate.score, mentions: Number(candidate.mentions) || 0, lastScanned: completedAt, cycle: cycleState.cycle }; });
    cycleState.cursor = batch.nextCursor;
    if (batch.wraps) cycleState.cycle += 1;
    cycleState.leaders = retainedLeaders;
    settings.agentUniverseScan = cycleState;
    // Preserve the combined rolling leaderboard, not just today's twenty stocks.
    aiAgentCandidates = retainedLeaders.slice(0, 10);
    aiAgentTopScore = aiAgentCandidates[0]?.score ?? null;
    aiAgentScannedAt = new Date();
    if (daily) {
      const east = easternTimeParts();
      settings.agentAutomation = { ...settings.agentAutomation, lastDailyScanDate: `${east.year}-${east.month}-${east.day}` };
    }
    await window.portfolioApp.saveSettings(settings);
    updateAgentAutomationUi();
    if (automated && newTopLeads.length) {
      const symbols = newTopLeads.slice(0, 3).map(candidate => `${candidate.symbol} (${candidate.score})`).join(', ');
      await window.portfolioApp.notifyAgent({ title: 'New high-priority research lead', body: `${symbols}${newTopLeads.length > 3 ? ` and ${newTopLeads.length - 3} more` : ''}. Open Individual Stock Dashboard to review evidence.` });
    }
    aiAgentStatus = aiAgentCandidates.length
      ? `Rolling universe scan complete: ${batch.start + 1}-${Math.min(batch.start + leads.length, universeCount)} of ${universeCount.toLocaleString()} stocks in cycle ${cycleState.cycle - (batch.wraps ? 1 : 0)}. ${qualifyingCandidates.length} of ${leads.length} met the meaningful-evidence gate. Top 10 combines all completed qualifying scans (highest: ${aiAgentTopScore ?? 'unavailable'}).${batch.wraps ? ' The next scan begins a fresh comparison cycle.' : ''}`
      : `NO QUALIFYING SOCIAL-ARBITRAGE OPPORTUNITY FOUND · highest preliminary score: ${aiAgentTopScore ?? 'unavailable'}`;
  } catch (error) {
    aiAgentStatus = `${error.message || 'The agent scan could not be completed.'} Previously saved top-10 results remain available.`;
  } finally {
    aiAgentLoading = false;
    renderAiAgentPage();
  }
}
$('navigation-back').onclick = navigateWorkspaceBack;
$('dashboard-view-toggle').onclick = openDashboard;
$('portfolio-view-toggle').onclick = () => {
  showWorkspacePage('portfolio');
  if (portfolioPageOpen) {
    // Render the saved snapshot first, then retrieve the latest broker state in the
    // background so the holdings tables are populated on the first open.
    void refreshPortfolioQuotes();
    void refreshSnapTradePortfolio();
  }
};
$('macro-view-toggle').onclick = () => {
  showWorkspacePage('macro');
  if (macroPageOpen && !macroData) void refreshMacroData();
};
$('trends-view-toggle').onclick = () => {
  showWorkspacePage('trends');
  if (trendsPageOpen && !trendsData && (settings.trendsTerms || []).length) void refreshTrendsData();
  if (trendsPageOpen && trackedTrendIndexes().length) void refreshTrackedTrendIndexes();
};
$('ai-agent-view-toggle').onclick = () => { showWorkspacePage('ai-agent'); };
$('settings-view-toggle').onclick = () => { showWorkspacePage('settings'); };
$('brokerage-diagnostics-open').onclick = () => { showWorkspacePage('diagnostics'); };
$('save-snaptrade-config').onclick = async () => {
  const clientId = $('snaptrade-client-id').value.trim(), consumerKey = $('snaptrade-consumer-key').value.trim();
  if (!clientId || !consumerKey) { $('snaptrade-config-status').textContent = 'Enter both a Client ID and Consumer Key.'; return; }
  try { snapTradeState = await window.portfolioApp.saveSnapTradeConfig({ clientId, consumerKey }); $('snaptrade-client-id').value = ''; $('snaptrade-consumer-key').value = ''; updateSnapTradeFields(); renderBrokerageAccounts(); }
  catch (error) { $('snaptrade-config-status').textContent = error.message || 'Could not save SnapTrade configuration.'; }
};
async function refreshSnapTradePortfolio(userInitiated = false) {
  if (portfolioRefreshInProgress || !snapTradeState.configured) return;
  portfolioRefreshInProgress = true;
  if (portfolioPageOpen) {
    const button = $('portfolio-refresh');
    if (button) { button.disabled = true; button.classList.add('is-loading'); button.innerHTML = '<i aria-hidden="true"></i> Refreshing…'; }
  }
  try {
    $('snaptrade-config-status').textContent = 'Refreshing portfolio from SnapTrade...';
    snapTradeState.portfolio = await window.portfolioApp.syncSnapTrade();
    await loadSnapTradeState();
    renderBrokerageAccounts();
    void refreshPortfolioQuotes();
    $('snaptrade-config-status').textContent = `Portfolio updated ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
  } catch (error) {
    $('snaptrade-config-status').textContent = error.message || 'Portfolio refresh failed.';
  } finally {
    portfolioRefreshInProgress = false;
    if (portfolioPageOpen) renderPortfolioPage();
    if (brokerageDiagnosticsPageOpen) renderBrokerageDiagnosticsPage();
    if (userInitiated && requiresSnapTradeReconnect()) {
      snapTradeReconnectDismissed = false;
      requestAnimationFrame(maybeShowSnapTradeReconnectModal);
    }
  }
}
async function requestSnapTradeManualRefresh() {
  const modal = $('snaptrade-manual-refresh-modal');
  const confirm = $('snaptrade-manual-refresh-confirm');
  const cancel = $('snaptrade-manual-refresh-cancel');
  const copy = $('snaptrade-manual-refresh-copy');
  const status = $('snaptrade-manual-refresh-status');
  confirm.disabled = true;
  cancel.disabled = true;
  status.hidden = false;
  status.className = 'manual-refresh-status is-loading';
  status.textContent = 'Requesting a manual holdings sync from SnapTrade…';
  try {
    const result = await window.portfolioApp.manualRefreshSnapTrade();
    const names = result.scheduled.map(item => item.institution).join(', ');
    const message = `Manual sync queued for ${names}. SnapTrade processes this asynchronously; the portfolio will check again shortly.`;
    copy.textContent = 'SnapTrade accepted the manual sync request.';
    status.className = 'manual-refresh-status is-success';
    status.textContent = message;
    if ($('snaptrade-config-status')) $('snaptrade-config-status').textContent = message;
    if ($('diagnostics-status')) $('diagnostics-status').textContent = message;
    setTimeout(() => { void refreshSnapTradePortfolio(); }, 15000);
    setTimeout(() => { void refreshSnapTradePortfolio(); }, 60000);
    setTimeout(() => {
      modal.hidden = true;
      confirm.disabled = false;
      cancel.disabled = false;
      cancel.textContent = 'Cancel';
      copy.textContent = 'This asks SnapTrade to queue a fresh holdings sync for every active brokerage connection. It can take several minutes. SnapTrade may charge for this request or reject it if your plan does not include manual refresh.';
      status.hidden = true;
      status.className = 'manual-refresh-status';
    }, 1400);
  } catch (error) {
    const message = error.message || 'SnapTrade could not schedule a manual sync.';
    copy.textContent = 'SnapTrade did not accept the manual sync request.';
    status.className = 'manual-refresh-status is-error';
    status.textContent = message;
    cancel.disabled = false;
    cancel.textContent = 'Close';
    if ($('snaptrade-config-status')) $('snaptrade-config-status').textContent = message;
    if ($('diagnostics-status')) $('diagnostics-status').textContent = message;
  } finally {
    if (!status.classList.contains('is-success')) confirm.disabled = false;
  }
}
async function refreshPortfolioQuotes() {
  const portfolio = snapTradeState.portfolio;
  if (portfolioQuoteRefreshInProgress || !portfolio?.holdings?.length) return;
  portfolio.holdings = portfolio.holdings.filter(isOpenPortfolioHolding);
  const symbols = [...new Set(portfolio.holdings.map(holding => String(holding.instrument?.symbol || holding.instrument?.ticker || '').toUpperCase()).filter(symbol => /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)))];
  if (!symbols.length) return;
  portfolioQuoteRefreshInProgress = true;
  try {
    const updates = await window.portfolioApp.refreshAllMarketData(symbols);
    const quotes = new Map((updates || []).filter(item => item?.quote && Number.isFinite(item.quote.c)).map(item => [String(item.symbol).toUpperCase(), item.quote.c]));
    if (!quotes.size) return;
    portfolio.holdings.forEach(holding => {
      const symbol = String(holding.instrument?.symbol || holding.instrument?.ticker || '').toUpperCase();
      const price = quotes.get(symbol);
      if (!Number.isFinite(price) || holding.instrument?.kind === 'option') return;
      holding.price = price;
      holding.value = Number(holding.quantity || 0) * price;
      const costBasis = Number(holding.quantity || 0) * Number(holding.averagePrice);
      holding.gainLoss = Number.isFinite(costBasis) ? holding.value - costBasis : null;
      holding.gainLossPercent = Number.isFinite(costBasis) && costBasis !== 0 ? (holding.gainLoss / Math.abs(costBasis)) * 100 : null;
    });
    (portfolio.accounts || []).forEach(account => {
      const positionsValue = portfolio.holdings.filter(holding => holding.accountId === account.id).reduce((total, holding) => total + (Number(holding.value) || 0), 0);
      const cash = Number(account.balances?.cash);
      if (Number.isFinite(cash)) account.balances.current = positionsValue + cash;
    });
    portfolioQuotesUpdatedAt = new Date();
    if (portfolioPageOpen) renderPortfolioPage();
  } catch { /* Keep the last broker-provided values until the next fast quote update. */ }
  finally { portfolioQuoteRefreshInProgress = false; }
}
window.portfolioApp.onSnapTradeUpdated(() => {
  void loadSnapTradeState().then(() => {
    const result = snapTradeState.portalResult;
    if (result?.status === 'SUCCESS') {
      const message = 'Brokerage connection confirmed. Refreshing the portfolio data…';
      if ($('snaptrade-config-status')) $('snaptrade-config-status').textContent = message;
      if ($('diagnostics-status')) $('diagnostics-status').textContent = message;
    } else if (result?.status && result.status !== 'ABANDONED') {
      const message = `Brokerage connection was not completed${result.errorCode ? ` (${result.errorCode})` : ''}${result.detail ? `: ${result.detail}` : '.'}`;
      if ($('snaptrade-config-status')) $('snaptrade-config-status').textContent = message;
      if ($('diagnostics-status')) $('diagnostics-status').textContent = message;
    }
    renderBrokerageAccounts();
    if (portfolioPageOpen) renderPortfolioPage();
    if (brokerageDiagnosticsPageOpen) renderBrokerageDiagnosticsPage();
    void refreshPortfolioQuotes();
  });
});
const addBrokerageForm = $('add-brokerage-form'); if (addBrokerageForm) addBrokerageForm.onsubmit = async event => {
  event.preventDefault();
  const name = $('brokerage-name').value.trim(), nickname = $('brokerage-nickname').value.trim();
  if (!name) return;
  settings.plaidAccounts = [...brokerageAccounts(), { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, nickname }];
  await window.portfolioApp.saveSettings(settings);
  $('brokerage-name').value = ''; $('brokerage-nickname').value = '';
  renderBrokerageAccounts();
};
function setupKeyVisibility(inputId, buttonId, keyName) {
  const input = $(inputId), button = $(buttonId);
  button.onclick = () => {
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    button.textContent = showing ? '👁' : '🙈';
    button.setAttribute('aria-pressed', String(!showing));
    button.setAttribute('aria-label', `${showing ? 'Show' : 'Hide'} ${keyName} API key`);
    button.title = `${showing ? 'Show' : 'Hide'} key`;
  };
}
setupKeyVisibility('api-key', 'toggle-api-key', 'Finnhub');
setupKeyVisibility('fmp-api-key', 'toggle-fmp-api-key', 'Financial Modeling Prep');
setupKeyVisibility('alpha-vantage-api-key', 'toggle-alpha-vantage-api-key', 'Alpha Vantage');
setupKeyVisibility('youtube-api-key', 'toggle-youtube-api-key', 'YouTube');
$('sort-tickers').onchange = async event => { tickerSort = event.target.value; settings.tickerSort = tickerSort; await window.portfolioApp.saveSettings(settings); render(); };
function table(headers, rows) { return `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`; }
function renderTrending() {
  const collapsed = settings.trendingCollapsed === true;
  const content = $('trending-content'), toggle = $('trending-toggle');
  if (content) content.hidden = collapsed;
  if (toggle) {
    toggle.textContent = collapsed ? '+' : '−';
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.title = collapsed ? 'Expand Trending stocks' : 'Collapse Trending stocks';
    toggle.onclick = async () => {
      settings.trendingCollapsed = !settings.trendingCollapsed;
      await window.portfolioApp.saveSettings(settings);
      renderTrending();
    };
  }
  const preview = settings.trendingBadgePreview;
  const previewSymbol = preview?.date === localDateKey() ? String(preview.symbol || '').toUpperCase() : '';
  $('reddit-trending-list').innerHTML = trendingStocks.length ? trendingStocks.map((item, index) => { const symbol = String(item.symbol || '').toUpperCase(); const isNew = trendingNewSymbols.has(symbol) || symbol === previewSymbol; return `<article class="trending-card">${isNew ? `<span class="trending-new-badge${trendingBadgeIntroActive ? ' trending-new-badge-intro' : ''}" title="New to the trending list since the prior daily list">New!</span>` : ''}<button type="button" data-trending-stock="${index}"><strong>${escape(item.symbol)}</strong><span>${item.mentions} mentions</span><small>${escape(item.name || item.symbol)}</small></button><button type="button" class="reddit-posts-action" data-reddit-posts="${index}">Open Reddit discussion</button></article>`; }).join('') : '<p>Reddit discussion trends are temporarily unavailable.</p>';
  if (trendingBadgeIntroActive && !trendingBadgeIntroTimer && document.querySelector('.trending-new-badge')) {
    trendingBadgeIntroTimer = setTimeout(() => {
      trendingBadgeIntroActive = false;
      document.querySelectorAll('.trending-new-badge-intro').forEach(badge => badge.classList.remove('trending-new-badge-intro'));
    }, 5000);
  }
  document.querySelectorAll('[data-trending-stock]').forEach(button => button.onclick = () => { const item = trendingStocks[Number(button.dataset.trendingStock)]; if (item) showSearchTicker(item.symbol, item.name || item.symbol); });
  document.querySelectorAll('[data-reddit-posts]').forEach(button => button.onclick = () => { const item = trendingStocks[Number(button.dataset.redditPosts)]; if (item) void window.portfolioApp.openRedditSearch(item.symbol); });
}
async function refreshTrendingStocks() {
  $('trending-status').textContent = 'Updating…';
  try {
    trendingStocks = await window.portfolioApp.trendingStocks(); trendingUpdatedAt = new Date();
    const today = localDateKey(trendingUpdatedAt);
    const history = settings.trendingDailySnapshots && typeof settings.trendingDailySnapshots === 'object' ? settings.trendingDailySnapshots : {};
    const priorDate = Object.keys(history).filter(date => date < today).sort().pop();
    const priorSymbols = new Set(Array.isArray(history[priorDate]) ? history[priorDate].map(symbol => String(symbol).toUpperCase()) : []);
    trendingNewSymbols = priorDate ? new Set(trendingStocks.map(item => String(item.symbol || '').toUpperCase()).filter(symbol => symbol && !priorSymbols.has(symbol))) : new Set();
    history[today] = trendingStocks.map(item => String(item.symbol || '').toUpperCase()).filter(Boolean);
    const retainedDates = Object.keys(history).sort().slice(-31);
    settings.trendingDailySnapshots = Object.fromEntries(retainedDates.map(date => [date, history[date]]));
    await window.portfolioApp.saveSettings(settings);
    renderTrending();
    $('trending-status').textContent = `Updated ${trendingUpdatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  } catch (error) { trendingStocks = []; renderTrending(); $('trending-status').textContent = error.message || 'Could not update Reddit trends.'; }
}
function renderRedditPosts() {
  const viewer = $('reddit-posts-view');
  if (!redditPostView) { viewer.hidden = true; document.querySelector('.snapshot').hidden = false; $('chart-panel').hidden = false; $('section-tabs').hidden = false; $('content').hidden = false; return false; }
  viewer.hidden = false; document.querySelector('.snapshot').hidden = true; $('chart-panel').hidden = true; $('section-tabs').hidden = true; $('content').hidden = true;
  const { symbol, name, posts, loading, error, notice } = redditPostView;
  const body = loading ? '<p>Loading recent Reddit posts…</p>' : error ? `<p>${escape(error)}</p>` : !posts.length ? `<p>${escape(notice || 'No recent public Reddit posts were found for this ticker.')}</p><p><a href="https://www.reddit.com/search/?q=${encodeURIComponent(symbol)}" target="_blank" rel="noreferrer">Open ${escape(symbol)} on Reddit</a></p>` : `<div class="reddit-post-list">${posts.map(post => `<article><div><strong>${escape(post.subreddit)}</strong> · u/${escape(post.author)} · ${new Date(post.created * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div><a href="${escape(post.url)}" target="_blank" rel="noreferrer">${escape(post.title)}</a>${post.body ? `<p>${escape(post.body.slice(0, 700))}</p>` : ''}<small>${post.score} score · ${post.comments} comments</small></article>`).join('')}</div>`;
  viewer.innerHTML = `<div class="reddit-posts-heading"><div><h2>Reddit discussion: ${escape(symbol)}</h2><p>Recent public posts related to ${escape(name || symbol)}.</p></div><button id="close-reddit-posts" type="button">Back to stock</button></div>${body}`;
  $('close-reddit-posts').onclick = () => { redditPostView = null; render(); };
  return true;
}
async function openRedditPosts(item) {
  redditPostView = { symbol: item.symbol, name: item.name, posts: [], loading: true, error: '' }; render();
  try { const result = await window.portfolioApp.redditPosts(item.symbol); redditPostView.posts = result.posts || []; redditPostView.notice = result.notice || ''; }
  catch (error) { redditPostView.error = error.message || 'Could not load Reddit posts.'; }
  finally { redditPostView.loading = false; render(); }
}
function renderNews(dossier) {
  const items = Array.isArray(dossier.news) ? dossier.news.filter(item => !Array.isArray(item) && articleDirectlyMentionsCompany(item, dossier, ticker)) : [];
  const percent = Math.max(0, Math.min(100, Math.round(newsLoadingProgress)));
  const loading = newsLoading ? `<div class="news-loading-overlay" role="status"><div><i aria-hidden="true"></i><strong>Refreshing news</strong><span class="news-loading-progress-label">${percent}% complete</span><span class="news-loading-progress"><span class="news-loading-progress-fill" style="width:${percent}%"></span></span></div></div>` : '';
  if (!items.length) return `<div class="news-refresh-wrap">${loading}<p class="earnings-empty">No recent company-specific news found. Broad market and unrelated ticker-roundup articles are excluded.</p></div>`;
  const now = Date.now(), hotTerms = /breaking|guidance|earnings|acquisition|merger|deal|contract|investigation|lawsuit|downgrade|upgrade|offering|buyback|sec|fda/i;
  const sorted = [...items].sort((a, b) => { const aHot = (now - (a.datetime || 0) * 1000 < 86400000 || hotTerms.test(a.headline || '')) ? 1 : 0, bHot = (now - (b.datetime || 0) * 1000 < 86400000 || hotTerms.test(b.headline || '')) ? 1 : 0; return bHot - aHot || (b.datetime || 0) - (a.datetime || 0); });
  const visibleItems = sorted.slice(0, newsVisible), more = sorted.length > newsVisible ? '<button id="show-more-news" type="button" style="margin-top:14px">Show more</button>' : '';
  return `<div class="news-refresh-wrap">${loading}<div class="news-list">${visibleItems.map(item => { const date = item.datetime ? new Date(item.datetime * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Recent', summary = item.summary || 'Open the original article for the full report.', analysis = item.analysis; return `<article class="news-item" style="padding:16px 0;border-bottom:1px solid #e2e2e6"><div class="news-source" style="margin-bottom:6px">${escape(item.source || 'News source')} · ${escape(date)}</div><a href="${escape(item.url)}" target="_blank" rel="noreferrer">${escape(item.headline)}</a><p style="margin:10px 0 0"><strong>Summary:</strong> ${escape(summary)}</p><p style="margin:10px 0 0"><strong>Why it matters:</strong> ${escape(analysis?.relevance || 'Generating company relevance…')}</p><p style="margin:8px 0 0"><strong>Potential impact:</strong> ${escape(analysis?.potentialImpact || 'Generating potential impact…')}</p></article>`; }).join('')}${more}</div></div>`;
}
function articleDirectlyMentionsCompany(item, dossier, symbol) {
  const article = `${item?.headline || ''} ${item?.summary || ''}`.toLowerCase();
  const company = String(dossier?.name || '').toLowerCase().replace(/\b(incorporated|corporation|company|inc|corp|ltd|plc|sa)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const companyMentioned = company.length >= 4 && article.includes(company);
  const tickerMentioned = new RegExp(`(^|[^a-z0-9])${String(symbol || '').toLowerCase()}([^a-z0-9]|$)`, 'i').test(article);
  return companyMentioned || tickerMentioned;
}
function newsItemKey(item) {
  return String(item?.id || item?.url || `${item?.headline || ''}:${item?.datetime || ''}`);
}
function neutralNewsAnalysis(dossier) {
  return {
    relevance: `The supplied article does not identify a direct company-specific connection to ${dossier?.name || 'this company'}; it is included as broader market or sector context.`,
    potentialImpact: 'Any effect is indirect and uncertain; the article does not state a specific operational, customer, supplier, or financial impact for the company.',
    version: NEWS_ANALYSIS_VERSION
  };
}
function newsItemsNeedingAnalysis(symbol) {
  const dossier = holdings[symbol], items = Array.isArray(dossier?.news) ? dossier.news.filter(item => !Array.isArray(item) && item.headline && articleDirectlyMentionsCompany(item, dossier, symbol) && (!item.analysis || item.analysis.version !== NEWS_ANALYSIS_VERSION)) : [];
  // One complete pass prevents later hidden stories from triggering a second
  // loading cycle after the visible list has already been revealed.
  return items;
}
function updateNewsProgressOverlay() {
  const percent = Math.max(0, Math.min(100, Math.round(newsLoadingProgress)));
  const label = document.querySelector('.news-loading-progress-label');
  const fill = document.querySelector('.news-loading-progress-fill');
  if (label) label.textContent = `${percent}% complete`;
  if (fill) fill.style.width = `${percent}%`;
}
async function updateNewsAnalysis(symbol, onProgress = null) {
  const dossier = holdings[symbol], items = newsItemsNeedingAnalysis(symbol);
  let completed = 0;
  for (const item of items) {
    const key = `${symbol}:${newsItemKey(item)}`;
    if (newsAnalysisInProgress.has(key)) { completed += 1; onProgress?.(completed, items.length); continue; }
    newsAnalysisInProgress.add(key);
    try {
      item.analysis = articleDirectlyMentionsCompany(item, dossier, symbol)
        ? { ...await window.portfolioApp.generateNewsImpact({ companyName: dossier.name, headline: item.headline, summary: item.summary || '' }), version: NEWS_ANALYSIS_VERSION }
        : neutralNewsAnalysis(dossier);
      await persist();
    } catch {
      item.analysis = neutralNewsAnalysis(dossier);
      await persist();
    } finally { newsAnalysisInProgress.delete(key); completed += 1; onProgress?.(completed, items.length); }
  }
}
async function finishNewsRefresh(symbol, token) {
  const items = newsItemsNeedingAnalysis(symbol);
  newsLoadingProgress = 20;
  updateNewsProgressOverlay();
  await updateNewsAnalysis(symbol, (completed, total) => { if (token === newsRefreshToken) { newsLoadingProgress = total ? 20 + ((completed / total) * 80) : 100; updateNewsProgressOverlay(); } });
  if (token === newsRefreshToken && symbol === ticker && section === 'news') {
    newsLoadingProgress = 100;
    updateNewsProgressOverlay();
    await new Promise(resolve => setTimeout(resolve, 160));
    newsLoading = false;
    renderContent();
  }
}
function completePendingNewsAnalysis(symbol) {
  const hasPendingAnalysis = newsItemsNeedingAnalysis(symbol).length > 0;
  if (!hasPendingAnalysis || newsLoading || symbol !== ticker || section !== 'news') return;
  const token = ++newsRefreshToken;
  newsLoading = true;
  newsLoadingProgress = 0;
  renderContent();
  void finishNewsRefresh(symbol, token);
}
function render() {
  const noteFocus = activeNoteFocus();
  const preserveNotesEditor = Boolean(noteFocus?.ticker === ticker && section === 'notes');
  const chartRangeEditor = document.activeElement?.id;
  const preserveCustomRangeEditor = chartRangeEditor === 'custom-range-start' || chartRangeEditor === 'custom-range-end';
  // Native date controls return an empty value while the user is mid-entry.
  // Do not recreate their DOM during a five-second quote update or that
  // temporary value is lost before the next keystroke can complete it.
  const preserveEditableContent = preserveNotesEditor || preserveCustomRangeEditor;
  const pageScrollY = preserveEditableContent ? window.scrollY : null;
  saveActiveNoteDraft();
  // A refresh can finish after a ticker is removed. Drop any stale placeholder
  // entries before sorting or reading their live quote fields.
  holdings = Object.fromEntries(Object.entries(holdings || {}).filter(([, dossier]) => dossier && typeof dossier === 'object'));
  if (!Object.keys(holdings).length) { ticker = null; renderEmpty(); return; }
  if (!holdings[ticker]) ticker = Object.keys(holdings)[0];
  const d = holdings[ticker];
  if (!d) { renderEmpty(); return; }
  const orderedHoldings = Object.entries(holdings).sort(([a, aDossier], [b, bDossier]) => { if (tickerSort === 'alpha') return a.localeCompare(b); if (tickerSort === 'earnings') { const aDate = String(aDossier?.earnings || '').match(/\d{4}-\d{2}-\d{2}/)?.[0], bDate = String(bDossier?.earnings || '').match(/\d{4}-\d{2}-\d{2}/)?.[0], aValue = aDate ? Date.parse(`${aDate}T12:00:00`) : Infinity, bValue = bDate ? Date.parse(`${bDate}T12:00:00`) : Infinity; return aValue - bValue || a.localeCompare(b); } const aChange = Number.parseFloat(aDossier?.change), bChange = Number.parseFloat(bDossier?.change), aValue = Number.isFinite(aChange) ? aChange : -Infinity, bValue = Number.isFinite(bChange) ? bChange : -Infinity; return bValue - aValue || a.localeCompare(b); });
  holdings = Object.fromEntries(orderedHoldings);
  $('sort-tickers').value = tickerSort;
  $('ticker-update-status').textContent = lastQuoteRefresh ? `Quotes updated ${lastQuoteRefresh.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}` : '';
  $('ticker-tabs').innerHTML = Object.keys(holdings).filter(key => !holdings[key]?.isSearchResult).map(key => { const change = holdings[key]?.change || '—', numeric = Number.parseFloat(change), style = Number.isFinite(numeric) ? (numeric >= 0 ? 'ticker-gain' : 'ticker-loss') : ''; return `<button class="${key === ticker ? 'active' : ''}" data-ticker="${key}" role="tab" aria-selected="${key === ticker}"><span>${key}</span><span class="ticker-change ${style}">${change}</span></button>`; }).join('');
  const sidebarCard = key => {
    const dossier = holdings[key];
    const dailyMove = formatDailyMove(dossier);
    const numeric = Number.parseFloat(dossier?.change);
    const style = Number.isFinite(numeric) ? (numeric >= 0 ? 'ticker-gain' : 'ticker-loss') : '';
    const extended = extendedHoursMove(dossier);
    const extendedStyle = extended?.positive === true ? 'ticker-gain' : extended?.positive === false ? 'ticker-loss' : '';
    const displayedPrice = String(dossier?.price || '—').replace(/^\$/, '');
    const extendedText = extended ? extended.text.replace(/^(?:Pre|After)\s+/, '').replace(/^\$/, '') : '';
    const sessionIcon = extended?.label === 'After-hours' ? '☾' : '☀';
    return `<button class="ticker-card ${key === ticker ? 'active' : ''}" data-sidebar-symbol="${key}" role="tab" aria-selected="${key === ticker}" aria-label="${key}: ${displayedPrice}, ${dailyMove}">
      <span class="ticker-card-header"><span class="ticker-card-symbol">${key}</span><span class="ticker-card-price">${escape(displayedPrice)}</span></span>
      <span class="ticker-card-move ticker-change ${style}">${escape(dailyMove)}</span>
      ${extended ? `<span class="ticker-card-extended ${extendedStyle}" title="${extended.label}"><i aria-hidden="true">${sessionIcon}</i><span>${escape(extendedText)}</span></span>` : ''}
    </button>`;
  };
  $('ticker-tabs').innerHTML = Object.keys(holdings).filter(key => isTickerEntry(holdings[key])).map(sidebarCard).join('');
  const sortSymbols = (symbols, sort) => [...symbols].sort((a, b) => {
    if (sort === 'alpha') return a.localeCompare(b);
    if (sort === 'earnings') {
      const aDate = String(holdings[a]?.earnings || '').match(/\d{4}-\d{2}-\d{2}/)?.[0], bDate = String(holdings[b]?.earnings || '').match(/\d{4}-\d{2}-\d{2}/)?.[0];
      const aValue = aDate ? Date.parse(`${aDate}T12:00:00`) : Infinity, bValue = bDate ? Date.parse(`${bDate}T12:00:00`) : Infinity;
      return aValue - bValue || a.localeCompare(b);
    }
    const aValue = Number.parseFloat(holdings[a]?.change), bValue = Number.parseFloat(holdings[b]?.change);
    return (Number.isFinite(bValue) ? bValue : -Infinity) - (Number.isFinite(aValue) ? aValue : -Infinity) || a.localeCompare(b);
  });
  const watchlistSort = settings.watchlistSort || 'change';
  const sortedWatchlist = sortSymbols(Object.keys(holdings).filter(key => isWatchlistEntry(holdings[key])), watchlistSort);
  $('watchlist-tabs').innerHTML = sortedWatchlist.map(sidebarCard).join('') || '<p class="watchlist-empty">No stocks in your watchlist.</p>';
  $('sort-watchlist').value = watchlistSort;
  $('sort-watchlist').onchange = async event => { settings.watchlistSort = event.target.value; await window.portfolioApp.saveSettings(settings); render(); };
  // Watchlist is the always-visible quick-reference list. Custom lists below
  // it remain collapsed by default to keep the rail compact.
  const watchlistCollapsed = false;
  $('watchlist-toggle').setAttribute('aria-expanded', String(!watchlistCollapsed));
  $('watchlist-toggle').classList.toggle('collapsed', watchlistCollapsed);
  $('watchlist-tabs').hidden = watchlistCollapsed;
  document.querySelector('.watchlist-sort-row').hidden = watchlistCollapsed;
  $('watchlist-toggle').onclick = () => {};
  $('custom-lists').innerHTML = customLists().map(list => {
    const collapsed = Boolean(list.collapsed), symbols = sortSymbols(Object.keys(holdings).filter(key => isCustomListEntry(holdings[key], list.id)), list.sort || 'change');
    return `<section class="custom-list" data-custom-list="${escape(list.id)}"><div class="custom-list-header"><button class="custom-list-toggle ${collapsed ? 'collapsed' : ''}" type="button" data-custom-list-toggle="${escape(list.id)}" aria-expanded="${!collapsed}"><span>${escape(list.name)}</span><i aria-hidden="true">⌄</i></button><div class="custom-list-actions"><select data-custom-list-sort="${escape(list.id)}" aria-label="Sort ${escape(list.name)}"><option value="change" ${(list.sort || 'change') === 'change' ? 'selected' : ''}>Daily %</option><option value="alpha" ${list.sort === 'alpha' ? 'selected' : ''}>A–Z</option><option value="earnings" ${list.sort === 'earnings' ? 'selected' : ''}>Earnings</option></select><button type="button" class="custom-list-delete" data-custom-list-delete="${escape(list.id)}" title="Delete ${escape(list.name)}" aria-label="Delete ${escape(list.name)}">×</button></div></div><div class="custom-list-content ticker-list" ${collapsed ? 'hidden' : ''}>${symbols.map(sidebarCard).join('') || '<p class="watchlist-empty">No stocks in this list.</p>'}</div></section>`;
  }).join('') || '<p class="watchlist-empty custom-lists-empty">Create a list to organize stocks.</p>';
  // Use the same vector chevron as Watchlist so custom-list controls are
  // equally visible at every display scale.
  document.querySelectorAll('.custom-list-toggle i').forEach(icon => {
    icon.outerHTML = '<svg aria-hidden="true" viewBox="0 0 16 16" focusable="false"><path d="m4 6 4 4 4-4"/></svg>';
  });
  document.querySelectorAll('.custom-list-delete').forEach(button => {
    button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 16 16" focusable="false"><path d="M3.5 4.5h9M6 4.5V3.2h4v1.3m-5.3 0 .55 8.1h5.5l.55-8.1M7 6.7v3.7m2-3.7v3.7"/></svg>';
  });
  document.querySelectorAll('[data-custom-list-toggle]').forEach(button => button.onclick = async () => {
    const list = customLists().find(item => item.id === button.dataset.customListToggle); if (!list) return;
    list.collapsed = !list.collapsed; await window.portfolioApp.saveSettings(settings); render();
  });
  document.querySelectorAll('[data-custom-list-sort]').forEach(select => select.onchange = async event => {
    const list = customLists().find(item => item.id === event.target.dataset.customListSort); if (!list) return;
    list.sort = event.target.value; await window.portfolioApp.saveSettings(settings); render();
  });
  document.querySelectorAll('[data-custom-list-delete]').forEach(button => button.onclick = async () => {
    const list = customLists().find(item => item.id === button.dataset.customListDelete); if (!list || !window.confirm(`Delete the list “${list.name}”? Stocks will remain in your other lists.`)) return;
    settings.customLists = customLists().filter(item => item.id !== list.id);
    Object.values(holdings).forEach(dossier => { if (Array.isArray(dossier.customLists)) dossier.customLists = dossier.customLists.filter(id => id !== list.id); });
    await Promise.all([persist(), window.portfolioApp.saveSettings(settings)]); render();
  });
  document.querySelectorAll('[data-ticker]').forEach(button => {
    const dossier = holdings[button.dataset.ticker], change = button.querySelector('.ticker-change');
    const percent = Number.parseFloat(dossier?.change);
    if (!change) return;
    change.textContent = formatDailyMove(dossier);
    change.classList.toggle('ticker-gain', Number.isFinite(percent) && percent >= 0);
    change.classList.toggle('ticker-loss', Number.isFinite(percent) && percent < 0);
  });
  document.querySelectorAll('[data-ticker]').forEach(button => button.onclick = () => { ticker = button.dataset.ticker; redditPostView = null; chartView = null; earningsVisible = 4; newsVisible = 5; render(); void refreshMarketData(); });
  document.querySelectorAll('[data-sidebar-symbol]').forEach(button => {
    const dossier = holdings[button.dataset.sidebarSymbol], change = button.querySelector('.ticker-change'), percent = Number.parseFloat(dossier?.change);
    if (change) { change.textContent = formatDailyMove(dossier); change.classList.toggle('ticker-gain', Number.isFinite(percent) && percent >= 0); change.classList.toggle('ticker-loss', Number.isFinite(percent) && percent < 0); }
    button.onclick = () => { ticker = button.dataset.sidebarSymbol; redditPostView = null; chartView = null; earningsVisible = 4; newsVisible = 5; render(); void refreshMarketData(); };
  });
  if (renderRedditPosts()) return;
  $('title').textContent = `${ticker} — ${d.name}`; $('story').textContent = d.story; $('overview-loading').hidden = !overviewInProgress.has(ticker);
  const inferredTiming = d.earningsTime || (String(d.earnings || '').match(/\((bmo|amc)\)/i)?.[1]?.toLowerCase());
  const publishedValue = d.publishedValuation;
  const fairValue = Number.isFinite(publishedValue?.valuePerShare) ? `$${publishedValue.valuePerShare.toFixed(2)}` : 'Unavailable';
  const fairValueTitle = publishedValue ? `${publishedValue.label || 'Published fair value'} from ${publishedValue.source}. Retrieved ${new Date(publishedValue.retrievedAt).toLocaleDateString()}.` : 'No published fair-value estimate is currently available from Alpha Spread, Morningstar, Simply Wall St, or Finbox for this ticker.';
  // Keep older saved research files from rendering their retired DCF scenarios.
  d.dcf = publishedValue ? {} : null;
  const dcfValue = fairValue;
  const dcfTitle = fairValueTitle;
  const dcfScenarios = d.dcf?.scenarios ? `<small class="dcf-scenarios">Bear $${d.dcf.scenarios.find(item => item.name === 'bear').valuePerShare.toFixed(2)} · Base $${d.dcf.scenarios.find(item => item.name === 'base').valuePerShare.toFixed(2)} · Bull $${d.dcf.scenarios.find(item => item.name === 'bull').valuePerShare.toFixed(2)}</small>` : '';
  const activeExtendedMove = extendedHoursMove(d);
  const ibkrLiveDetail = d.liveMarketSource === 'IBKR' && d.liveMarketQuote ? `Bid ${d.liveMarketQuote.bid ? `$${Number(d.liveMarketQuote.bid).toFixed(2)}` : '—'} · Ask ${d.liveMarketQuote.ask ? `$${Number(d.liveMarketQuote.ask).toFixed(2)}` : '—'} · Vol ${Number.isFinite(d.liveMarketQuote.volume) ? Number(d.liveMarketQuote.volume).toLocaleString() : '—'}` : null;
  $('metrics').innerHTML = [['Current price', d.price], ['Today', d.change || '—'], ['Next earnings', d.earnings], ...(ibkrLiveDetail ? [['Live feed', ibkrLiveDetail, 'Live bid, ask, and daily volume from your authenticated Interactive Brokers session.']] : []), ['Market cap', marketCap(d.marketCap), 'Market capitalization from the company profile.'], ['DCF value / share', dcfValue, dcfTitle]].map(m => `<div${m[0] === 'DCF value / share' ? ' class="dcf-metric"' : ''}><dt${m[2] ? ` title="${escape(m[2])}"` : ''}>${m[0]}</dt><dd${m[0] === 'DCF value / share' && !d.dcf ? ` class="dcf-unavailable" title="${escape(dcfTitle)}"` : ''}>${m[0] === 'Next earnings' && inferredTiming ? `<span class="earnings-time" title="${earningsTimingHelp(inferredTiming)}">${escape(m[1])}</span>` : escape(m[1])}</dd>${m[0] === 'Today' && activeExtendedMove ? `<small class="extended-hours-prices ${activeExtendedMove.positive === true ? 'ticker-gain' : activeExtendedMove.positive === false ? 'ticker-loss' : ''}">${escape(activeExtendedMove.label)} ${escape(activeExtendedMove.text.replace(/^(Pre|After)\s/, ''))}</small>` : ''}${m[0] === 'DCF value / share' ? dcfScenarios : ''}</div>`).join('');
  const valuationMetric = [...$('metrics').children].find(item => item.querySelector('dt')?.textContent === 'DCF value / share');
  if (valuationMetric) {
    valuationMetric.querySelector('dt').textContent = 'Published fair value / share';
    if (publishedValue?.url) valuationMetric.insertAdjacentHTML('beforeend', `<small class="dcf-scenarios"><a href="${escape(publishedValue.url)}" target="_blank" rel="noreferrer">View ${escape(publishedValue.source)} source</a></small>`);
  }
  const todayValue = document.querySelector('#metrics > div:nth-child(2) dd');
  const dailyPercent = Number.parseFloat(d.change);
  if (todayValue) {
    todayValue.textContent = formatDailyMove(d);
    todayValue.classList.toggle('ticker-gain', Number.isFinite(dailyPercent) && dailyPercent >= 0);
    todayValue.classList.toggle('ticker-loss', Number.isFinite(dailyPercent) && dailyPercent < 0);
  }
  $('add-ticker').disabled = !d;
  $('delete-ticker').disabled = Boolean(d.isSearchResult);
  document.querySelectorAll('[data-section]').forEach(button => { button.classList.toggle('active', button.dataset.section === section); button.onclick = () => { sectionScrollPositions[section] = window.scrollY; section = button.dataset.section; document.querySelectorAll('[data-section]').forEach(tab => tab.classList.toggle('active', tab.dataset.section === section)); const dossier = holdings[ticker]; if (section === 'news' && settings.finnhubToken && !dossier.newsLoadedAt) { newsLoading = true; newsLoadingProgress = 0; renderContent(); void refreshMarketData(); } else renderContent(); requestAnimationFrame(() => window.scrollTo({ top: sectionScrollPositions[section] ?? window.scrollY, behavior: 'auto' })); }; });
  // Quote refreshes occur every five seconds. Do not replace the notes DOM while
  // someone is writing: replacing a textarea resets its own scrollbar and can
  // shift the page even if focus and text are restored afterwards.
  if (!preserveEditableContent) renderContent();
  if (noteFocus?.ticker === ticker && section === 'notes') {
    requestAnimationFrame(() => {
      const input = noteFocus.editor === 'edit' ? document.querySelector(`[data-note-editor][data-note-index="${noteFocus.noteIndex}"]`) : $('new-note');
      if (!input || input.dataset.ticker !== noteFocus.ticker) return;
      input.focus({ preventScroll: true });
      input.setSelectionRange(noteFocus.start, noteFocus.end, noteFocus.direction || 'none');
    });
  }
  if (pageScrollY !== null) requestAnimationFrame(() => window.scrollTo({ top: pageScrollY, behavior: 'auto' }));
  // A live quote refresh must not rebuild the SVG while the notes editor is
  // active. Rebuilding it was the visible "graph refresh" caused by editing.
  if (!preserveEditableContent) renderChart();
  void updateOverview(ticker);
  if (d.aiOverview) void updateThesis(ticker);
}
function renderEmpty() { $('ticker-tabs').innerHTML = ''; $('title').textContent = 'No tickers yet'; $('story').textContent = 'Search for a ticker to start a new research dossier.'; $('metrics').innerHTML = ''; $('content').innerHTML = ''; $('price-chart').innerHTML = '<text class="chart-empty" x="400" y="130" text-anchor="middle">Search for a ticker to see its historical price.</text>'; $('chart-summary').textContent = ''; $('add-ticker').disabled = true; $('delete-ticker').disabled = true; }
async function updateOverview(symbol) {
  const dossier = holdings[symbol];
  if (!dossier || !needsCompanyOverview(dossier) || overviewInProgress.has(symbol)) return;
  const source = dossier.profileOverview || dossier.story;
  if (!source || /overview loading|please provide me with the company story|start with the company story/i.test(source) || dossier.overviewGeneratedFrom === source) return;
  overviewInProgress.add(symbol);
  if (symbol === ticker) $('overview-loading').hidden = false;
  if (symbol === ticker) $('message').textContent = 'Updating local overview…';
  try {
    const overview = await window.portfolioApp.generateOverview({ companyName: dossier.name, sourceText: source });
    if (!holdings[symbol]) return;
    dossier.story = overview;
    dossier.aiOverview = true;
    dossier.overviewGeneratedFrom = source;
    await persist();
    if (symbol === ticker) {
      $('message').textContent = 'Overview updated.';
      render();
    }
  } catch (error) {
    if (symbol === ticker) $('message').textContent = error.message || 'Could not update the local overview.';
  } finally {
    if (symbol === ticker) $('overview-loading').hidden = true;
    overviewInProgress.delete(symbol);
  }
}
async function updateThesis(symbol, force = false) {
  const dossier = holdings[symbol];
  if (!dossier || thesisInProgress.has(symbol) || !dossier.aiOverview) return;
  const source = dossier.story;
  if (!source || /overview loading|please provide me with the company story|start with the company story/i.test(source)) return;
  const noteText = (dossier.notes || []).map(note => `${note?.[0] || 'Undated'}: ${note?.[1] || ''}`.trim()).filter(Boolean).join('\n');
  const thesisSignature = JSON.stringify({ source, noteText });
  if (!force && dossier.thesisGenerated && dossier.thesisGeneratedFrom === thesisSignature) return;
  thesisInProgress.add(symbol);
  if (symbol === ticker) $('message').textContent = 'Generating local thesis…';
  let needsRerun = false;
  try {
    const thesis = await window.portfolioApp.generateThesis({ companyName: dossier.name, sourceText: source, notesText: noteText });
    if (!holdings[symbol]) return;
    const currentNotes = (holdings[symbol].notes || []).map(note => `${note?.[0] || 'Undated'}: ${note?.[1] || ''}`.trim()).filter(Boolean).join('\n');
    if (JSON.stringify({ source: holdings[symbol].story, noteText: currentNotes }) !== thesisSignature) { needsRerun = true; return; }
    dossier.thesis = thesis;
    dossier.thesisGenerated = true;
    dossier.thesisGeneratedFrom = thesisSignature;
    await persist();
    if (symbol === ticker) { $('message').textContent = 'Thesis and risks generated.'; render(); }
  } catch (error) {
    if (symbol === ticker) { $('message').textContent = error.message || 'Could not generate the local thesis.'; renderContent(); }
  } finally {
    thesisInProgress.delete(symbol);
    if (needsRerun) void updateThesis(symbol);
  }
}
const financialStatements = {
  income: { title: 'Income statement', chart: [['TotalRevenue', 'Revenue'], ['NetIncomeCommonStockholders', 'Net income']], fields: [['TotalRevenue', 'Total revenue'], ['CostOfRevenue', 'Cost of revenue'], ['GrossProfit', 'Gross profit'], ['OperatingExpense', 'Operating expense'], ['OperatingIncome', 'Operating income'], ['PretaxIncome', 'Pretax income'], ['TaxProvision', 'Tax provision'], ['NetIncomeCommonStockholders', 'Net income'], ['DilutedEPS', 'Diluted EPS'], ['BasicEPS', 'Basic EPS']] },
  balance: { title: 'Balance sheet', chart: [['TotalAssets', 'Total assets'], ['TotalLiabilitiesNetMinorityInterest', 'Total liabilities'], ['StockholdersEquity', 'Stockholders\' equity']], fields: [['CashCashEquivalentsAndShortTermInvestments', 'Cash & short-term investments'], ['AccountsReceivable', 'Accounts receivable'], ['Inventory', 'Inventory'], ['CurrentAssets', 'Current assets'], ['TotalAssets', 'Total assets'], ['CurrentLiabilities', 'Current liabilities'], ['TotalLiabilitiesNetMinorityInterest', 'Total liabilities'], ['StockholdersEquity', 'Stockholders\' equity'], ['TotalDebt', 'Total debt'], ['NetDebt', 'Net debt']] },
  cashflow: { title: 'Cash flow', chart: [['OperatingCashFlow', 'Operating cash flow'], ['CapitalExpenditure', 'Capital expenditures'], ['FreeCashFlow', 'Free cash flow']], fields: [['OperatingCashFlow', 'Operating cash flow'], ['InvestingCashFlow', 'Investing cash flow'], ['FinancingCashFlow', 'Financing cash flow'], ['CapitalExpenditure', 'Capital expenditures'], ['FreeCashFlow', 'Free cash flow']] }
};
const formatFinancialValue = (value, metric) => {
  if (!Number.isFinite(value)) return '—';
  if (/EPS$/.test(metric)) return `$${value.toFixed(2)}`;
  const absolute = Math.abs(value), unit = absolute >= 1e9 ? 'B' : absolute >= 1e6 ? 'M' : absolute >= 1e3 ? 'K' : '';
  const divisor = unit === 'B' ? 1e9 : unit === 'M' ? 1e6 : unit === 'K' ? 1e3 : 1;
  return `${value < 0 ? '-' : ''}$${(absolute / divisor).toFixed(2)}${unit}`;
};
function renderFinancials(dossier) {
  const rows = Array.isArray(financialsPeriod === 'annual' ? dossier.financials : dossier.quarterlyFinancials) ? (financialsPeriod === 'annual' ? dossier.financials : dossier.quarterlyFinancials) : [];
  const periodLabel = financialsPeriod === 'annual' ? 'Annual' : 'Quarterly';
  const periodDate = date => financialsPeriod === 'annual' ? date.slice(0, 4) : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const statement = financialStatements[financialsView];
  const financialSource = financialsPeriod === 'quarterly' ? (dossier.quarterlyFinancialsSource || 'Yahoo Finance') : 'Yahoo Finance';
  const controls = `<div class="financial-controls"><div class="financial-tabs" role="tablist" aria-label="Financial period"><button data-financials-period="annual" class="${financialsPeriod === 'annual' ? 'active' : ''}">Annual</button><button data-financials-period="quarterly" class="${financialsPeriod === 'quarterly' ? 'active' : ''}">Quarterly</button></div><div class="financial-tabs" role="tablist" aria-label="Financial statement"><button data-financials-view="income" class="${financialsView === 'income' ? 'active' : ''}">Income statement</button><button data-financials-view="balance" class="${financialsView === 'balance' ? 'active' : ''}">Balance sheet</button><button data-financials-view="cashflow" class="${financialsView === 'cashflow' ? 'active' : ''}">Cash flow</button></div></div>`;
  const heading = `<div class="financials-heading"><div><h3>${statement.title}</h3><p>${periodLabel} figures from ${escape(financialSource)}.</p></div>${controls}</div>`;
  if (!rows.length) return `${heading}<div class="empty-state"><h3>No ${periodLabel.toLowerCase()} financials available</h3><p>${financialsPeriod === 'quarterly' ? 'The available data sources did not return quarterly statements for this ticker. You can switch back to Annual or choose another statement above.' : 'The available data sources did not return annual statements for this ticker.'}</p><span class="data-source">Source: ${escape(financialSource)}</span></div>`;
  const periods = [...rows].sort((a, b) => a.date.localeCompare(b.date)), chartRows = periods.filter(row => statement.chart.some(([metric]) => Number.isFinite(row[financialsView]?.[metric])));
  const values = chartRows.flatMap(row => statement.chart.map(([metric]) => row[financialsView]?.[metric]).filter(Number.isFinite));
  const minimum = Math.min(0, ...values), rawMaximum = Math.max(0, ...values), padding = Math.max((rawMaximum - minimum) * .12, Math.abs(rawMaximum || minimum) * .08, 1), maximum = rawMaximum + padding, lower = minimum < 0 ? minimum - padding : 0;
  const top = 32, bottom = 244, left = 78, right = 770, height = bottom - top, scaleY = value => bottom - ((value - lower) / (maximum - lower || 1)) * height;
  const ticks = Array.from({ length: 5 }, (_, index) => lower + ((maximum - lower) * index / 4));
  const groupWidth = (right - left) / Math.max(chartRows.length, 1), barWidth = Math.min(28, (groupWidth - 18) / statement.chart.length), zero = scaleY(0);
  const grid = ticks.map(value => `<line class="financial-grid" x1="${left}" x2="${right}" y1="${scaleY(value)}" y2="${scaleY(value)}"/><text class="financial-label" x="${left - 10}" y="${scaleY(value) + 4}" text-anchor="end">${formatFinancialValue(value, 'Amount')}</text>`).join('');
  const bars = chartRows.map((row, index) => statement.chart.map(([metric, label], series) => { const value = row[financialsView]?.[metric]; if (!Number.isFinite(value)) return ''; const x = left + index * groupWidth + (groupWidth - statement.chart.length * barWidth) / 2 + series * barWidth, y = Math.min(scaleY(value), zero), barHeight = Math.max(1, Math.abs(scaleY(value) - zero)), tooltip = `${periodDate(row.date)} — ${label}: ${formatFinancialValue(value, metric)}`; return `<rect class="financial-bar financial-bar-${series}" data-financials-tooltip="${escape(tooltip)}" x="${x}" y="${y}" width="${Math.max(2, barWidth - 4)}" height="${barHeight}"><title>${escape(tooltip)}</title></rect>`; }).join('') + `<text class="financial-label" x="${left + index * groupWidth + groupWidth / 2}" y="${bottom + 24}" text-anchor="middle">${periodDate(row.date)}</text>`).join('');
  const legend = statement.chart.map(([, label], index) => `<span><i class="financial-swatch financial-bar-${index}"></i>${label}</span>`).join('');
  const tableRows = statement.fields.map(([metric, label]) => `<tr><th scope="row">${label}</th>${[...rows].sort((a, b) => b.date.localeCompare(a.date)).map(row => `<td>${formatFinancialValue(row[financialsView]?.[metric], metric)}</td>`).join('')}</tr>`).join('');
  const headers = [...rows].sort((a, b) => b.date.localeCompare(a.date)).map(row => `<th>${periodDate(row.date)}</th>`).join('');
  return `${heading}<div class="financial-legend">${legend}</div><div class="financial-chart-wrap"><svg class="financial-chart" viewBox="0 0 800 285" role="img" aria-label="${statement.title} ${financialsPeriod} bar chart"><title>${statement.title} ${financialsPeriod} bar chart</title>${grid}<line class="financial-axis" x1="${left}" x2="${right}" y1="${zero}" y2="${zero}"/>${bars}</svg><div id="financials-tooltip" role="status" hidden></div></div><div class="financials-table-wrap"><table class="financials-table"><thead><tr><th>${periodLabel} period</th>${headers}</tr></thead><tbody>${tableRows}</tbody></table></div>`;
}
function modeledShortInterestHistory(shortInterest) {
  const cutoff = Date.now() - 100 * 86400000;
  const reports = (shortInterest.history || [])
    .filter(row => row.asOf && Number.isFinite(row.sharesShort) && Number.isFinite(row.percentOfFloat) && row.percentOfFloat > 0)
    .sort((a, b) => a.asOf.localeCompare(b.asOf));
  if (reports.length < 2) return { rows: [], reports, hasDailyFlow: false };
  const firstReportAt = Date.parse(`${reports[0].asOf}T12:00:00`);
  const start = new Date(Math.max(cutoff, firstReportAt));
  start.setHours(12, 0, 0, 0);
  // Official short-interest positions are delayed.  The daily modeled series
  // must therefore stop at the last completed U.S. trading day, matching the
  // timing convention used by estimate displays rather than presenting a
  // partial intraday value as today's short interest.
  const end = new Date();
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  const dailyFlowByDate = new Map((shortInterest.dailyShortVolume || [])
    .filter(row => row?.date && Number.isFinite(Number(row.shortVolume)) && Number.isFinite(Number(row.totalVolume)) && Number(row.totalVolume) > 0)
    .map(row => [row.date, { shortRatio: (Number(row.shortVolume) + Math.max(0, Number(row.shortExemptVolume) || 0)) / Number(row.totalVolume) }]));
  const allRatios = [...dailyFlowByDate.values()].map(row => row.shortRatio);
  const typicalShortRatio = allRatios.length ? allRatios.reduce((sum, value) => sum + value, 0) / allRatios.length : null;
  const reportFloat = row => row.sharesShort / row.percentOfFloat;
  const reportIndexForDate = date => reports.findIndex(row => row.asOf === date);
  const officialDailyRates = reports.slice(1).map((row, index) => {
    const previous = reports[index], days = Math.max(1, Math.round((Date.parse(`${row.asOf}T12:00:00`) - Date.parse(`${previous.asOf}T12:00:00`)) / 86400000));
    return Math.max(-0.015, Math.min(0.015, (row.sharesShort / previous.sharesShort - 1) / days));
  }).filter(Number.isFinite);
  const learnedDailyRate = officialDailyRates.length ? officialDailyRates.reduce((sum, value) => sum + value, 0) / officialDailyRates.length : 0;
  const history = [];
  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const date = day.toISOString().slice(0, 10);
    const officialIndex = reportIndexForDate(date);
    const priorIndex = reports.reduce((found, row, index) => row.asOf <= date ? index : found, -1);
    if (priorIndex < 0) continue;
    const prior = reports[priorIndex], next = reports[priorIndex + 1] || null;
    const flow = dailyFlowByDate.get(date)?.shortRatio;
    let shares = prior.sharesShort, floatShares = reportFloat(prior), estimated = false, modelType = 'official';
    if (officialIndex >= 0) {
      shares = reports[officialIndex].sharesShort;
      floatShares = reportFloat(reports[officialIndex]);
    } else if (next) {
      // Historical estimates are constrained by two known FINRA reports. The
      // daily flow signal adds shape but resolves to the official endpoint.
      const periodDays = Math.max(1, Math.round((Date.parse(`${next.asOf}T12:00:00`) - Date.parse(`${prior.asOf}T12:00:00`)) / 86400000));
      const elapsed = Math.max(0, Math.round((Date.parse(`${date}T12:00:00`) - Date.parse(`${prior.asOf}T12:00:00`)) / 86400000));
      const progress = Math.min(1, elapsed / periodDays);
      const periodDates = Array.from({ length: periodDays }, (_, index) => new Date(Date.parse(`${prior.asOf}T12:00:00`) + (index + 1) * 86400000).toISOString().slice(0, 10));
      const deviations = periodDates.map(periodDate => (dailyFlowByDate.get(periodDate)?.shortRatio ?? typicalShortRatio ?? 0) - (typicalShortRatio ?? 0));
      const cumulative = deviations.slice(0, Math.min(elapsed, deviations.length)).reduce((sum, value) => sum + value, 0);
      const total = deviations.reduce((sum, value) => sum + value, 0);
      const centeredFlow = cumulative - total * progress;
      const normalization = deviations.reduce((sum, value) => sum + Math.abs(value), 0) || 1;
      const base = prior.sharesShort + (next.sharesShort - prior.sharesShort) * progress;
      const overlay = Math.max(-0.025 * prior.sharesShort, Math.min(0.025 * prior.sharesShort, centeredFlow / normalization * Math.abs(next.sharesShort - prior.sharesShort || prior.sharesShort * .04)));
      shares = Math.max(0, base + overlay);
      floatShares = reportFloat(prior) + (reportFloat(next) - reportFloat(prior)) * progress;
      estimated = true;
      modelType = 'calibrated';
    } else {
      // The open interval cannot be validated until FINRA publishes its next
      // settlement report. Apply only a deliberately capped daily adjustment.
      const daysSinceReport = Math.max(0, Math.round((Date.parse(`${date}T12:00:00`) - Date.parse(`${prior.asOf}T12:00:00`)) / 86400000));
      const flowAdjustment = Number.isFinite(flow) && Number.isFinite(typicalShortRatio) ? Math.max(-0.003, Math.min(0.003, (flow - typicalShortRatio) * .04)) : 0;
      const dailyRate = Math.max(-0.01, Math.min(0.01, learnedDailyRate + flowAdjustment));
      shares = Math.max(0, prior.sharesShort * Math.pow(1 + dailyRate, daysSinceReport));
      estimated = true;
      modelType = allRatios.length ? 'provisional-model' : 'carry-forward';
    }
    history.push({ date, asOf: prior.asOf, sharesShort: shares, percentOfFloat: floatShares > 0 ? shares / floatShares : prior.percentOfFloat, estimated, modelType, hasDailyFlow: Number.isFinite(flow) });
  }
  return { rows: history, reports, hasDailyFlow: allRatios.length >= 5 };
}
function renderShortInterestChart(shortInterest) {
  const { rows: history, reports, hasDailyFlow } = modeledShortInterestHistory(shortInterest);
  if (reports.length < 2) return '<p class="earnings-empty">Historical short-float percentages are unavailable for this ticker. The chart will appear when the data provider supplies at least two reported values.</p>';
  if (history.length < 2) return '<p class="earnings-empty">Three months of short-interest history is not available for this ticker yet.</p>';
  const width = 1000, height = 500, left = 90, right = 900, top = 36, bottom = 406;
  const shortMax = Math.max(...history.map(row => row.sharesShort)) * 1.15;
  const floatMinData = Math.min(...history.map(row => row.percentOfFloat)), floatMaxData = Math.max(...history.map(row => row.percentOfFloat));
  const floatPad = Math.max(.002, (floatMaxData - floatMinData) * .18), floatMin = Math.max(0, floatMinData - floatPad), floatMax = floatMaxData + floatPad;
  const yShort = value => bottom - value / (shortMax || 1) * (bottom - top), yFloat = value => bottom - (value - floatMin) / (floatMax - floatMin || 1) * (bottom - top);
  const x = index => left + (right - left) * (index + .5) / history.length;
  const shares = value => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  const grid = Array.from({ length: 5 }, (_, index) => { const value = shortMax * index / 4, float = floatMin + (floatMax - floatMin) * index / 4, y = yShort(value); return `<line class="short-interest-grid" x1="${left}" x2="${right}" y1="${y}" y2="${y}"/><text class="short-interest-label" x="${left - 9}" y="${y + 4}" text-anchor="end">${shares(value)}</text><text class="short-interest-label" x="${right + 9}" y="${y + 4}">${(float * 100).toFixed(1)}%</text>`; }).join('');
  const barWidth = Math.min(38, (right - left) / history.length * .54);
  const bars = history.map((row, index) => { const barY = yShort(row.sharesShort); const kind = row.modelType === 'official' ? `Official FINRA report (${row.asOf})` : row.modelType === 'calibrated' ? `Historically calibrated estimate between ${row.asOf} and the next official report` : row.modelType === 'provisional-model' ? `Provisional FINRA-flow estimate after official ${row.asOf}` : `Carry-forward estimate from official ${row.asOf}`; const label = `${row.date} — ${kind}: ${shares(row.sharesShort)}; Short float: ${(row.percentOfFloat * 100).toFixed(2)}%`; return `<rect class="short-interest-bar${row.modelType === 'provisional-model' || row.modelType === 'carry-forward' ? ' short-interest-estimate-bar' : ''}" data-short-interest-index="${index}" x="${x(index) - barWidth / 2}" y="${barY}" width="${barWidth}" height="${bottom - barY}" role="button" tabindex="0" aria-label="${escape(label)}"></rect>`; }).join('');
  const line = history.map((row, index) => `${index ? 'L' : 'M'} ${x(index)} ${yFloat(row.percentOfFloat)}`).join(' ');
  const points = history.map((row, index) => `<circle class="short-float-point" cx="${x(index)}" cy="${yFloat(row.percentOfFloat)}" r="3"><title>${escape(`${row.date} — Short float: ${(row.percentOfFloat * 100).toFixed(2)}%`)}</title></circle>`).join('');
  const labelIndexes = [...new Set([0, Math.floor((history.length - 1) / 2), history.length - 1])];
  const dates = labelIndexes.map(index => `<text class="short-interest-label" x="${x(index)}" y="${bottom + 26}" text-anchor="middle">${escape(new Date(`${history[index].date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</text>`).join('');
  const note = hasDailyFlow
    ? 'Green history is reconstructed from official FINRA settlement reports and daily FINRA short-sale-volume flow. Gold bars are the current, unvalidated model estimate after the latest official report. FINRA daily short volume is not a net short-position measure; estimates are not used in the squeeze score.'
    : 'Daily FINRA short-sale-volume data was unavailable, so gold bars carry forward the latest official report. They are not used in the squeeze score.';
  return `<div class="short-interest-chart-wrap"><div class="short-interest-legend"><span><i class="short-interest-swatch"></i>Official / calibrated history</span><span><i class="short-interest-estimate-swatch"></i>Current modeled estimate</span><span><i class="short-float-swatch"></i>Short float</span></div><p class="short-interest-estimate-note">${note}</p><svg class="short-interest-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Three-month short-interest history: bars show shares short and line shows short float percentage"><title>Three-month short-interest history</title>${grid}<line class="short-interest-axis" x1="${left}" x2="${right}" y1="${bottom}" y2="${bottom}"/>${bars}<path class="short-float-line" d="${line}"/>${points}${dates}</svg></div>`;
}
function renderAnalystTargetScatter(targets, price) {
  const barclaysTarget = targets?.barclaysTarget;
  const points = [['Low', targets?.low], ['Median', targets?.median], ['Mean', targets?.mean], ['High', targets?.high], ['Barclays', barclaysTarget]].filter(([, value]) => Number.isFinite(value) && value > 0);
  if (!points.length) return '<p class="ratings-note analyst-target-empty">Published analyst price-target data is unavailable for this ticker.</p>';
  const currentPrice = Number(price);
  const values = points.map(([, value]) => value).concat(Number.isFinite(currentPrice) && currentPrice > 0 ? [currentPrice] : []);
  const rawMin = Math.min(...values), rawMax = Math.max(...values), padding = Math.max(1, (rawMax - rawMin || rawMax * .1) * .13);
  const minimum = Math.max(0, rawMin - padding), maximum = rawMax + padding;
  const width = 760, height = 210, left = 92, right = 715, top = 24, bottom = 157;
  const x = value => left + (value - minimum) / (maximum - minimum || 1) * (right - left);
  const ticks = Array.from({ length: 5 }, (_, index) => minimum + (maximum - minimum) * index / 4);
  const grid = ticks.map(value => `<line class="analyst-target-grid" x1="${x(value)}" x2="${x(value)}" y1="${top}" y2="${bottom}"/><text class="analyst-target-axis-label" x="${x(value)}" y="${bottom + 30}" text-anchor="middle">$${value.toFixed(0)}</text>`).join('');
  const yFor = index => top + 22 + index * ((bottom - top - 44) / Math.max(points.length - 1, 1));
  const pointMarks = points.map(([label, value], index) => { const tooltip = `${label} analyst price target: $${value.toFixed(2)}`, color = label.toLowerCase(); return `<text class="analyst-target-label" x="${left - 12}" y="${yFor(index) + 4}" text-anchor="end">${label}</text><circle class="analyst-target-point analyst-target-${color}" cx="${x(value)}" cy="${yFor(index)}" r="7"><title>${escape(tooltip)}</title></circle><text class="analyst-target-value" x="${x(value) + 12}" y="${yFor(index) + 4}">$${value.toFixed(2)}</text>`; }).join('');
  const priceMarker = Number.isFinite(currentPrice) && currentPrice > 0 ? `<line class="analyst-current-price" x1="${x(currentPrice)}" x2="${x(currentPrice)}" y1="${top}" y2="${bottom}"/><text class="analyst-current-price-label" x="${x(currentPrice)}" y="${top - 7}" text-anchor="middle">Current $${currentPrice.toFixed(2)}</text>` : '';
  const updated = targets?.updated ? ` Updated ${escape(targets.updated)}.` : '';
  const barclaysNote = Number.isFinite(barclaysTarget) && barclaysTarget > 0 ? '' : '<p class="ratings-note">Barclays price target unavailable.</p>';
  return `<section class="analyst-target-scatter"><div class="ratings-heading"><div><h3>Analyst price targets</h3><p>Published low, median, mean, and high targets.${updated}</p></div></div><div class="analyst-target-legend" aria-label="Target color key"><span><i class="analyst-target-low"></i>Low</span><span><i class="analyst-target-median"></i>Median</span><span><i class="analyst-target-mean"></i>Mean</span><span><i class="analyst-target-high"></i>High</span><span><i class="analyst-target-barclays"></i>Barclays</span><span><i class="analyst-target-current-key"></i>Current price</span></div><svg class="analyst-target-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Analyst price target scatter plot"><title>Analyst price target scatter plot</title>${grid}${priceMarker}${pointMarks}<line class="analyst-target-axis" x1="${left}" x2="${right}" y1="${bottom}" y2="${bottom}"/></svg>${barclaysNote}</section>`;
}
function getShortSqueezeAnalysis(dossier) {
  const engine = globalThis.ShortSqueeze;
  if (!engine || !dossier) return null;
  const shortInterest = dossier.marketSentiment?.shortInterest || {};
  const history = Array.isArray(shortInterest.history) ? shortInterest.history.filter(row => Number.isFinite(row?.percentOfFloat)).sort((a, b) => String(a.date || a.asOf).localeCompare(String(b.date || b.asOf))) : [];
  const previous = history.length > 1 ? history.at(-2)?.percentOfFloat : null;
  // Use daily OHLCV independent of the visible chart range. That keeps the
  // squeeze model's ATR, price structure, and relative volume on the same
  // daily basis whether the user is viewing 1 day, 1 month, or Max.
  const daily = chartData?.smaHistory?.v?.length ? chartData.smaHistory : chartData;
  const closes = daily?.c || [], highs = daily?.h || closes, lows = daily?.l || closes, volumes = daily?.v || [];
  const price = Number(String(dossier.price || closes.at(-1) || '').replace(/[^0-9.-]/g, '')) || closes.at(-1) || null;
  const recentVolumes = volumes.slice(-21, -1).filter(Number.isFinite);
  const relativeVolume = Number.isFinite(volumes.at(-1)) && recentVolumes.length ? volumes.at(-1) / (recentVolumes.reduce((sum, value) => sum + value, 0) / recentVolumes.length) : null;
  const provider = dossier.marketSentiment?.shortSqueeze || dossier.shortSqueezeProviderData || {};
  const ibkr = shortableSharesBySymbol[ticker] || {};
  const sharesAvailable = Number(ibkr.current?.sharesAvailable);
  const borrowFeeRate = Number(ibkr.feeCurrent?.feeRate);
  const feeDate = row => String(row?.sourceDate || row?.observedAt || '').slice(0, 10).replaceAll('-', '');
  const currentFeeDay = feeDate(ibkr.feeCurrent);
  // Compare IBKR's latest historical FEE_RATE bar with its immediately
  // preceding bar. The source dates are supplied by IBKR, so weekends and
  // market holidays are naturally skipped.
  const feeBaseline = (Array.isArray(ibkr.feeHistory) ? ibkr.feeHistory : [])
    .filter(row => {
      const rowDay = feeDate(row);
      return Number.isFinite(Number(row?.feeRate)) && /^\d{8}$/.test(rowDay) && rowDay < currentFeeDay;
    })
    .sort((a, b) => feeDate(b).localeCompare(feeDate(a)))[0] || null;
  const borrowFeeChange1d = Number.isFinite(borrowFeeRate) && Number.isFinite(Number(feeBaseline?.feeRate)) && Number(feeBaseline.feeRate) > 0
    ? (borrowFeeRate - Number(feeBaseline.feeRate)) / Number(feeBaseline.feeRate) * 100
    : null;
  const fingerprint = JSON.stringify({ price, short: [shortInterest.percentOfFloat, shortInterest.daysToCover, shortInterest.sharesShort, previous, history.at(-1)?.percentOfFloat], ibkr: [sharesAvailable, borrowFeeRate, ibkr.feeCurrent?.sourceDate, feeBaseline?.sourceDate], close: closes.slice(-80), high: highs.slice(-80), low: lows.slice(-80), volume: volumes.slice(-21), provider });
  const cached = shortSqueezeCache.get(ticker);
  if (cached?.fingerprint === fingerprint) return cached.analysis;
  const zone = engine.calculateAccelerationZone({ closes, highs, lows, callStrikes: provider.callStrikes || [] });
  const analysis = engine.analyze({ shortFloat: shortInterest.percentOfFloat, shortFloatChange: Number.isFinite(previous) && Number.isFinite(shortInterest.percentOfFloat) && previous ? (shortInterest.percentOfFloat - previous) / previous : null, daysToCover: shortInterest.daysToCover, sharesShort: shortInterest.sharesShort, sharesAvailable, borrowFeeRate, callOi: provider.callOi, putOi: provider.putOi, currentPrice: price, relativeVolume, zone });
  analysis.data.borrowFeeChange1d = borrowFeeChange1d;
  analysis.data.borrowFeePreviousEod = Number.isFinite(Number(feeBaseline?.feeRate)) ? Number(feeBaseline.feeRate) * 100 : null;
  analysis.data.borrowFeeBaselineAt = feeBaseline?.observedAt || null;
  shortSqueezeCache.set(ticker, { fingerprint, analysis });
  return analysis;
}
function squeezeInfo(label, definition) {
  return `<span class="squeeze-info" tabindex="0">${escape(label)}<i aria-hidden="true">?</i><span class="squeeze-tooltip" role="tooltip">${escape(definition)}</span></span>`;
}
function squeezeMetric(label, value, note = '', definition = '', valueDetail = '', className = '') { return `<div${className ? ` class="${escape(className)}"` : ''}><span>${squeezeInfo(label, definition || label)}</span><strong>${escape(value)}${valueDetail}</strong>${note ? `<small>${escape(note)}</small>` : ''}</div>`; }
function renderShortSqueezeAnalysis(dossier) {
  const analysis = getShortSqueezeAnalysis(dossier);
  if (!analysis) return '<section class="short-squeeze-analysis empty-state"><h3>Short squeeze analysis unavailable</h3><p>Price-chart data is still loading. Refresh market data and try again.</p></section>';
  const factors = analysis.factors || {}, data = analysis.data || {};
  const score = Number.isFinite(analysis.score) ? `${analysis.score}/100` : 'N/A';
  const percent = value => Number.isFinite(value) ? `${value.toFixed(2)}%` : 'N/A';
  const number = value => Number.isFinite(value) ? value.toFixed(2) : 'N/A';
  const scoreLevels = 'Score guide: 0-19 Very Low; 20-39 Low; 40-59 Moderate; 60-74 Elevated; 75-89 High; 90-100 Extreme.';
  const factorRows = [
    ['Short Crowding', factors.shortCrowding, 'Measures short float and its most recent reported change. Higher short float and a rising short-float trend raise this score.'],
    ['Exit Difficulty', factors.exitDifficulty, 'Uses days to cover: estimated trading days for reported short interest to be repurchased at average volume. Higher values raise this score.'],
    ['Borrow Pressure', factors.borrowPressure, 'Combines the current IBKR borrow fee and current shares available relative to reported shares short. Higher fees and fewer available shares raise this score. Both are broker-specific and can change quickly.'],
    ['Options Pressure', factors.optionsPressure, 'Uses current call open interest divided by put open interest from the public options chain. It is positioning context, not proof of a gamma squeeze.'],
    ['Technical Pressure', factors.technicalPressure, 'Measures how close price is to the calculated acceleration zone. A move into or through the zone raises this score.'],
    ['Relative Volume', factors.volume, 'Latest daily volume divided by the preceding 20 trading days average volume. More than 1x means above-average activity.']
  ].map(([label, value, definition]) => `<li><span>${squeezeInfo(label, `${definition} ${scoreLevels}`)}</span><strong>${Number.isFinite(value) ? `${Math.round(value)}/100` : 'N/A'}</strong></li>`).join('');
  const zone = analysis.zone ? `$${analysis.zone.low.toFixed(2)}-$${analysis.zone.high.toFixed(2)}` : 'N/A';
  const borrowFee = Number.isFinite(data.borrowFeeRate) ? `${data.borrowFeeRate.toFixed(2)}%` : 'N/A';
  const borrowFeeChange = Number.isFinite(data.borrowFeeChange1d)
    ? `<span class="borrow-fee-change ${data.borrowFeeChange1d > 0 ? 'ticker-gain' : data.borrowFeeChange1d < 0 ? 'ticker-loss' : 'neutral'}">(${data.borrowFeeChange1d >= 0 ? '+' : ''}${data.borrowFeeChange1d.toFixed(2)}%)</span>`
    : '<span class="borrow-fee-change neutral">(—)</span>';
  const borrowFeePreviousEod = Number.isFinite(data.borrowFeePreviousEod) ? `Previous EOD: ${data.borrowFeePreviousEod.toFixed(2)}%` : 'Previous EOD: N/A';
  const optionsRatio = Number.isFinite(data.callOi) && Number.isFinite(data.putOi) && data.putOi > 0 ? `${(data.callOi / data.putOi).toFixed(2)}x call/put OI` : 'N/A';
  const optionsNote = dossier.marketSentiment?.shortSqueeze?.optionsSource || 'N/A - public options-chain data unavailable for this ticker';
  const nextStep = analysis.status === 'Active Squeeze'
    ? 'Current price and daily-volume conditions meet this tool\'s confirmation rules. Verify a catalyst and fresh short data before treating this as actionable.'
    : analysis.status === 'Acceleration'
      ? 'The score is high and price is testing or moving through the acceleration zone. Sustained daily volume and a fresh catalyst would be needed for stronger confirmation.'
      : analysis.status === 'Ignition'
        ? 'Pressure is elevated, but price and volume confirmation is incomplete. A sustained move through the acceleration zone with expanding volume would improve confirmation.'
        : analysis.status === 'Pressure Building'
          ? 'Some crowding or technical pressure is present, but the full squeeze setup is incomplete. Watch short-float updates, volume expansion, and a defined catalyst.'
          : 'Available evidence does not show a confirmed squeeze setup. The score can change when fresh short-interest, IBKR lending, daily-chart, or options data changes.';
  return `<section class="short-squeeze-analysis"><div class="short-squeeze-heading"><div><h3>Short Squeeze Analysis</h3><p>Deterministic research score using reported short interest, live IBKR lending data, options, price, and daily volume.</p></div><div class="squeeze-score" title="Estimates current conditions that can contribute to short-squeeze pressure. ${scoreLevels}"><strong>${score}</strong><span>${escape(analysis.status)}</span></div></div><div class="squeeze-coverage"><span title="The share of weighted score factors that had usable data. Missing values are excluded rather than treated as zero.">Data coverage: <strong>${analysis.coverage}%</strong></span><span title="Confidence reflects data coverage: High 80%+, Medium 50-79%, Low below 50%.">Confidence: <strong>${escape(analysis.confidence)}</strong></span><span>Calculated from available sources only</span></div><div class="squeeze-metrics">${squeezeMetric('Short Float', percent(data.shortFloat), Number.isFinite(data.shortFloatChange) ? `${data.shortFloatChange >= 0 ? '+' : ''}${data.shortFloatChange.toFixed(1)}% vs prior report` : 'Trend N/A', 'Reported shares sold short divided by public float. The note compares the latest report with the prior report.')}${squeezeMetric('Days To Cover', number(data.daysToCover), '', 'Reported short interest divided by average daily trading volume: the estimated trading days needed for shorts to cover at average volume.')}${squeezeMetric('Relative Volume', Number.isFinite(data.relativeVolume) ? `${data.relativeVolume.toFixed(2)}x` : 'N/A', '', 'Latest daily volume divided by the previous 20 trading days average volume. More than 1x means above-average activity.')}${squeezeMetric('Options Pressure', optionsRatio, optionsNote, 'Current call open interest divided by put open interest across the nearest available option expirations. It is one positioning input, not proof of a gamma squeeze.')}${squeezeMetric('Borrow Fee', borrowFee, `${borrowFeePreviousEod} · ${Number.isFinite(data.sharesAvailable) ? `${Math.round(data.sharesAvailable).toLocaleString()} IBKR shares available` : 'IBKR availability N/A'}`, 'IBKR\'s latest published annualized borrow fee. The parenthetical value compares this fee with the latest available observation from the prior trading day. Higher fees and fewer shares available relative to reported shares short raise the separate Borrow Pressure score. It is broker-specific, can change quickly, and is not a guaranteed execution rate.', borrowFeeChange, 'borrow-fee-metric')}${squeezeMetric('Acceleration Zone', zone, analysis.zone ? 'Technical price structure' : 'Insufficient price structure', 'A price region where recent resistance and prior highs cluster. Current price is included in Technical Pressure; crossing the zone does not guarantee a squeeze.')}</div><div class="squeeze-factor-section"><h4>${squeezeInfo('Score Breakdown', `Each factor is normalized to 0-100 before weights are applied. ${scoreLevels}`)}</h4><ul>${factorRows}</ul></div><div class="squeeze-explanation"><h4>What would need to happen</h4><p>${nextStep}</p><h4>Disconfirming Conditions</h4><p>Short interest declines, borrow availability rises, borrow fee falls, volume fades, price rejects the zone, or no catalyst emerges.</p></div></section>`;
}
function shortableRelativeTime(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
function renderShortableSharesGraph(history = []) {
  const rows = history.slice().reverse().filter(row => Number.isFinite(Number(row?.sharesAvailable)) && row?.observedAt);
  if (!rows.length) return '<p class="shortable-empty">No availability history has been collected for this range yet.</p>';
  const width = 760, height = 270, left = 58, right = 18, top = 18, bottom = 42, plotWidth = width - left - right, plotHeight = height - top - bottom;
  const values = rows.map(row => Number(row.sharesAvailable));
  const max = Math.max(...values, 1), paddedMax = Math.ceil(max * 1.1 / 1000) * 1000 || 1;
  const x = index => left + (rows.length === 1 ? plotWidth / 2 : index / (rows.length - 1) * plotWidth);
  const y = value => top + plotHeight - value / paddedMax * plotHeight;
  const points = rows.map((row, index) => `${x(index).toFixed(1)},${y(Number(row.sharesAvailable)).toFixed(1)}`).join(' ');
  const labels = [0, .5, 1].map(ratio => ({ value: paddedMax * (1 - ratio), y: top + plotHeight * ratio }));
  const dateLabel = row => new Date(row.observedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const indices = [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])];
  const circles = rows.map((row, index) => `<circle class="shortable-graph-point" cx="${x(index).toFixed(1)}" cy="${y(Number(row.sharesAvailable)).toFixed(1)}" r="4"><title>${escape(new Date(row.observedAt).toLocaleString())}: ${Number(row.sharesAvailable).toLocaleString()} shares available</title></circle>`).join('');
  return `<div class="shortable-graph-wrap"><svg class="shortable-graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="IBKR shortable shares availability history"><g class="shortable-graph-grid">${labels.map(label => `<line x1="${left}" x2="${width - right}" y1="${label.y}" y2="${label.y}"/><text x="${left - 9}" y="${label.y + 4}" text-anchor="end">${Math.round(label.value).toLocaleString()}</text>`).join('')}</g><polyline class="shortable-graph-line" points="${points}"/>${circles}${indices.map(index => `<text class="shortable-graph-date" x="${x(index)}" y="${height - 12}" text-anchor="middle">${escape(dateLabel(rows[index]))}</text>`).join('')}</svg><p class="shortable-graph-hint">Hover a point for its local timestamp and shares available.</p></div>`;
}
function renderShortableShares(symbol) {
  const data = shortableSharesBySymbol[symbol];
  const ranges = [['today', 'Today'], ['5d', '5 Days'], ['1m', '1 Month'], ['3m', '3 Months'], ['all', 'All']];
  const filters = `<div class="shortable-controls"><div class="shortable-filters">${ranges.map(([value, label]) => `<button type="button" data-shortable-range="${value}" class="${shortableRange === value ? 'active' : ''}">${label}</button>`).join('')}</div><div class="shortable-display-toggle" aria-label="Shortable shares display"><button type="button" data-shortable-display="table" class="${shortableDisplay === 'table' ? 'active' : ''}">Table</button><button type="button" data-shortable-display="graph" class="${shortableDisplay === 'graph' ? 'active' : ''}">Graph</button></div></div>`;
  if (!data) return `<section class="shortable-shares-panel"><div class="shortable-heading"><div><h3>Shortable Shares Availability <span class="shortable-info" title="The number of shares Interactive Brokers currently reports as available to borrow for short selling. This represents IBKR's lending inventory and is not total market-wide short availability.">?</span></h3><p>IBKR securities-lending availability</p></div><span class="shortable-status status-offline">Loading</span></div>${filters}<p class="shortable-empty">Checking the local IBKR TWS / Gateway connection…</p></section>`;
  const current = data.current;
  const status = String(data.status || 'offline');
  const connection = data.connection || {};
  const statusLabel = status === 'live' ? 'Live' : status === 'reconnecting' ? 'Reconnecting' : status === 'gateway-timeout' ? 'Gateway Timeout' : status === 'unavailable' ? 'Unavailable' : 'Offline';
  const rows = (data.history || []).map((row, index, all) => {
    const prior = all[index + 1];
    const change = prior ? row.sharesAvailable - prior.sharesAvailable : null;
    return `<tr><td>${escape(shortableRelativeTime(row.observedAt))}</td><td>${escape(new Date(row.observedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }))}</td><td>${Number(row.sharesAvailable).toLocaleString()}</td><td class="${change > 0 ? 'ticker-gain' : change < 0 ? 'ticker-loss' : ''}">${change === null ? '—' : `${change >= 0 ? '+' : ''}${change.toLocaleString()}`}</td></tr>`;
  }).join('');
  const tableRows = (data.history || []).map((row, index, all) => {
    const prior = all[index + 1];
    const change = prior ? row.sharesAvailable - prior.sharesAvailable : null;
    return `<tr class="${index === 0 ? 'shortable-latest-row' : ''}"><td>${escape(shortableRelativeTime(row.observedAt))}</td><td>${escape(new Date(row.observedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }))}</td><td>${Number(row.sharesAvailable).toLocaleString()}</td><td class="${change > 0 ? 'ticker-gain' : change < 0 ? 'ticker-loss' : ''}">${change === null ? '—' : `${change >= 0 ? '+' : ''}${change.toLocaleString()}`}</td><td>IBKR</td></tr>`;
  }).join('');
  const connectionDetail = connection.detail || (status === 'offline' ? 'Start TWS or IB Gateway and enable API connections.' : 'Waiting for IBKR shortable-share data.');
  const emptyRow = `<tr><td colspan="5" class="shortable-empty-cell">No shortable-share value has been received. ${escape(connectionDetail)}</td></tr>`;
  const display = shortableDisplay === 'graph' ? renderShortableSharesGraph(data.history || []) : `<div class="shortable-table-wrap"><table><thead><tr><th>Time Since Update</th><th>Local Timestamp</th><th>Shares Available</th><th>Change</th><th>Source</th></tr></thead><tbody>${tableRows || emptyRow}</tbody></table></div>`;
  return `<section class="shortable-shares-panel"><div class="shortable-heading"><div><h3>Shortable Shares Availability <span class="shortable-info" title="The number of shares Interactive Brokers currently reports as available to borrow for short selling. This represents IBKR's lending inventory and is not total market-wide short availability.">?</span></h3><p>Live IBKR availability history. The latest reported value is highlighted.</p></div><span class="shortable-status status-${escape(status)}">${statusLabel}</span></div>${filters}${display}<p class="shortable-connection-detail">${escape(connectionDetail)}</p><small class="shortable-note">${escape(data.note || 'History begins when monitoring is enabled.')}</small></section>`;
  const currentValue = current && Number.isFinite(current.sharesAvailable) ? Number(current.sharesAvailable).toLocaleString() : '—';
  const timing = current?.observedAt ? `Last updated: ${shortableRelativeTime(current.observedAt)}` : status === 'offline' ? 'Start TWS or IB Gateway and enable API connections.' : 'Waiting for IBKR shortable-share data.';
  return `<section class="shortable-shares-panel"><div class="shortable-heading"><div><h3>Shortable Shares Availability <span class="shortable-info" title="The number of shares Interactive Brokers currently reports as available to borrow for short selling. This represents IBKR's lending inventory and is not total market-wide short availability.">?</span></h3><p>IBKR securities-lending availability</p></div><span class="shortable-status status-${escape(status)}">${statusLabel}</span></div><div class="shortable-current"><span>Shares Available to Short</span><strong>${currentValue}</strong><small>${escape(timing)} · Source: IBKR</small></div>${filters}${rows ? `<div class="shortable-table-wrap"><table><thead><tr><th>Time Since Last Change</th><th>Timestamp</th><th>Shares Available</th><th>Change</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="shortable-empty">Shortable-share availability is currently unavailable from IBKR. 0 shares is shown as 0 when IBKR reports it.</p>'}<small class="shortable-note">${escape(data.note || 'History begins when monitoring is enabled.')}</small></section>`;
}
async function refreshShortableShares(symbol) {
  try { shortableSharesBySymbol[symbol] = await window.portfolioApp.getShortableShares({ symbol, range: shortableRange }); if (section === 'short-interest' && ticker === symbol) renderContent(); } catch (error) { shortableSharesBySymbol[symbol] = { symbol, status: 'unavailable', history: [], current: null, note: error.message || 'IBKR data is unavailable.' }; if (section === 'short-interest' && ticker === symbol) renderContent(); }
}
function renderRatings(dossier, showShortInterest = false) {
  const analysts = dossier.marketSentiment?.analysts, shortInterest = dossier.marketSentiment?.shortInterest;
  const analystPanel = analysts ? (() => {
    const total = analysts.buy + analysts.hold + analysts.sell;
    const period = analysts.period ? new Date(`${analysts.period}T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Latest available';
    const barclaysRating = ['buy', 'hold', 'sell'].includes(analysts.barclays?.rating) ? analysts.barclays.rating : null;
    const rows = [['Buy', analysts.buy, 'ratings-buy', 'buy'], ['Hold', analysts.hold, 'ratings-hold', 'hold'], ['Sell', analysts.sell, 'ratings-sell', 'sell']].map(([label, value, style, rating]) => {
      const isBarclays = barclaysRating === rating && value > 0;
      const otherValue = Math.max(0, value - (isBarclays ? 1 : 0));
      const otherWidth = total ? otherValue / total * 100 : 0, barclaysWidth = isBarclays && total ? 100 / total : 0;
      return `<div class="rating-row"><span>${label}</span><div class="rating-track" aria-label="${label}: ${value} of ${total} analysts${isBarclays ? ', including Barclays' : ''}"><i class="${style}" style="width:${otherWidth}%"></i>${isBarclays ? `<i class="ratings-barclays" style="width:${barclaysWidth}%" title="Barclays ${label}"></i>` : ''}</div><strong>${value}</strong></div>`;
    }).join('');
    const currentPrice = Number(String(dossier.price || '').replace(/[^0-9.-]/g, ''));
    const barclaysSource = analysts.barclays?.source ? ` Source: ${analysts.barclays.source}.` : '';
    const barclaysNote = barclaysRating ? `Orange segment: Barclays ${barclaysRating[0].toUpperCase()}${barclaysRating.slice(1)}.${barclaysSource}` : analysts.barclays?.brokerConfirmed ? `Nasdaq confirms Barclays coverage; a current published Buy/Hold/Sell rating was not returned.${barclaysSource}` : `Barclays rating unavailable.${barclaysSource}`;
    return `<section class="ratings-panel"><div class="ratings-heading"><div><h3>Analyst consensus</h3><p>Latest recommendation trend (${escape(period)}).</p><span class="data-source">Source: Financial Modeling Prep and public analyst sources</span></div><strong>${total} analysts</strong></div><div class="rating-rows">${rows}</div><p class="ratings-note">Buy includes Strong Buy; Sell includes Strong Sell. ${barclaysNote}</p>${renderAnalystTargetScatter(analysts.priceTargets, currentPrice)}</section>`;
  })() : '<section class="ratings-panel empty-state"><h3>Analyst consensus unavailable</h3><p>Published analyst coverage is not currently supplied for this ticker. Try Refresh market data later.</p><span class="data-source">Source: Financial Modeling Prep and public analyst sources</span></section>';
  const shortPanel = shortInterest && [shortInterest.percentOfFloat, shortInterest.sharesShort, shortInterest.daysToCover].some(Number.isFinite) ? `<section class="ratings-panel short-interest-panel"><div class="ratings-heading"><div><h3>Short interest</h3><p>Latest available report.</p><span class="data-source">Source: Financial Modeling Prep</span></div></div>${renderShortInterestChart(shortInterest)}${renderShortSqueezeAnalysis(dossier)}${renderShortableShares(ticker)}</section>` : `<section class="ratings-panel empty-state"><h3>Short interest unavailable</h3><p>This provider does not currently publish usable short-interest data for this ticker.</p><span class="data-source">Source: Financial Modeling Prep</span>${renderShortSqueezeAnalysis(dossier)}${renderShortableShares(ticker)}</section>`;
  return showShortInterest ? shortPanel : analystPanel;
}
function renderResearchDesk(dossier) {
  const messages = Array.isArray(dossier.researchDeskHistory) ? dossier.researchDeskHistory : [];
  const loading = researchDeskLoadingTicker === ticker;
  const history = messages.length ? messages.map(message => {
    const role = message?.role === 'assistant' ? 'assistant' : 'user';
    const when = message?.createdAt ? new Date(message.createdAt) : null;
    const time = when && !Number.isNaN(when.getTime()) ? when.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
    return `<article class="research-desk-message ${role}"><header><strong>${role === 'assistant' ? 'Research Desk' : 'You'}</strong>${time ? `<time>${escape(time)}</time>` : ''}</header><div>${escape(message?.content || '').replace(/\n/g, '<br>')}</div></article>`;
  }).join('') : '<div class="research-desk-empty"><strong>Start a conversation about this stock.</strong><p>Ask about the company story, thesis, risks, earnings, competitors, or your saved notes.</p></div>';
  return `<section class="research-desk"><div class="research-desk-heading"><div><h3>Research Desk</h3><p>Private, saved AI conversation for ${escape(ticker)}. It uses this dashboard’s overview, market snapshot, and your notes as context.</p></div>${messages.length ? '<button id="research-desk-clear" type="button">Clear Chat</button>' : ''}</div><div id="research-desk-history" class="research-desk-history" aria-live="polite">${history}${loading ? '<div class="research-desk-thinking"><i></i> Research Desk is thinking…</div>' : ''}</div><form id="research-desk-form" class="research-desk-form"><label for="research-desk-input">Ask about ${escape(ticker)}</label><textarea id="research-desk-input" data-ticker="${escape(ticker)}" spellcheck="true" lang="en-US" placeholder="Ask anything about ${escape(ticker)}…" ${loading ? 'disabled' : ''}>${escape(researchDeskDrafts[ticker] || '')}</textarea><div><small>Research assistance only — answers identify unavailable current or source-backed information instead of making it up.</small><button type="submit" ${loading ? 'disabled' : ''}>${loading ? 'Thinking…' : 'Ask Research Desk'}</button></div></form></section>`;
}
function renderContent() {
  saveActiveNoteDraft();
  const d = holdings[ticker]; let html = '';
  if (section === 'thesis') html = `<div class="thesis-actions"><button id="refresh-thesis" type="button">Refresh</button><small>Regenerates this research using the latest company overview and your saved notes.</small></div>${d.thesis ? `<div class="thesis-grid"><article><h3>Bull thesis</h3><p>${escape(d.thesis.bullThesis)}</p></article><article><h3>Bear thesis</h3><p>${escape(d.thesis.bearThesis)}</p></article><article><h3>Evidence to watch</h3><p>${escape(d.thesis.evidenceToWatch)}</p></article><article><h3>Disconfirming signal</h3><p>${escape(d.thesis.disconfirmingSignal)}</p></article></div>` : table(['Thesis claim', 'Evidence to watch', 'Disconfirming signal'], d.claims)}`;
  if (section === 'earnings') html = renderEarningsHistory(d);
  if (section === 'financials') html = renderFinancials(d);
  if (section === 'ratings' || section === 'short-interest') html = renderRatings(d, section === 'short-interest');
  if (section === 'news') html = renderNews(d);
  if (section === 'notes') html = `<label for="new-note">New research note</label><textarea id="new-note" data-ticker="${escape(ticker)}" spellcheck="true" lang="en-US" placeholder="What changed your view? What evidence are you looking for?"></textarea><small class="note-spellcheck-help">Misspelled words are underlined. Right-click one for spelling suggestions.</small><button id="save-note">Add note</button><div>${d.notes.map((note, index) => { const noteKey = `${ticker}:${index}`, editing = editingNote?.ticker === ticker && editingNote?.index === index; return `<article class="note"><div class="note-heading"><time>${escape(note[0])}</time><div class="note-actions">${editing ? `<button type="button" data-save-note-edit="${index}">Save</button><button type="button" data-cancel-note-edit="${index}">Cancel</button>` : `<button type="button" data-edit-note="${index}">Edit</button><button type="button" class="delete-note" data-delete-note="${index}">Delete</button>`}</div></div>${editing ? `<textarea class="note-edit-textarea" data-note-editor data-ticker="${escape(ticker)}" data-note-index="${index}" spellcheck="true" lang="en-US">${escape(noteEditDrafts[noteKey] ?? note[1])}</textarea>` : `<div class="note-body">${escape(note[1])}</div>`}</article>`; }).join('')}</div>`;
  $('content').classList.toggle('news-content', section === 'news');
  $('content').innerHTML = html;
  renderEarningsDetailsSide();
  if (section === 'thesis') $('refresh-thesis').onclick = () => { if (thesisInProgress.has(ticker)) return; if (!d.aiOverview) { $('message').textContent = 'The company overview must finish loading before the thesis can be refreshed.'; return; } $('refresh-thesis').disabled = true; $('refresh-thesis').textContent = 'Refreshing…'; void updateThesis(ticker, true); };
  if (section === 'notes') {
    $('new-note').value = noteDrafts[ticker] || '';
    ['pointerdown', 'mousedown', 'click'].forEach(type => $('new-note').addEventListener(type, event => event.stopPropagation()));
    $('new-note').oninput = event => { noteDrafts[ticker] = event.target.value; };
    $('save-note').onclick = () => { const input = $('new-note'), value = input.value.trim(); if (!value) return; d.notes.unshift(['Today', value]); d.thesisGenerated = false; delete d.thesisGeneratedFrom; input.value = ''; noteDrafts[ticker] = ''; persist(); renderContent(); void updateThesis(ticker); };
    document.querySelectorAll('[data-edit-note]').forEach(button => button.onclick = () => { const index = Number(button.dataset.editNote); if (!Number.isInteger(index) || !d.notes[index]) return; editingNote = { ticker, index }; noteEditDrafts[`${ticker}:${index}`] = d.notes[index][1] || ''; renderContent(); requestAnimationFrame(() => document.querySelector(`[data-note-editor][data-note-index="${index}"]`)?.focus()); });
    document.querySelectorAll('[data-note-editor]').forEach(input => ['pointerdown', 'mousedown', 'click'].forEach(type => input.addEventListener(type, event => event.stopPropagation())));
    document.querySelectorAll('[data-note-editor]').forEach(input => input.oninput = event => { noteEditDrafts[`${ticker}:${event.target.dataset.noteIndex}`] = event.target.value; });
    document.querySelectorAll('[data-save-note-edit]').forEach(button => button.onclick = () => { const index = Number(button.dataset.saveNoteEdit), input = document.querySelector(`[data-note-editor][data-note-index="${index}"]`), value = input?.value.trim(); if (!Number.isInteger(index) || !d.notes[index] || !value) return; d.notes[index][1] = value; delete noteEditDrafts[`${ticker}:${index}`]; editingNote = null; d.thesisGenerated = false; delete d.thesisGeneratedFrom; persist(); renderContent(); void updateThesis(ticker); });
    document.querySelectorAll('[data-cancel-note-edit]').forEach(button => button.onclick = () => { const index = Number(button.dataset.cancelNoteEdit); delete noteEditDrafts[`${ticker}:${index}`]; editingNote = null; renderContent(); });
    document.querySelectorAll('[data-delete-note]').forEach(button => button.onclick = () => { const index = Number(button.dataset.deleteNote); if (!Number.isInteger(index) || !d.notes[index]) return; d.notes.splice(index, 1); d.thesisGenerated = false; delete d.thesisGeneratedFrom; persist(); renderContent(); void updateThesis(ticker); });
  }
  if (false) {
    const input = $('research-desk-input');
    const history = $('research-desk-history');
    if (history) requestAnimationFrame(() => { history.scrollTop = history.scrollHeight; });
    if (input) {
      ['pointerdown', 'mousedown', 'click'].forEach(type => input.addEventListener(type, event => event.stopPropagation()));
      input.oninput = event => { researchDeskDrafts[ticker] = event.target.value; };
    }
    $('research-desk-form').onsubmit = async event => {
      event.preventDefault();
      const symbol = ticker, dossier = holdings[symbol], question = input?.value.trim();
      if (!dossier || !question || researchDeskLoadingTicker) return;
      dossier.researchDeskHistory ||= [];
      dossier.researchDeskHistory.push({ role: 'user', content: question, createdAt: new Date().toISOString() });
      researchDeskDrafts[symbol] = '';
      researchDeskLoadingTicker = symbol;
      await persist();
      if (symbol === ticker && section === 'research-desk') renderContent();
      try {
        const notesText = (dossier.notes || []).map(note => `${note?.[0] || 'Undated'}: ${note?.[1] || ''}`.trim()).filter(Boolean).join('\n');
        const answer = await window.portfolioApp.stockResearchChat({
          symbol,
          companyName: dossier.name,
          overview: dossier.story || dossier.profileOverview || 'DATA UNAVAILABLE.',
          notesText,
          marketSnapshot: researchDeskSnapshot(dossier),
          conversation: dossier.researchDeskHistory.slice(-10),
          question
        });
        if (!holdings[symbol]) return;
        holdings[symbol].researchDeskHistory ||= [];
        holdings[symbol].researchDeskHistory.push({ role: 'assistant', content: answer, createdAt: new Date().toISOString() });
        await persist();
      } catch (error) {
        if (symbol === ticker) $('message').textContent = error.message || 'Research Desk could not answer that question.';
      } finally {
        if (researchDeskLoadingTicker === symbol) researchDeskLoadingTicker = null;
        if (symbol === ticker && section === 'research-desk') renderContent();
      }
    };
    if ($('research-desk-clear')) $('research-desk-clear').onclick = async () => {
      d.researchDeskHistory = [];
      researchDeskDrafts[ticker] = '';
      await persist();
      renderContent();
    };
  }
  if (section === 'earnings' && $('show-more-earnings')) $('show-more-earnings').onclick = () => { earningsVisible += 4; renderContent(); };
  document.querySelectorAll('[data-financials-view]').forEach(button => button.onclick = () => { financialsView = button.dataset.financialsView; renderContent(); });
  document.querySelectorAll('[data-financials-period]').forEach(button => button.onclick = () => { financialsPeriod = button.dataset.financialsPeriod; renderContent(); });
  if (section === 'financials') {
    const tooltip = $('financials-tooltip'), wrap = document.querySelector('.financial-chart-wrap');
    document.querySelectorAll('[data-financials-tooltip]').forEach(bar => {
      const show = event => { const bounds = wrap.getBoundingClientRect(); tooltip.textContent = bar.dataset.financialsTooltip; tooltip.hidden = false; tooltip.style.left = `${Math.min(Math.max(8, event.clientX - bounds.left + 12), Math.max(8, bounds.width - 200))}px`; tooltip.style.top = `${Math.max(6, event.clientY - bounds.top - 44)}px`; };
      bar.onmouseenter = show; bar.onmousemove = show; bar.onmouseleave = () => { tooltip.hidden = true; };
    });
  }
  if (section === 'short-interest') {
    document.querySelectorAll('[data-shortable-range]').forEach(button => button.onclick = () => { shortableRange = button.dataset.shortableRange; delete shortableSharesBySymbol[ticker]; renderContent(); void refreshShortableShares(ticker); });
    document.querySelectorAll('[data-shortable-display]').forEach(button => button.onclick = () => { shortableDisplay = button.dataset.shortableDisplay === 'graph' ? 'graph' : 'table'; renderContent(); });
    if (!shortableSharesBySymbol[ticker]) void refreshShortableShares(ticker);
    const wrap = document.querySelector('.short-interest-chart-wrap'), chart = document.querySelector('.short-interest-chart');
    const model = modeledShortInterestHistory(d.marketSentiment?.shortInterest || {});
    const modeledRows = model.rows;
    if (wrap && chart && modeledRows.length) {
      const tooltip = document.createElement('div');
      tooltip.id = 'short-interest-tooltip'; tooltip.hidden = true; tooltip.setAttribute('role', 'status'); wrap.append(tooltip);
      const show = (event, index) => {
        const bounds = wrap.getBoundingClientRect();
        const row = modeledRows[index];
        if (!row) return;
        const shares = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(row.sharesShort);
        const detail = row.modelType === 'official' ? `Official FINRA report (${row.asOf})` : row.modelType === 'calibrated' ? 'Calibrated estimate between official reports' : row.modelType === 'provisional-model' ? 'Current provisional FINRA-flow estimate' : 'Current carry-forward estimate';
        tooltip.textContent = `${row.date} — ${detail}: ${shares}; Short float: ${(row.percentOfFloat * 100).toFixed(2)}%`;
        tooltip.hidden = false; tooltip.style.left = `${Math.min(Math.max(8, event.clientX - bounds.left + 12), Math.max(8, bounds.width - 300))}px`; tooltip.style.top = `${Math.max(6, event.clientY - bounds.top - 42)}px`;
      };
      const select = (bar, event) => {
        document.querySelectorAll('.short-interest-bar.is-selected').forEach(item => item.classList.remove('is-selected'));
        bar.classList.add('is-selected');
        shortInterestSelectedBarByTicker[ticker] = Number(bar.dataset.shortInterestIndex);
        show(event, Number(bar.dataset.shortInterestIndex));
      };
      chart.onclick = event => {
        if (event.target !== chart) return;
        delete shortInterestSelectedBarByTicker[ticker];
        tooltip.hidden = true;
      };
      chart.querySelectorAll('[data-short-interest-index]').forEach(bar => {
        bar.onclick = event => { event.stopPropagation(); select(bar, event); };
        bar.onpointermove = event => { if (bar.classList.contains('is-selected')) show(event, Number(bar.dataset.shortInterestIndex)); };
        bar.onkeydown = event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault(); event.stopPropagation();
          const bounds = bar.getBoundingClientRect();
          select(bar, { clientX: bounds.left + bounds.width / 2, clientY: bounds.top + 8 });
        };
      });
      const savedIndex = shortInterestSelectedBarByTicker[ticker];
      const savedBar = Number.isInteger(savedIndex) ? chart.querySelector(`[data-short-interest-index="${savedIndex}"]`) : null;
      if (savedBar) {
        const bounds = savedBar.getBoundingClientRect();
        select(savedBar, { clientX: bounds.left + bounds.width / 2, clientY: bounds.top + 8 });
      } else if (Number.isInteger(savedIndex)) delete shortInterestSelectedBarByTicker[ticker];
    }
  }
  if (section === 'news' && $('show-more-news')) $('show-more-news').onclick = () => { newsVisible += 5; renderContent(); };
  if (section === 'earnings') {
    if ($('close-earnings-details')) $('close-earnings-details').onclick = () => { activeEarningsDetail = null; renderContent(); };
    document.querySelectorAll('[data-earnings-details]').forEach(button => button.onclick = async () => {
      const reportDate = button.dataset.earningsDetails;
      activeEarningsDetail = { ticker, reportDate };
      d.earningsDetails ||= {};
      if (d.earningsDetails[reportDate]?.detailVersion === 40 || d.earningsDetails[reportDate]?.loading) { renderContent(); return; }
      d.earningsDetails[reportDate] = { loading: true };
      renderContent();
      try {
        d.earningsDetails[reportDate] = await window.portfolioApp.earningsDocuments({ symbol: ticker, companyName: d.name, reportDate, investorRelationsUrl: d.investorRelationsUrl });
        await persist();
      } catch (error) {
        d.earningsDetails[reportDate] = { error: error.message || 'Could not load this earnings report.' };
      }
      if (activeEarningsDetail?.ticker === ticker && activeEarningsDetail?.reportDate === reportDate) renderContent();
    });
    const tooltip = $('earnings-tooltip'), wrap = document.querySelector('.earnings-chart-wrap');
    document.querySelectorAll('[data-earnings-tooltip]').forEach(mark => {
      const show = event => { const bounds = wrap.getBoundingClientRect(); tooltip.textContent = mark.dataset.earningsTooltip; tooltip.hidden = false; tooltip.style.left = `${Math.min(Math.max(8, event.clientX - bounds.left + 12), Math.max(8, bounds.width - 190))}px`; tooltip.style.top = `${Math.max(6, event.clientY - bounds.top - 44)}px`; };
      mark.onmouseenter = show; mark.onmousemove = show; mark.onmouseleave = () => { tooltip.hidden = true; };
    });
  }
  if (section === 'news') completePendingNewsAnalysis(ticker);
}
function renderEarningsHistory(dossier) {
  const actuals = dossier.earningsHistory?.actuals || [], upcoming = dossier.earningsHistory?.upcoming;
  if (!actuals.length && !upcoming) return '<div class="empty-state"><h3>Earnings data is unavailable</h3><p>Refresh market data to try again. Some tickers do not have reported earnings history from the current provider.</p><span class="data-source">Source: Financial Modeling Prep</span></div>';
  const reportedActuals = actuals.filter(item => Number.isFinite(item.epsActual) || Number.isFinite(item.revenueActual));
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const pendingToday = actuals.find(item => item.date === today && !Number.isFinite(item.epsActual) && !Number.isFinite(item.revenueActual));
  const chartActuals = [...reportedActuals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).reverse();
  const records = chartActuals.map(item => ({ ...item, upcoming: false })).concat(upcoming ? [{ ...upcoming, epsActual: null, revenueActual: null, upcoming: true }] : []);
  const formatRevenue = value => Number.isFinite(value) ? (Math.abs(value) >= 1e9 ? `$${(value / 1e9).toFixed(2)}B` : `$${(value / 1e6).toFixed(2)}M`) : '—';
  const formatEps = value => Number.isFinite(value) ? `$${value.toFixed(2)}` : '—';
  const left = 70, right = 830, top = 24, bottom = 260, labelY = 305, width = 900, height = 330;
  const revenueValues = records.flatMap(item => [item.revenueActual, item.revenueForecast]).filter(Number.isFinite), epsValues = records.flatMap(item => [item.epsActual, item.epsForecast]).filter(Number.isFinite);
  const revenueDataMax = Math.max(...revenueValues, 1), revenueMax = revenueDataMax * 1.2, epsDataMin = Math.min(0, ...epsValues), epsDataMax = Math.max(0, ...epsValues), epsPadding = Math.max(.1, (epsDataMax - epsDataMin) * .2), epsMin = epsDataMin, epsMax = epsDataMax + epsPadding, epsSpan = Math.max(1, epsMax - epsMin);
  const chartLeft = left + 30, chartRight = right - 30;
  const xFor = index => chartLeft + index * (chartRight - chartLeft) / Math.max(records.length - 1, 1), revenueY = value => bottom - value / revenueMax * (bottom - top), epsY = value => top + (epsMax - value) / epsSpan * (bottom - top), epsZero = epsY(0);
  const gridFractions = [0, .2, .4, .6, .8, 1];
  const revenueGrid = gridFractions.map(fraction => { const value = revenueMax * fraction, y = revenueY(value); return `<line class="earnings-grid" x1="${left}" y1="${y}" x2="${right}" y2="${y}"/><text class="earnings-axis-label" x="4" y="${y + 4}">${escape(formatRevenue(value))}</text>`; }).join('');
  const epsLabels = gridFractions.map(fraction => { const value = epsMax - (epsSpan * fraction), y = epsY(value); return `<text class="earnings-axis-label" x="${right + 8}" y="${y + 4}">${escape(formatEps(value))}</text>`; }).join('');
  const bars = records.map((item, index) => { const x = xFor(index), revenueHeight = Number.isFinite(item.revenueActual) ? bottom - revenueY(item.revenueActual) : 0, epsActualY = Number.isFinite(item.epsActual) ? epsY(item.epsActual) : epsZero, positiveEps = item.epsActual >= 0, epsTop = positiveEps ? epsActualY : epsZero, epsHeight = Number.isFinite(item.epsActual) ? Math.max(0, positiveEps ? bottom - epsActualY : epsActualY - epsZero) : 0, dateLabel = new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); return `${Number.isFinite(item.revenueActual) ? `<rect class="earnings-revenue" data-earnings-tooltip="${escape(`${dateLabel} — Revenue actual: ${formatRevenue(item.revenueActual)}`)}" x="${x - 15}" y="${bottom - revenueHeight}" width="12" height="${revenueHeight}"/>` : ''}${Number.isFinite(item.epsActual) ? `<rect class="earnings-eps" data-earnings-tooltip="${escape(`${dateLabel} — EPS actual: ${formatEps(item.epsActual)}`)}" x="${x + 3}" y="${epsTop}" width="12" height="${epsHeight}"/>` : ''}`; }).join('');
  const forecasts = records.map((item, index) => { if (!item.upcoming) return ''; const x = xFor(index), dateLabel = new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); return `${Number.isFinite(item.revenueForecast) ? `<line class="earnings-forecast" data-earnings-tooltip="${escape(`${dateLabel} — Revenue forecast: ${formatRevenue(item.revenueForecast)}`)}" x1="${x - 16}" y1="${revenueY(item.revenueForecast)}" x2="${x - 2}" y2="${revenueY(item.revenueForecast)}"/>` : ''}${Number.isFinite(item.epsForecast) ? `<line class="earnings-forecast" data-earnings-tooltip="${escape(`${dateLabel} — EPS forecast: ${formatEps(item.epsForecast)}`)}" x1="${x + 2}" y1="${epsY(item.epsForecast)}" x2="${x + 16}" y2="${epsY(item.epsForecast)}"/>` : ''}`; }).join('');
  const dates = records.map((item, index) => `<text class="earnings-date" x="${xFor(index)}" y="${labelY}" text-anchor="middle">${escape(new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }))}</text>`).join('');
  const chart = `<div class="earnings-chart-wrap" style="position:relative"><div class="earnings-legend"><span><i class="legend-revenue"></i>Revenue actual</span><span><i class="legend-eps"></i>EPS actual</span><span><i class="legend-forecast"></i>Upcoming forecast</span></div><svg class="earnings-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Four most recent reported quarters plus the next earnings forecast; revenue uses the left axis and EPS uses the right axis">${revenueGrid}<line class="earnings-axis" x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}"/>${epsLabels}${bars}${forecasts}${dates}</svg><div id="earnings-tooltip" role="status" hidden style="position:absolute;z-index:2;pointer-events:none;background:#242428;color:#fff;border:1px solid #555560;border-radius:6px;padding:7px 9px;font-size:12px;line-height:1.35;white-space:nowrap"></div></div>`;
  // Keep the first three columns identical in both tables. The reserved final
  // column aligns forecast EPS and revenue with the reported-earnings values.
  const forecastTable = upcoming ? `<h3>Upcoming earnings forecast</h3><div class="earnings-table-wrap"><table><colgroup><col style="width:35%"><col style="width:27%"><col style="width:28%"><col style="width:10%"></colgroup><thead><tr><th>Expected report date</th><th>EPS forecast</th><th>Revenue forecast</th><th aria-hidden="true"></th></tr></thead><tbody><tr><td>${escape(upcoming.date)}</td><td>${escape(formatEps(upcoming.epsForecast))}</td><td>${escape(formatRevenue(upcoming.revenueForecast))}</td><td aria-hidden="true"></td></tr></tbody></table></div>` : '<h3>Upcoming earnings forecast</h3><p class="earnings-empty">No upcoming forecast is currently available.</p>';
  const pendingRelease = pendingToday ? `<p class="earnings-empty">Today's earnings release is awaiting reported EPS and revenue.</p>` : '';
  const newestActuals = [...reportedActuals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, earningsVisible), tableRows = newestActuals.map(item => {
    const selected = activeEarningsDetail?.ticker === ticker && activeEarningsDetail?.reportDate === item.date;
    return `<tr><td>${escape(item.date)}</td><td>${escape(formatEps(item.epsActual))}</td><td>${escape(formatRevenue(item.revenueActual))}</td><td class="earnings-detail-cell"><button type="button" class="earnings-detail-button ${selected ? 'active' : ''}" data-earnings-details="${escape(item.date)}" aria-label="Open ${escape(item.date)} earnings details" aria-pressed="${selected}">→</button></td></tr>`;
  }).join('');
  const more = reportedActuals.length > earningsVisible ? '<button id="show-more-earnings" type="button">Show more</button>' : '';
  return `<span class="data-source earnings-source">Source: Financial Modeling Prep</span>${chart}${pendingRelease}${forecastTable}<h3>Reported earnings</h3><div class="earnings-table-wrap"><table><colgroup><col style="width:35%"><col style="width:27%"><col style="width:28%"><col style="width:10%"></colgroup><thead><tr><th>Report date</th><th>EPS actual</th><th>Revenue actual</th><th aria-label="Details"></th></tr></thead><tbody>${tableRows}</tbody></table>${more}</div>`;
}
function formatEarningsSummary(summary) {
  if (/to help me|could you tell|what is the context|what are you trying|are there any particular questions|\?/i.test(String(summary || ''))) return '<p>Source details are unavailable for factual highlights.</p>';
  const prepared = String(summary || '').replace(/\r/g, '').replace(/\*\*\s*(\d+\.[^*]+?)\s*\*\*/g, '\n$1\n').replace(/\s+(?=\*\*[^*\n]{1,80}:\*\*)/g, '\n').trim();
  if (/^SOURCE DETAILS UNAVAILABLE\.?$/i.test(prepared)) return '<p>Source details are unavailable for a factual summary.</p>';
  return prepared.split(/\n+/).map(line => line.trim()).filter(line => line && !/^(okay[,.!]?|here(?:'s| is) |below is |this is a breakdown|the following is )/i.test(line) && !/\b(likely|possibly|appears to|seems to)\b/i.test(line)).map(line => {
    const heading = line.replace(/:$/, '');
    if (/^(?:\d+\.\s+)?(?:OVERVIEW|KEY RESULTS|BUSINESS DRIVERS|OUTLOOK AND RISKS|HIGHLIGHTS|GUIDANCE)$/i.test(heading) || /^\d+\.\s+/.test(heading)) return `<h4>${escape(heading)}</h4>`;
    const bullet = line.replace(/^[-•]\s*/, '');
    const content = escape(bullet).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*+/g, ' ').replace(/ {2,}/g, ' ');
    return `<p class="${line.startsWith('-') || line.startsWith('•') ? 'earnings-summary-bullet' : ''}">${content}</p>`;
  }).join('');
}
function renderEarningsDetails(dossier) {
  const date = activeEarningsDetail?.ticker === ticker ? activeEarningsDetail.reportDate : null, detail = date && dossier.earningsDetails?.[date];
  if (!date || !detail) return '';
  if (detail.loading) return `<section class="earnings-detail-panel" aria-live="polite"><div><h3>Earnings documents — ${escape(date)}</h3><p>Loading available links…</p></div></section>`;
  if (detail.error) return `<section class="earnings-detail-panel" aria-live="polite"><div><h3>Earnings details — ${escape(date)}</h3><p>${escape(detail.error)}</p></div></section>`;
  const filingLink = detail.filing ? `<a href="${escape(detail.filing.url)}" target="_blank" rel="noreferrer">10-Q filing</a>` : '<span>10-Q filing unavailable.</span>';
  const foreignNotice = detail.foreignIssuerForm ? `<p class="foreign-filing-note">Foreign issuer — this company reports on ${escape(detail.foreignIssuerForm)} rather than Form 10-Q.</p>` : '';
  const pressReleaseLink = detail.pressRelease ? `<a href="${escape(detail.pressRelease.url)}" target="_blank" rel="noreferrer">Official earnings press release</a>` : '<span>Official earnings press release unavailable.</span>';
  const investorRelationsLink = detail.investorRelationsUrl ? `<a href="${escape(detail.investorRelationsUrl)}" target="_blank" rel="noreferrer">Investor Relations site</a>` : '<span>Investor Relations site unavailable.</span>';
  return `<section class="earnings-detail-panel"><div class="earnings-detail-heading"><h3>Earnings documents — ${escape(date)}</h3><button id="close-earnings-details" type="button" aria-label="Close earnings documents">×</button></div>${foreignNotice}<div class="earnings-document-links">${filingLink}${pressReleaseLink}${investorRelationsLink}</div></section>`;
}
function renderEarningsDetailsSide() {
  const side = $('earnings-details-side');
  const details = section === 'earnings' ? renderEarningsDetails(holdings[ticker]) : '';
  side.hidden = !details;
  side.innerHTML = details;
  // The document panel belongs beside the report row that opened it, not at
  // the top of the Trending rail. Position it after both columns have laid out.
  requestAnimationFrame(() => {
    if (side.hidden || !activeEarningsDetail) { side.style.transform = ''; return; }
    const trigger = document.querySelector(`[data-earnings-details="${activeEarningsDetail.reportDate}"]`);
    if (!trigger) { side.style.transform = ''; return; }
    side.style.transform = 'none';
    side.style.transform = `translateY(${Math.round(trigger.getBoundingClientRect().top - side.getBoundingClientRect().top)}px)`;
  });
}
function showSearchTicker(symbol, name) {
  const normalized = symbol.toUpperCase();
  for (const [key, dossier] of Object.entries(holdings)) if (dossier.isSearchResult && key !== normalized) delete holdings[key];
  if (!holdings[normalized]) holdings[normalized] = newDossier(name, true);
  ticker = normalized; redditPostView = null; section = 'thesis'; chartData = null; chartError = null;
  $('ticker-search-results').innerHTML = '';
  $('message').textContent = holdings[normalized].isSearchResult ? 'Viewing search result. Add it when you want to keep it in your portfolio.' : 'This ticker is already in your portfolio.';
  render();
  void refreshMarketData();
}
function clearTickerSearchInputs() {
  clearTimeout(tickerSuggestionTimer);
  tickerSuggestionRequest += 1;
  $('ticker-input').value = '';
  $('company-input').value = '';
  $('ticker-search-results').innerHTML = '';
}
let tickerSuggestionTimer = null, tickerSuggestionRequest = 0;
function showTickerSuggestions(results) {
  $('ticker-search-results').innerHTML = results.slice(0, 7).map((result, index) => `<button type="button" data-ticker-suggestion="${index}"><strong>${escape(result.symbol)}</strong><span>${escape(result.name)}</span></button>`).join('');
  document.querySelectorAll('[data-ticker-suggestion]').forEach(button => button.onclick = () => {
    const result = results[Number(button.dataset.tickerSuggestion)];
    if (!result) return;
    clearTickerSearchInputs();
    showSearchTicker(result.symbol, result.name);
  });
}
function queueTickerSuggestions() {
  clearTimeout(tickerSuggestionTimer);
  const query = ($('company-input').value.trim() || $('ticker-input').value.trim());
  const request = ++tickerSuggestionRequest;
  if (!query) { $('ticker-search-results').innerHTML = ''; return; }
  tickerSuggestionTimer = setTimeout(async () => {
    try {
      const results = await window.portfolioApp.searchTickers(query);
      if (request !== tickerSuggestionRequest) return;
      showTickerSuggestions(results || []);
    } catch {
      if (request === tickerSuggestionRequest) $('ticker-search-results').innerHTML = '';
    }
  }, 250);
}
['ticker-input', 'company-input'].forEach(id => {
  $(id).oninput = queueTickerSuggestions;
  $(id).onfocus = () => { if ($(id).value.trim()) queueTickerSuggestions(); };
});
$('ticker-search-form').onsubmit = async event => {
  event.preventDefault();
  const tickerQuery = $('ticker-input').value.trim(), companyQuery = $('company-input').value.trim(), query = companyQuery || tickerQuery;
  if (!query) { $('message').textContent = 'Enter a ticker or company name to search.'; return; }
  $('message').textContent = 'Searching…';
  try {
    const results = await window.portfolioApp.searchTickers(query);
    if (!results.length) { $('ticker-search-results').innerHTML = ''; $('message').textContent = 'No matching stock tickers were found.'; return; }
    const exact = results.find(result => result.symbol.toUpperCase() === tickerQuery.toUpperCase());
    if (exact) { clearTickerSearchInputs(); showSearchTicker(exact.symbol, exact.name); return; }
    $('message').textContent = 'Choose a company from the matches below.';
    clearTickerSearchInputs();
    $('ticker-search-results').innerHTML = results.map((result, index) => `<button type="button" data-search-result="${index}"><strong>${escape(result.symbol)}</strong><span>${escape(result.name)}</span></button>`).join('');
    document.querySelectorAll('[data-search-result]').forEach(button => button.onclick = () => { const result = results[Number(button.dataset.searchResult)]; showSearchTicker(result.symbol, result.name); });
  } catch (error) { $('ticker-search-results').innerHTML = ''; $('message').textContent = error.message || 'Could not search for that ticker.'; }
};
let destinationModalForListCreation = false;
function closeAddDestinationModal() { $('add-destination-modal').hidden = true; destinationModalForListCreation = false; }
function renderDestinationOptions() {
  const dossier = holdings[ticker];
  if (!dossier) return;
  const query = $('destination-list-filter').value.trim().toLowerCase();
  const destinations = [
    { id: 'tickers', name: 'Tickers', active: isTickerEntry(dossier) },
    { id: 'watchlist', name: 'Watchlist', active: isWatchlistEntry(dossier) },
    ...customLists().map(list => ({ id: list.id, name: list.name, active: isCustomListEntry(dossier, list.id) }))
  ].filter(item => !query || item.name.toLowerCase().includes(query));
  $('add-destination-list-options').innerHTML = destinations.map(item => `<button type="button" class="destination-list-option ${item.active ? 'active' : ''}" data-destination-list="${escape(item.id)}" aria-pressed="${item.active}"><span>${escape(item.name)}</span><small>${item.active ? 'Added' : 'Add'}</small></button>`).join('') || '<p class="watchlist-empty">No matching lists.</p>';
  document.querySelectorAll('[data-destination-list]').forEach(button => button.onclick = () => { void toggleDestination(button.dataset.destinationList); });
}
function updateDestinationModal() {
  const dossier = holdings[ticker];
  if (!ticker || !dossier) { closeAddDestinationModal(); return; }
  destinationModalForListCreation = false;
  $('add-destination-title').textContent = `Manage ${ticker}`;
  $('add-destination-description').textContent = 'Add or remove this stock from any list.';
  $('destination-list-filter').hidden = false;
  $('add-destination-list-options').hidden = false;
  renderDestinationOptions();
}
function openCreateListModal() {
  destinationModalForListCreation = true;
  $('add-destination-title').textContent = 'Create list';
  $('add-destination-description').textContent = 'Create a category for stocks you want to track.';
  $('destination-list-filter').hidden = true;
  $('add-destination-list-options').hidden = true;
  $('destination-new-list-name').value = '';
  $('add-destination-modal').hidden = false;
  requestAnimationFrame(() => $('destination-new-list-name').focus());
}
async function toggleDestination(destination) {
  const symbol = ticker, dossier = holdings[symbol];
  if (!symbol || !dossier) return;
  const active = destination === 'tickers' ? isTickerEntry(dossier) : destination === 'watchlist' ? isWatchlistEntry(dossier) : isCustomListEntry(dossier, destination);
  if (destination === 'tickers') dossier.inTickers = !active;
  else if (destination === 'watchlist') {
    dossier.inWatchlist = !active;
    // A newly searched stock added only to Watchlist must not inherit the legacy
    // default of appearing in Tickers as well.
    if (!active && dossier.inTickers === undefined) dossier.inTickers = false;
  } else {
    dossier.customLists = Array.isArray(dossier.customLists) ? dossier.customLists : [];
    dossier.customLists = active ? dossier.customLists.filter(id => id !== destination) : [...new Set([...dossier.customLists, destination])];
    if (!active && dossier.inTickers === undefined) dossier.inTickers = false;
  }
  if (!active) {
    delete dossier.isSearchResult;
    const archivedRecord = settings.noteArchive?.[symbol];
    const archivedNotes = archivedRecord?.notes;
    if (Array.isArray(archivedNotes) && archivedNotes.length) dossier.notes = structuredClone(archivedNotes);
  }
  if (!isTickerEntry(dossier) && !isWatchlistEntry(dossier) && !dossier.customLists?.length) {
    settings.noteArchive ||= {};
    settings.noteArchive[symbol] = { notes: structuredClone(dossier.notes || []), archivedAt: new Date().toISOString() };
    delete holdings[symbol];
    ticker = Object.keys(holdings).find(key => !holdings[key]?.isSearchResult) || null;
    closeAddDestinationModal();
  }
  await Promise.all([persist(), window.portfolioApp.saveSettings(settings)]);
  $('message').textContent = active ? `${symbol} was removed from ${listDisplayName(destination)}.` : `${symbol} was added to ${listDisplayName(destination)}.`;
  render();
  updateDestinationModal();
}
async function createCustomList() {
  const input = $('destination-new-list-name'), name = input.value.trim();
  if (!name) { $('message').textContent = 'Enter a name for the new list.'; input.focus(); return; }
  if (customLists().some(list => list.name.toLowerCase() === name.toLowerCase())) { $('message').textContent = 'A list with that name already exists.'; input.select(); return; }
  const list = { id: `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, sort: 'change', collapsed: true };
  settings.customLists = [...customLists(), list];
  if (!destinationModalForListCreation && ticker && holdings[ticker]) {
    const dossier = holdings[ticker];
    dossier.customLists = [...new Set([...(dossier.customLists || []), list.id])];
    if (dossier.inTickers === undefined) dossier.inTickers = false;
    delete dossier.isSearchResult;
  }
  await Promise.all([persist(), window.portfolioApp.saveSettings(settings)]);
  $('message').textContent = destinationModalForListCreation ? `${name} was created.` : `${ticker} was added to ${name}.`;
  const wasCreateOnly = destinationModalForListCreation;
  render();
  if (wasCreateOnly) closeAddDestinationModal(); else updateDestinationModal();
}
$('add-ticker').onclick = () => {
  const dossier = holdings[ticker];
  if (!ticker || !dossier) return;
  updateDestinationModal();
  $('add-destination-modal').hidden = false;
};
$('create-list').onclick = openCreateListModal;
$('destination-list-filter').oninput = renderDestinationOptions;
$('destination-create-list').onclick = () => { void createCustomList(); };
$('destination-new-list-name').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); void createCustomList(); } };
$('add-destination-cancel').onclick = closeAddDestinationModal;
$('add-destination-modal').onclick = event => { if (event.target === $('add-destination-modal')) closeAddDestinationModal(); };
function findSupportResistance(closes, highs, lows) {
  if (closes.length < 12) return [];
  const highValues = closes.map((close, index) => Number.isFinite(highs[index]) ? highs[index] : close);
  const lowValues = closes.map((close, index) => Number.isFinite(lows[index]) ? lows[index] : close);
  const overallHigh = Math.max(...highValues), overallLow = Math.min(...lowValues), span = Math.max(overallHigh - overallLow, overallHigh * .01);
  const pivotRadius = Math.max(2, Math.min(5, Math.floor(closes.length / 55)));
  const moveThreshold = span * .055, clusterThreshold = Math.max(span * .018, closes.at(-1) * .004);
  const pivots = [];
  for (let index = pivotRadius; index < closes.length - pivotRadius; index += 1) {
    const high = highValues[index], low = lowValues[index];
    const windowHigh = Math.max(...highValues.slice(index - pivotRadius, index + pivotRadius + 1));
    const windowLow = Math.min(...lowValues.slice(index - pivotRadius, index + pivotRadius + 1));
    const futureHigh = Math.max(...highValues.slice(index + 1, Math.min(closes.length, index + 15)));
    const futureLow = Math.min(...lowValues.slice(index + 1, Math.min(closes.length, index + 15)));
    if (high === windowHigh && high - futureLow >= moveThreshold) pivots.push({ value: high, kind: 'high', strength: (high - futureLow) / span });
    if (low === windowLow && futureHigh - low >= moveThreshold) pivots.push({ value: low, kind: 'low', strength: (futureHigh - low) / span });
  }
  const clusters = [];
  for (const pivot of pivots.sort((a, b) => a.value - b.value)) {
    const cluster = clusters.find(item => Math.abs(item.value - pivot.value) <= clusterThreshold);
    if (cluster) {
      cluster.value = (cluster.value * cluster.hits + pivot.value) / (cluster.hits + 1);
      cluster.hits += 1; cluster.strength += pivot.strength;
    } else clusters.push({ value: pivot.value, hits: 1, strength: pivot.strength });
  }
  const current = closes.at(-1);
  const classified = clusters.map(level => ({ ...level, kind: level.value <= current ? 'support' : 'resistance', score: level.hits * 2 + level.strength }));
  const ranked = classified.filter(level => level.hits >= 2 || level.strength >= .18).sort((a, b) => b.score - a.score);
  const selected = [];
  for (const kind of ['support', 'resistance']) {
    const strongest = ranked.filter(level => level.kind === kind);
    const fallback = classified.filter(level => level.kind === kind).sort((a, b) => b.score - a.score);
    const levels = [...strongest];
    for (const candidate of fallback) {
      if (levels.length >= 3) break;
      if (!levels.some(level => Math.abs(level.value - candidate.value) < clusterThreshold / 2)) levels.push(candidate);
    }
    selected.push(...levels.slice(0, 3));
  }
  return selected.sort((a, b) => a.value - b.value);
}
function calculateRsi(closes, period = 14) {
  const values = closes.map(Number);
  const rsi = values.map(() => null);
  if (values.length <= period) return rsi;
  let gains = 0, losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    gains += Math.max(change, 0); losses += Math.max(-change, 0);
  }
  let averageGain = gains / period, averageLoss = losses / period;
  const valueFor = () => averageLoss === 0 ? 100 : averageGain === 0 ? 0 : 100 - 100 / (1 + averageGain / averageLoss);
  rsi[period] = valueFor();
  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
    rsi[index] = valueFor();
  }
  return rsi;
}
function renderChart() {
  const svg = $('price-chart'), tooltip = $('chart-tooltip'), hoverDot = $('chart-hover-dot'), left = 55, right = 700, levelLabelLaneStart = 712, levelLabelX = 795, priceTop = 24, priceBottom = 250, volumeTop = 280, volumeBottom = 365, rsiTop = 392, rsiBottom = 462;
  if (settings.chartPreferences && typeof settings.chartPreferences.squeezeZoneVisible === 'boolean') squeezeZoneVisible = settings.chartPreferences.squeezeZoneVisible;
  if (settings.chartPreferences && typeof settings.chartPreferences.rsiVisible === 'boolean') rsiVisible = settings.chartPreferences.rsiVisible;
  const chartHeight = rsiVisible ? 510 : 430;
  const customEventActions = $('chart-custom-event-actions');
  $('shares-data-note').hidden = !sharesOutstanding;
  $('chart-loading').hidden = !chartLoading;
  if (customEventActions) customEventActions.innerHTML = '';
  const rangeTabs = $('range-tabs');
  if (rangeTabs && !$('custom-range-form')) rangeTabs.insertAdjacentHTML('beforeend', '<form id="custom-range-form" class="custom-range-form"><label for="custom-range-start">Custom</label><input id="custom-range-start" type="date" required aria-label="Custom range start date"><span>to</span><input id="custom-range-end" type="date" required aria-label="Custom range end date"><button type="submit">Apply</button></form>');
  const customRangeForm = $('custom-range-form'), customRangeStart = $('custom-range-start'), customRangeEnd = $('custom-range-end');
  customRangeForm?.classList.toggle('active', range === 'CUSTOM');
  if (customRangeStart) { customRangeStart.value = customChartRangeDraft.start; customRangeStart.oninput = () => { customChartRangeDraft.start = customRangeStart.value; }; }
  if (customRangeEnd) { customRangeEnd.value = customChartRangeDraft.end; customRangeEnd.oninput = () => { customChartRangeDraft.end = customRangeEnd.value; }; }
  document.querySelectorAll('[data-range]').forEach(button => { button.classList.toggle('active', button.dataset.range === range); button.onclick = () => { range = button.dataset.range; customChartRange = null; customChartRangeDraft = { start: '', end: '' }; chartView = null; void refreshMarketData(); }; });
  if (customRangeForm) customRangeForm.onsubmit = event => {
    event.preventDefault();
    const start = String(customChartRangeDraft.start || ''), end = String(customChartRangeDraft.end || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return;
    customChartRange = { start, end }; customChartRangeDraft = { start, end }; range = 'CUSTOM'; chartView = null; void refreshMarketData();
  };
  tooltip.hidden = true;
  hoverDot.hidden = true;
  if (!chartData?.c?.length) { svg.innerHTML = `<text class="chart-empty" x="400" y="130" text-anchor="middle">${chartError || 'No chart data returned for this range.'}</text>`; $('chart-summary').textContent = ''; return; }
  const fullValues = chartData.c, viewStart = chartView?.start ?? 0, viewEnd = chartView?.end ?? fullValues.length;
  const values = fullValues.slice(viewStart, viewEnd), timestamps = (chartData.t || []).slice(viewStart, viewEnd), opens = (chartData.o || []).slice(viewStart, viewEnd), highs = (chartData.h || []).slice(viewStart, viewEnd), lows = (chartData.l || []).slice(viewStart, viewEnd), volume = (chartData.v || []).slice(viewStart, viewEnd);
  const customRangeDays = range === 'CUSTOM' && customChartRange?.start && customChartRange?.end ? Math.max(1, Math.ceil((Date.parse(`${customChartRange.end}T00:00:00Z`) - Date.parse(`${customChartRange.start}T00:00:00Z`)) / 86400000) + 1) : null;
  const intradayChart = range === '1D' || range === '5D' || range === '1M' || (range === 'CUSTOM' && customRangeDays <= 31);
  const dailyValues = chartData.smaHistory?.c || fullValues, dailyTimes = chartData.smaHistory?.t || chartData.t || [];
  const averages = [...smaPeriods].map(period => {
    let rollingTotal = 0;
    const dailyAverage = dailyValues.map((value, index) => { rollingTotal += value; if (index >= period) rollingTotal -= dailyValues[index - period]; return index >= period - 1 ? rollingTotal / period : null; });
    let dailyIndex = 0;
    const mappedValues = values.map((_, index) => { const timestamp = timestamps[index]; while (dailyIndex + 1 < dailyTimes.length && dailyTimes[dailyIndex + 1] <= timestamp) dailyIndex += 1; return dailyTimes[dailyIndex] <= timestamp ? dailyAverage[dailyIndex] : null; });
    return { period, values: mappedValues };
  });
  let supportResistanceLevels = supportResistance ? findSupportResistance(values, highs, lows) : [];
  const squeezeAnalysis = getShortSqueezeAnalysis(holdings[ticker]);
  const squeezeZone = squeezeZoneVisible ? squeezeAnalysis?.zone : null;
  const plottedValues = values.concat(highs.filter(Number.isFinite), lows.filter(Number.isFinite), supportResistanceLevels.map(level => level.value), ...(squeezeZone ? [squeezeZone.low, squeezeZone.high] : []), ...averages.map(series => series.values.filter(Number.isFinite)));
  // A daily chart should be scaled to its intraday trading range. Including longer-term
  // moving averages here can make a one-day candle chart appear almost flat.
  const intradayPriceValues = values.concat(opens.filter(Number.isFinite), highs.filter(Number.isFinite), lows.filter(Number.isFinite));
  const axisValues = range === '1D' || (range === 'CUSTOM' && customRangeDays <= 2) ? intradayPriceValues : plottedValues;
  const rawDataMin = Math.min(...axisValues), rawDataMax = Math.max(...axisValues);
  const intradayPadding = range === '1D' || (range === 'CUSTOM' && customRangeDays <= 2) ? Math.max((rawDataMax - rawDataMin) * .12, Math.abs(rawDataMax || rawDataMin) * .002) : 0;
  const dataMin = rawDataMin - intradayPadding, dataMax = rawDataMax + intradayPadding;
  // In the one-day view, wheel zoom is a true two-dimensional zoom: scale the
  // price axis to only the visible candles. Keeping one-dollar rounded ticks
  // here makes a tightly zoomed intraday move look flat.
  const oneDayZoomed = range === '1D' && values.length < fullValues.length;
  let low, high, tickStep;
  if (oneDayZoomed) {
    low = dataMin;
    high = dataMax;
    tickStep = Math.max((high - low) / 4, 0.01);
  } else {
    const visibleSpan = Math.max(dataMax - dataMin, 1), roughStep = visibleSpan / 4, magnitude = 10 ** Math.floor(Math.log10(roughStep)), normalizedStep = roughStep / magnitude;
    tickStep = Math.max(1, (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10) * magnitude);
    low = Math.floor(dataMin / tickStep) * tickStep;
    high = Math.ceil(dataMax / tickStep) * tickStep;
    if (high <= low) { low -= tickStep; high += tickStep; }
  }
  // Keep level annotations inside the active chart scale. This is especially important
  // for the tightly scaled one-day view, where a longer-term level can otherwise overflow
  // above or below the SVG instead of remaining part of the chart.
  supportResistanceLevels = supportResistanceLevels.filter(level => level.value >= low && level.value <= high);
  const referencePrice = values.at(-1);
  const levelZone = Math.max(tickStep * .28, Math.abs(referencePrice) * .008);
  supportResistanceLevels = supportResistanceLevels.map(level => ({
    ...level,
    kind: Math.abs(level.value - referencePrice) <= levelZone ? 'pivot' : level.value < referencePrice ? 'support' : 'resistance',
    zone: levelZone
  }));
  const rangeDecimals = referencePrice < 25 ? 2 : 0;
  const formatLevelRange = level => `$${(level.value - level.zone).toFixed(rangeDecimals)}–$${(level.value + level.zone).toFixed(rangeDecimals)}`;
  const xFor = index => left + index * (right - left) / Math.max(values.length - 1, 1);
  const yFor = value => priceBottom - (value - low) * (priceBottom - priceTop) / (high - low);
  const ticks = []; for (let value = low; value <= high + tickStep * .001; value += tickStep) ticks.push(value);
  const grid = ticks.map(value => `<line class="chart-grid" x1="${left}" y1="${yFor(value)}" x2="${right}" y2="${yFor(value)}"/><text class="chart-label" x="4" y="${yFor(value) + 4}">$${oneDayZoomed ? value.toFixed(2) : Math.round(value)}</text>`).join('');
  const squeezeZoneOverlay = (() => {
    if (!squeezeZone) return '';
    const highY = yFor(squeezeZone.high), lowY = yFor(squeezeZone.low), labelGap = 16;
    let highLabelY = Math.max(priceTop + 11, Math.min(priceBottom - 22, highY + 4));
    let lowLabelY = Math.max(priceTop + 11, Math.min(priceBottom - 6, lowY + 4));
    if (lowLabelY - highLabelY < labelGap) {
      const middle = Math.max(priceTop + 11 + labelGap / 2, Math.min(priceBottom - 6 - labelGap / 2, (highY + lowY) / 2 + 4));
      highLabelY = middle - labelGap / 2;
      lowLabelY = middle + labelGap / 2;
    }
    const labelX = right + 12;
    return `<g class="squeeze-zone-overlay"><rect x="${left}" y="${highY}" width="${right - left}" height="${Math.max(1, lowY - highY)}"><title>Potential Squeeze Acceleration Zone: $${squeezeZone.low.toFixed(2)} to $${squeezeZone.high.toFixed(2)}. Technical context only; not a prediction.</title></rect><text class="squeeze-zone-range-label" x="${labelX}" y="${highLabelY}">Zone High: $${squeezeZone.high.toFixed(2)}</text><text class="squeeze-zone-range-label" x="${labelX}" y="${lowLabelY}" xml:space="preserve">Zone Low : $${squeezeZone.low.toFixed(2)}</text></g>`;
  })();
  const points = values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(' ');
  const averageLines = averages.map(series => `<polyline class="sma-line sma-${series.period}" points="${series.values.map((value, index) => Number.isFinite(value) ? `${xFor(index)},${yFor(value)}` : '').filter(Boolean).join(' ')}"/>`).join('');
  const candleWidth = Math.max(1.5, Math.min(12, (right - left) / values.length * .62));
  const candles = values.map((close, index) => { const open = Number.isFinite(opens[index]) ? opens[index] : close, high = Number.isFinite(highs[index]) ? highs[index] : Math.max(open, close), lowValue = Number.isFinite(lows[index]) ? lows[index] : Math.min(open, close), up = close >= open, x = xFor(index), top = yFor(Math.max(open, close)), bottom = yFor(Math.min(open, close),), height = Math.max(1.5, bottom - top); return `<line class="candle-wick ${up ? 'candle-up' : 'candle-down'}" x1="${x}" y1="${yFor(high)}" x2="${x}" y2="${yFor(lowValue)}"/><rect class="${up ? 'candle-up' : 'candle-down'}" x="${x - candleWidth / 2}" y="${top}" width="${candleWidth}" height="${height}"/>`; }).join('');
  const maxVolume = Math.max(...volume.filter(Number.isFinite), 1), width = Math.max(1, (right - left) / values.length * .7);
  const formatVolumeValue = value => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(value);
  // A visible scale makes the daily bars in the one-month view just as
  // interpretable as the intraday volume bars in the 1-day and 5-day views.
  const volumeAxisLabelX = sharesOutstanding ? 782 : right + 8;
  const volumeAxisAnchor = sharesOutstanding ? 'end' : 'start';
  const volumeAxis = [maxVolume, maxVolume / 2, 0].map(value => {
    const y = volumeBottom - value / maxVolume * (volumeBottom - volumeTop);
    return `<line class="volume-grid" x1="${left}" y1="${y}" x2="${right}" y2="${y}"/><text class="volume-axis-label" x="${volumeAxisLabelX}" y="${y + 4}" text-anchor="${volumeAxisAnchor}">${formatVolumeValue(value)}</text>`;
  }).join('');
  const liveDailyVolume = Number(chartData.liveDailyVolume ?? holdings[ticker]?.liveMarketQuote?.volume);
  const liveVolumeLabel = Number.isFinite(liveDailyVolume) && liveDailyVolume >= 0
    ? `<text class="volume-live-label" x="${right}" y="${volumeBottom + 22}" text-anchor="end">Live daily volume: ${formatVolumeValue(liveDailyVolume)}</text>`
    : '';
  const bars = values.map((value, index) => { const vol = Number.isFinite(volume[index]) ? volume[index] : 0, height = vol / maxVolume * (volumeBottom - volumeTop), open = opens[index], up = Number.isFinite(open) ? value >= open : value >= (values[index - 1] || value); return `<rect class="${up ? 'volume-up' : 'volume-down'}" x="${xFor(index) - width / 2}" y="${volumeBottom - height}" width="${width}" height="${height}"/>`; }).join('');
  const rsiValues = calculateRsi(fullValues).slice(viewStart, viewEnd);
  const rsiY = value => rsiBottom - value / 100 * (rsiBottom - rsiTop);
  const rsiGrid = rsiVisible ? [70, 50, 30].map(value => `<line class="rsi-grid ${value === 70 || value === 30 ? 'rsi-threshold' : ''}" x1="${left}" y1="${rsiY(value)}" x2="${right}" y2="${rsiY(value)}"/><text class="rsi-label" x="${right + 8}" y="${rsiY(value) + 4}">${value}</text>`).join('') : '';
  const rsiLine = rsiVisible ? `<polyline class="rsi-line" points="${rsiValues.map((value, index) => Number.isFinite(value) ? `${xFor(index)},${rsiY(value)}` : '').filter(Boolean).join(' ')}"/><text class="rsi-title" x="${left}" y="${rsiTop - 8}">RSI (14)</text>` : '';
  const shareReports = (chartData.sharesHistory || []).map(report => ({ ...report, timestamp: Date.parse(`${report.date}T12:00:00`) / 1000 })).filter(report => Number.isFinite(report.timestamp) && Number.isFinite(report.shares) && report.shares > 0).sort((a, b) => a.timestamp - b.timestamp);
  const chartStart = timestamps[0], chartEnd = timestamps.at(-1);
  // Show actual reported quarter-end counts only. Missing provider data stays
  // absent instead of creating a duplicate or synthetic carry-forward bar.
  const candidateShares = shareReports.filter(report => report.timestamp >= chartStart && report.timestamp <= chartEnd);
  // If two reports resolve to the same candle/month, retain the newer one.
  const plottedShares = [...candidateShares.reduce((byPosition, report) => {
    const position = timestamps.reduce((nearest, time, current) => Math.abs(time - report.timestamp) < Math.abs(timestamps[nearest] - report.timestamp) ? current : nearest, 0);
    const previous = byPosition.get(position);
    if (!previous || report.timestamp > previous.timestamp) byPosition.set(position, { ...report, position });
    return byPosition;
  }, new Map()).values()].sort((a, b) => a.position - b.position);
  const shareMax = Math.max(...plottedShares.map(report => report.shares), 1) * 1.12;
  const sharesY = value => priceBottom - value / shareMax * (priceBottom - priceTop);
  const formatShares = value => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(value);
  const shareBarSpacing = plottedShares.length > 1 ? Math.min(...plottedShares.slice(1).map((report, index) => xFor(report.position) - xFor(plottedShares[index].position))) : (right - left) * .2;
  const sharesBars = sharesOutstanding && plottedShares.length ? plottedShares.map(report => {
    const x = xFor(report.position);
    // One narrow column per quarter. Width scales with the visible time range
    // and is clamped to the plotted price area so no bar crosses the right axis.
    const desiredBarWidth = ({ '1D': 4, '5D': 4, '1M': 5, '3M': 6, '6M': 7, YTD: 8, '1Y': 9, '5Y': 11, MAX: 13 })[range] || 8;
    const barWidth = Math.max(4, Math.min(desiredBarWidth, shareBarSpacing * .55));
    const barStart = Math.min(Math.max(left, x - barWidth / 2), right - barWidth);
    const y = sharesY(report.shares), label = report.carriedForward ? `Carried forward: ${formatShares(report.shares)} shares outstanding · last reported ${report.date}` : `Reported: ${formatShares(report.shares)} shares outstanding · ${report.date}`;
    return `<rect class="shares-outstanding-bar" data-shares-tooltip="${escape(label)}" x="${barStart}" y="${y}" width="${barWidth}" height="${priceBottom - y}"/>`;
  }).join('') : '';
  const sharesAxis = sharesOutstanding && plottedShares.length ? Array.from({ length: 5 }, (_, index) => {
    const value = shareMax * (4 - index) / 4, y = sharesY(value);
    return `<text class="shares-axis-label" x="707" y="${y + 4}">${formatShares(value)}</text>`;
  }).join('') + `<line class="shares-axis" x1="${right}" y1="${priceTop}" x2="${right}" y2="${priceBottom}"/>` : '';
  const labels = [...new Set([0, Math.floor((values.length - 1) / 3), Math.floor((values.length - 1) * 2 / 3), values.length - 1])].map(index => {
    const point = timestamps[index] ? new Date(timestamps[index] * 1000) : null;
    const label = !point ? '' : (range === '1D' || (range === 'CUSTOM' && customRangeDays <= 7))
      ? point.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : point.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    return `<text class="chart-label" x="${xFor(index)}" y="${rsiVisible ? 492 : 410}" text-anchor="middle">${label}</text>`;
  }).join('');
  // Earnings events apply to both line and candle charts.  Keep the marker
  // layer above price marks so it remains visible for candle-chart users too.
  const earningsLines = earningsMarkers ? (holdings[ticker]?.earningsHistory?.actuals || []).flatMap(item => {
    const target = Date.parse(`${item.date}T12:00:00`) / 1000;
    if (!Number.isFinite(target) || !timestamps.length || target < timestamps[0] - 3 * 86400 || target > timestamps[timestamps.length - 1] + 3 * 86400) return [];
    const index = timestamps.reduce((closest, time, current) => Math.abs(time - target) < Math.abs(timestamps[closest] - target) ? current : closest, 0);
    const label = new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const source = item.source ? ` (${item.source})` : '';
    return [`<line class="earnings-release-marker" x1="${xFor(index)}" y1="${priceTop}" x2="${xFor(index)}" y2="${volumeBottom}"><title>Earnings marker ${label}${escape(source)}</title></line>`];
  }).join('') : '';
  const customEventDates = savedChartEventDates(ticker);
  const visibleCustomEvents = customEventDates.flatMap(date => {
    const target = Date.parse(`${date}T12:00:00`) / 1000;
    if (!Number.isFinite(target) || !timestamps.length || target < timestamps[0] - 3 * 86400 || target > timestamps[timestamps.length - 1] + 3 * 86400) return [];
    const index = timestamps.reduce((closest, time, current) => Math.abs(time - target) < Math.abs(timestamps[closest] - target) ? current : closest, 0);
    return [{ date, index, x: xFor(index), label: new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }];
  });
  const customEventLines = visibleCustomEvents.map(event => `<line class="custom-chart-event-marker" x1="${event.x}" y1="${priceTop}" x2="${event.x}" y2="${volumeBottom}"><title>Saved date ${event.label}</title></line>`).join('');
  const supportResistanceLines = supportResistanceLevels.map(level => `<line class="${level.kind === 'support' ? 'support-level' : 'resistance-level'}" x1="${left}" y1="${yFor(level.value)}" x2="${right}" y2="${yFor(level.value)}"><title>${level.kind === 'support' ? 'Support' : 'Resistance'} $${level.value.toFixed(2)} · ${level.hits} pivot tests</title></line><text class="${level.kind === 'support' ? 'support-level-label' : 'resistance-level-label'}" x="${right - 5}" y="${yFor(level.value) - 5}" text-anchor="end">${level.kind === 'support' ? 'S' : 'R'} $${level.value.toFixed(2)}</text>`).join('');
  const supportResistanceLabels = supportResistanceLevels
    .map(level => ({ ...level, lineY: yFor(level.value) }))
    .sort((a, b) => a.lineY - b.lineY);
  const labelGap = 15;
  let previousLabelY = priceTop - labelGap + 8;
  supportResistanceLabels.forEach(level => {
    level.labelY = Math.max(level.lineY - 4, previousLabelY + labelGap);
    previousLabelY = level.labelY;
  });
  const labelOverflow = Math.max(0, previousLabelY - (priceBottom - 5));
  if (labelOverflow) supportResistanceLabels.forEach(level => { level.labelY -= labelOverflow; });
  const renderedSupportResistanceLines = supportResistanceLabels.map(level => {
    const className = level.kind === 'support' ? 'support-level' : 'resistance-level';
    const labelClass = level.kind === 'support' ? 'support-level-label' : 'resistance-level-label';
    const prefix = level.kind === 'support' ? 'S' : 'R';
    return `<line class="${className}" x1="${left}" y1="${level.lineY}" x2="${right}" y2="${level.lineY}"><title>${level.kind === 'support' ? 'Support' : 'Resistance'} $${level.value.toFixed(2)} · ${level.hits} pivot tests</title></line><line class="${className} support-resistance-connector" x1="${right}" y1="${level.lineY}" x2="${levelLabelLaneStart}" y2="${level.labelY - 4}"/><text class="${labelClass}" x="${levelLabelX}" y="${level.labelY}" text-anchor="end">${prefix} $${level.value.toFixed(2)}</text>`;
  }).join('');
  const clarifiedSupportResistanceLines = supportResistanceLabels.map(level => {
    const className = level.kind === 'support' ? 'support-level' : level.kind === 'resistance' ? 'resistance-level' : 'pivot-level';
    const labelClass = level.kind === 'support' ? 'support-level-label' : level.kind === 'resistance' ? 'resistance-level-label' : 'pivot-level-label';
    const name = level.kind === 'support' ? 'Support' : level.kind === 'resistance' ? 'Resistance' : 'Pivot / Flip';
    const prefix = level.kind === 'support' ? 'S' : level.kind === 'resistance' ? 'R' : 'P';
    return `<line class="${className}" x1="${left}" y1="${level.lineY}" x2="${right}" y2="${level.lineY}"><title>${name} zone ${formatLevelRange(level)} · ${level.hits} pivot tests</title></line><line class="${className} support-resistance-connector" x1="${right}" y1="${level.lineY}" x2="${levelLabelLaneStart}" y2="${level.labelY - 4}"/><text class="${labelClass}" x="${levelLabelX}" y="${level.labelY}" text-anchor="end">${prefix} ${formatLevelRange(level)}</text>`;
  }).join('');
  const marketLayer = `${chartType === 'line' ? `<polyline class="chart-line" points="${points}"/>` : candles}${averageLines}${bars}`;
  svg.setAttribute('viewBox', `0 0 800 ${chartHeight}`);
  svg.innerHTML = `${grid}${volumeAxis}${liveVolumeLabel}${sharesBars}${sharesAxis}<line class="chart-axis" x1="${left}" y1="${priceBottom}" x2="${right}" y2="${priceBottom}"/>${rsiGrid}${rsiLine}${squeezeZoneOverlay}<g class="${supportResistance ? 'chart-muted' : ''}">${marketLayer}</g>${earningsLines}${customEventLines}${clarifiedSupportResistanceLines}${labels}<g id="chart-hover" pointer-events="none"><line class="chart-crosshair chart-crosshair-y" x1="0" y1="0" x2="0" y2="${rsiVisible ? rsiBottom : volumeBottom}"/><line class="chart-crosshair chart-crosshair-x" x1="${left}" y1="0" x2="0" y2="0"/><circle class="chart-marker" cx="0" cy="0" r="7"/></g>`;
  if (customEventActions) customEventActions.innerHTML = visibleCustomEvents.map((event, index) => `<button type="button" class="custom-chart-event-remove" data-custom-chart-event-remove="${event.date}" style="left:${(event.x / 800 * 100).toFixed(3)}%; top:${8 + (index % 3) * 23}px" title="Remove ${event.label}" aria-label="Remove saved chart date ${event.label}">×</button>`).join('');
  const hover = $('chart-hover'), crosshairY = hover.querySelector('.chart-crosshair-y'), crosshairX = hover.querySelector('.chart-crosshair-x'), marker = hover.querySelector('circle');
  hover.style.display = 'none';
  const formatTimestamp = timestamp => { if (!timestamp) return 'Date unavailable'; const date = new Date(timestamp * 1000); return intradayChart ? date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); };
  const formatVolume = value => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(value);
  svg.classList.toggle('chart-dragging', Boolean(chartDrag));
  svg.onpointerdown = event => {
    if (!chartView) return;
    event.preventDefault();
    chartDrag = { x: event.clientX, start: viewStart, end: viewEnd };
    const endPan = () => {
      chartDrag = null;
      $('price-chart')?.classList.remove('chart-dragging');
      document.onpointerup = null;
      document.onpointercancel = null;
      document.onmouseup = null;
    };
    document.onpointerup = endPan;
    document.onpointercancel = endPan;
    document.onmouseup = endPan;
    svg.classList.add('chart-dragging');
  };
  const updateHover = event => {
    if (chartDrag) {
      const bounds = svg.getBoundingClientRect(), pointShift = Math.round((event.clientX - chartDrag.x) / bounds.width * (chartDrag.end - chartDrag.start));
      const nextStart = Math.max(0, Math.min(fullValues.length - (chartDrag.end - chartDrag.start), chartDrag.start - pointShift));
      chartView = { start: nextStart, end: nextStart + (chartDrag.end - chartDrag.start) };
      renderChart();
      return;
    }
    const shareBar = typeof event.target?.closest === 'function' ? event.target.closest('[data-shares-tooltip]') : null;
    if (shareBar) {
      const bounds = svg.getBoundingClientRect(), host = $('chart-interaction'), hostBounds = host.getBoundingClientRect();
      const x = Number(shareBar.getAttribute('x')) + Number(shareBar.getAttribute('width')) / 2;
      const y = Number(shareBar.getAttribute('y'));
      hover.style.display = 'none';
      hoverDot.hidden = true;
      tooltip.innerHTML = `<strong>Outstanding shares</strong><span>${escape(shareBar.dataset.sharesTooltip)}</span>`;
      tooltip.hidden = false;
      const leftPx = x / 800 * bounds.width;
      tooltip.style.left = `${Math.min(Math.max(leftPx + 12, 6), hostBounds.width - tooltip.offsetWidth - 6)}px`;
      tooltip.style.top = `${Math.max(6, y / chartHeight * bounds.height - tooltip.offsetHeight - 10)}px`;
      return;
    }
    const bounds = svg.getBoundingClientRect(), relativeX = (event.clientX - bounds.left) / bounds.width * 800, relativeY = (event.clientY - bounds.top) / bounds.height * chartHeight;
    const index = Math.max(0, Math.min(values.length - 1, Math.round((relativeX - left) / (right - left) * Math.max(values.length - 1, 1))));
    const x = xFor(index), y = yFor(values[index]);
    const volumeValue = Number(volume[index]), volumeHeight = Number.isFinite(volumeValue) ? volumeValue / maxVolume * (volumeBottom - volumeTop) : 0;
    const hoveringRsiArea = rsiVisible && relativeY >= rsiTop && relativeY <= rsiBottom;
    const hoveringVolumeArea = relativeY >= volumeTop && relativeY <= volumeBottom;
    const showVolumeTooltip = hoveringVolumeArea && Number.isFinite(volumeValue);
    const showRsiTooltip = hoveringRsiArea && Number.isFinite(rsiValues[index]);
    hover.style.display = showVolumeTooltip || showRsiTooltip ? 'none' : 'block';
    if (!showVolumeTooltip && !showRsiTooltip) {
      crosshairY.setAttribute('x1', x); crosshairY.setAttribute('x2', x); crosshairY.setAttribute('y1', y);
      crosshairX.setAttribute('x2', x); crosshairX.setAttribute('y1', y); crosshairX.setAttribute('y2', y);
      crosshairY.style.display = crosshairGuides ? 'block' : 'none';
      crosshairX.style.display = crosshairGuides ? 'block' : 'none';
      marker.setAttribute('cx', x); marker.setAttribute('cy', y);
    }
    const formatChartPrice = value => `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const candleRange = chartType === 'candle' && Number.isFinite(highs[index]) && Number.isFinite(lows[index])
      ? `<span>High: ${formatChartPrice(highs[index])}</span><span>Low: ${formatChartPrice(lows[index])}</span>`
      : '';
    tooltip.innerHTML = showRsiTooltip
      ? `<strong>RSI (14): ${rsiValues[index].toFixed(2)}</strong><span>${formatTimestamp(timestamps[index])}</span>`
      : showVolumeTooltip
      ? `<strong>Volume: ${formatVolume(volumeValue)}</strong><span>${formatTimestamp(timestamps[index])}</span>`
      : `<strong>${formatChartPrice(values[index])}</strong><span>${formatTimestamp(timestamps[index])}</span>${candleRange}`;
    tooltip.hidden = false;
    const host = $('chart-interaction'), hostBounds = host.getBoundingClientRect(), leftPx = x / 800 * bounds.width;
    const desiredLeft = Math.min(Math.max(leftPx + 12, 6), hostBounds.width - tooltip.offsetWidth - 6);
    const tooltipY = showRsiTooltip ? rsiY(rsiValues[index]) / chartHeight * bounds.height : showVolumeTooltip ? (volumeBottom - volumeHeight) / chartHeight * bounds.height : y / chartHeight * bounds.height;
    tooltip.style.left = `${desiredLeft}px`; tooltip.style.top = `${Math.max(6, tooltipY - tooltip.offsetHeight - 10)}px`;
    hoverDot.hidden = showVolumeTooltip || showRsiTooltip;
    if (!showVolumeTooltip && !showRsiTooltip) { hoverDot.style.left = `${leftPx}px`; hoverDot.style.top = `${y / chartHeight * bounds.height}px`; }
  };
  const hideHover = () => { if (!chartDrag) { hover.style.display = 'none'; hoverDot.hidden = true; tooltip.hidden = true; } };
  svg.onpointermove = updateHover;
  svg.onmousemove = updateHover;
  svg.onpointerleave = hideHover;
  svg.onmouseleave = hideHover;
  svg.onwheel = event => {
    event.preventDefault();
    const bounds = svg.getBoundingClientRect(), relativeX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const currentStart = viewStart, currentEnd = viewEnd, currentLength = currentEnd - currentStart, focus = currentStart + Math.round(relativeX * Math.max(currentLength - 1, 0));
    const nextLength = Math.max(8, Math.min(fullValues.length, Math.round(currentLength * (event.deltaY < 0 ? 0.72 : 1.38))));
    let nextStart = Math.round(focus - relativeX * nextLength);
    nextStart = Math.max(0, Math.min(fullValues.length - nextLength, nextStart));
    chartView = nextLength >= fullValues.length ? null : { start: nextStart, end: nextStart + nextLength };
    renderChart();
  };
  document.querySelectorAll('[data-sma]').forEach(control => { control.checked = smaPeriods.has(Number(control.dataset.sma)); control.onchange = () => { const period = Number(control.dataset.sma); control.checked ? smaPeriods.add(period) : smaPeriods.delete(period); renderChart(); }; });
  document.querySelectorAll('[data-rsi]').forEach(control => {
    control.checked = rsiVisible;
    control.onchange = async () => {
      rsiVisible = control.checked;
      settings.chartPreferences ||= {};
      settings.chartPreferences.rsiVisible = rsiVisible;
      await window.portfolioApp.saveSettings(settings);
      renderChart();
    };
  });
  document.querySelectorAll('[data-support-resistance]').forEach(control => {
    control.checked = supportResistance;
    const label = control.closest('label');
    if (label && !label.nextElementSibling?.classList.contains('support-resistance-help-wrap')) {
      const help = document.createElement('button');
      help.type = 'button';
      help.className = 'support-resistance-help';
      help.textContent = '?';
      help.setAttribute('aria-label', 'How support and resistance levels are chosen');
      const wrap = document.createElement('span');
      wrap.className = 'support-resistance-help-wrap';
      const card = document.createElement('span');
      card.className = 'support-resistance-help-card';
      card.setAttribute('role', 'tooltip');
      card.innerHTML = '<strong>Support &amp; Resistance Colors</strong><span class="help-support"><i></i>Green — Support: buying previously held below the visible price.</span><span class="help-resistance"><i></i>Red — Resistance: selling previously stalled above the visible price.</span><span class="help-pivot"><i></i>Yellow — Pivot / Flip: a nearby level whose new role is not confirmed yet.</span><small>Levels are price zones, not exact prices.</small>';
      wrap.append(help, card);
      label.after(wrap);
    }
    control.onchange = () => { supportResistance = control.checked; renderChart(); };
  });
  document.querySelectorAll('[data-squeeze-zone]').forEach(control => {
    control.checked = squeezeZoneVisible;
    control.onchange = async () => {
      squeezeZoneVisible = control.checked;
      settings.chartPreferences ||= {};
      settings.chartPreferences.squeezeZoneVisible = squeezeZoneVisible;
      await window.portfolioApp.saveSettings(settings);
      renderChart();
    };
  });
  document.querySelectorAll('[data-earnings-marker]').forEach(control => { control.checked = earningsMarkers; control.onchange = () => { earningsMarkers = control.checked; renderChart(); if (earningsMarkers) void refreshOfficialEarningsMarkers(ticker); }; });
  document.querySelectorAll('[data-crosshair-guides]').forEach(control => { control.checked = crosshairGuides; control.onchange = () => { crosshairGuides = control.checked; renderChart(); }; });
  const customEventForm = $('custom-chart-event-form');
  if (customEventForm) customEventForm.onsubmit = event => {
    event.preventDefault();
    const input = $('custom-chart-event-date');
    const date = String(input?.value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !holdings[ticker]) return;
    storeChartEventDates(ticker, [...savedChartEventDates(ticker), date]);
    input.value = '';
    void Promise.all([persist(), window.portfolioApp.saveSettings(settings)]);
    renderChart();
  };
  document.querySelectorAll('[data-custom-chart-event-remove]').forEach(button => button.onclick = () => {
    const date = button.dataset.customChartEventRemove;
    if (!date || !holdings[ticker]) return;
    storeChartEventDates(ticker, savedChartEventDates(ticker).filter(item => item !== date));
    void Promise.all([persist(), window.portfolioApp.saveSettings(settings)]);
    renderChart();
  });
  document.querySelectorAll('[data-chart-type]').forEach(button => { const selected = button.dataset.chartType === chartType; button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected)); button.onclick = () => { chartType = button.dataset.chartType; renderChart(); }; });
  $('chart-summary').textContent = `${values.length} price points · hover for price and time · scroll to zoom · drag to pan`;
  const levelAsOf = timestamps.at(-1) ? new Date(timestamps.at(-1) * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'latest visible point';
  const levelReference = Number(referencePrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  $('chart-summary').textContent = `${values.length} price points · levels as of ${levelAsOf} at $${levelReference} · hover for price and time · scroll to zoom · drag to pan`;
}
function replaceChartDataPreservingViewport(candles, extras = {}) {
  const priorTimes = Array.isArray(chartData?.t) ? chartData.t : [];
  const priorView = chartView && Number.isInteger(chartView.start) && Number.isInteger(chartView.end)
    ? { start: chartView.start, end: chartView.end }
    : null;
  const priorStartTime = priorView ? priorTimes[Math.max(0, Math.min(priorTimes.length - 1, priorView.start))] : null;
  const priorEndTime = priorView ? priorTimes[Math.max(0, Math.min(priorTimes.length - 1, priorView.end - 1))] : null;
  chartData = { ...candles, ...extras };
  const nextTimes = Array.isArray(chartData?.t) ? chartData.t : [];
  if (!priorView || !nextTimes.length || !Number.isFinite(priorStartTime) || !Number.isFinite(priorEndTime)) return;
  const nearestIndex = timestamp => nextTimes.reduce((closest, value, index) => (
    Math.abs(Number(value) - timestamp) < Math.abs(Number(nextTimes[closest]) - timestamp) ? index : closest
  ), 0);
  let start = nearestIndex(priorStartTime);
  let end = nearestIndex(priorEndTime) + 1;
  const minimumVisible = Math.min(8, nextTimes.length);
  if (end - start < minimumVisible) end = Math.min(nextTimes.length, start + minimumVisible);
  if (end - start < minimumVisible) start = Math.max(0, end - minimumVisible);
  chartView = start === 0 && end >= nextTimes.length ? null : { start, end };
}
async function refreshMarketData() {
  if (!ticker || portfolioMutationInProgress) return;
  const symbol = ticker;
  const requestedRange = range;
  const requestedCustomRange = customChartRange ? { ...customChartRange } : null;
  if (earningsMarkers) void refreshOfficialEarningsMarkers(symbol);
  const sameChartRange = () => requestedRange === range && (!requestedCustomRange || (customChartRange?.start === requestedCustomRange.start && customChartRange?.end === requestedCustomRange.end));
  const refreshVersion = marketRefreshVersion;
  $('message').textContent = 'Refreshing market data…';
  const refreshingNews = symbol === ticker && section === 'news';
  const newsRequestToken = refreshingNews ? ++newsRefreshToken : 0;
  if (refreshingNews) { newsLoading = true; newsLoadingProgress = 0; renderContent(); }
  if (symbol === ticker) { chartLoading = true; renderChart(); }
  // Price candles are intentionally fetched separately from the broader market
  // dossier. This lets the chart finish its own loading state immediately.
  void window.portfolioApp.refreshChart({ symbol, range: requestedRange, customRange: requestedCustomRange }).then(fastChart => {
    if (refreshVersion !== marketRefreshVersion || symbol !== ticker || !sameChartRange()) return;
    if (fastChart?.candles?.s === 'ok') {
      replaceChartDataPreservingViewport(fastChart.candles, { smaHistory: fastChart.smaHistory || null, sharesHistory: chartData?.sharesHistory || [] });
      chartError = null;
    } else chartError = fastChart?.chartError || 'No chart data returned for this range.';
    chartLoading = false;
    renderChart();
  }).catch(error => {
    if (refreshVersion === marketRefreshVersion && symbol === ticker && sameChartRange()) { chartError = error.message || 'Chart request failed.'; chartLoading = false; renderChart(); }
  });
  try {
    const live = await window.portfolioApp.refreshMarketData({ symbol, range: requestedRange, customRange: requestedCustomRange });
    if (refreshVersion !== marketRefreshVersion) return;
    const d = holdings[symbol];
    if (!d) return;
    const liveQuote = live?.quote || {};
    d.price = liveQuote.price ? `$${Number(liveQuote.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Unavailable';
    d.change = Number.isFinite(liveQuote.percent) ? `${liveQuote.percent >= 0 ? '+' : ''}${liveQuote.percent.toFixed(2)}%` : '—';
    d.priceChange = Number.isFinite(liveQuote.change) ? liveQuote.change : d.priceChange;
    d.liveMarketSource = liveQuote.source || null;
    d.liveMarketQuote = liveQuote.source === 'IBKR' ? { bid: liveQuote.bid ?? null, ask: liveQuote.ask ?? null, volume: liveQuote.volume ?? null } : null;
    d.earningsTime = live.earnings ? (['bmo', 'amc'].includes(String(live.earnings.hour || '').toLowerCase()) ? String(live.earnings.hour).toLowerCase() : 'tbd') : null;
    d.earnings = live.earnings ? `${live.earnings.date} (${d.earningsTime === 'tbd' ? 'Time TBD' : d.earningsTime.toUpperCase()})` : live.earningsError ? 'Unavailable for this plan' : 'Not listed';
    d.earningsHistory = retainEarningsHistory(d.earningsHistory, live.earningsHistory);
    if (live.financials?.length) d.financials = live.financials;
    if (live.quarterlyFinancials?.length) d.quarterlyFinancials = live.quarterlyFinancials;
    if (live.quarterlyFinancialsSource) d.quarterlyFinancialsSource = live.quarterlyFinancialsSource;
    d.publishedValuation = live.publishedValuation || null;
    delete d.dcf;
    delete d.dcfUnavailableReason;
    if (Array.isArray(live.news) && (!refreshingNews || newsRequestToken === newsRefreshToken)) {
      const priorAnalysis = new Map((d.news || []).filter(item => !Array.isArray(item) && item?.analysis).map(item => [newsItemKey(item), item.analysis]));
      d.news = live.news.filter(item => articleDirectlyMentionsCompany(item, d, symbol)).map(item => {
        const analysis = priorAnalysis.get(newsItemKey(item));
        return analysis ? { ...item, analysis } : item;
      });
      d.newsLoadedAt = Date.now();
    }
    d.fmpEarningsError = live.fmpEarningsError || null;
    d.marketSentiment = live.marketSentiment || null;
    if (live.profile?.name) d.name = live.profile.name;
    if (Number.isFinite(live.profile?.marketCap) && live.profile.marketCap > 0) d.marketCap = live.profile.marketCap;
    if (live.profile) d.investorRelationsUrl = live.profile.investorRelationsUrl || null;
    if (live.profile?.overview) {
      d.profileOverview = live.profile.overview;
      if (needsCompanyOverview(d)) { d.story = live.profile.overview; d.aiOverview = false; }
    }
    if (symbol === ticker && sameChartRange()) { if (live.candles?.s === 'ok') replaceChartDataPreservingViewport(live.candles, { smaHistory: live.smaHistory, sharesHistory: live.sharesHistory }); chartError = live.chartError; chartLoading = false; }
    await persist();
    if (symbol === ticker) {
      $('message').textContent = `Updated ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
      // Preserve the visible news list until its current request has completed.
      if (!refreshingNews) render();
    }
  } catch (error) {
    if (symbol === ticker) { $('message').textContent = error.message || 'Could not refresh market data. Check that the saved API key is active.'; if (sameChartRange()) { chartLoading = false; renderChart(); } }
  } finally {
    if (refreshingNews && symbol === ticker && newsRequestToken === newsRefreshToken) await finishNewsRefresh(symbol, newsRequestToken);
  }
}
function applyLiveQuoteToChart(symbol, quote) {
  if (symbol !== ticker || !chartData?.c?.length || !Number.isFinite(quote?.c)) return;
  // The five-second quote feed represents "now." Never write it into the
  // final candle of a custom historical window, or it creates a false spike
  // at the end of the selected range.
  if (range === 'CUSTOM' && customChartRange?.end) {
    const today = new Date().toISOString().slice(0, 10);
    if (customChartRange.end < today) return;
  }
  // Yahoo's intraday bars can arrive a few minutes behind the live IBKR tick.
  // Keep a local, in-progress one-minute candle at "now" so the 1-day chart
  // and its hover timestamp continue moving without requiring a pan or zoom.
  if (range === '1D' && Array.isArray(chartData.t) && chartData.t.length) {
    const liveMinute = Math.floor(Date.now() / 60000) * 60;
    const latestMinute = Number(chartData.t.at(-1));
    if (Number.isFinite(latestMinute) && liveMinute > latestMinute) {
      const carry = Number(chartData.c.at(-1));
      chartData.t.push(liveMinute);
      chartData.o ||= []; chartData.h ||= []; chartData.l ||= []; chartData.v ||= [];
      chartData.o.push(Number.isFinite(carry) ? carry : Number(quote.c));
      chartData.h.push(Number(quote.c));
      chartData.l.push(Number(quote.c));
      chartData.c.push(Number(quote.c));
      chartData.v.push(0);
      // Stay attached to the right edge when the user is viewing the live end
      // of a zoomed intraday chart; a deliberately panned historical view is
      // left exactly where the user placed it.
      if (chartView && chartView.end >= chartData.c.length - 1) chartView = { start: chartView.start, end: chartData.c.length };
    }
  }
  const index = chartData.c.length - 1, latest = Number(quote.c), priorClose = Number(chartData.c[index]);
  chartData.c[index] = latest;
  if (Array.isArray(chartData.h)) chartData.h[index] = Math.max(Number(chartData.h[index]) || latest, latest);
  if (Array.isArray(chartData.l)) chartData.l[index] = Math.min(Number(chartData.l[index]) || latest, latest, Number.isFinite(priorClose) ? priorClose : latest);
  // IBKR tick 8 is cumulative daily volume.  On daily chart ranges it is the
  // current day's complete bar value.  On intraday ranges, add only the new
  // cumulative-volume delta to the active interval so the latest bar moves
  // without incorrectly replacing a one-minute/five-minute bar with the full
  // session total.
  const liveVolume = Number(quote.volume);
  if (Number.isFinite(liveVolume) && liveVolume >= 0 && Array.isArray(chartData.v) && chartData.v.length) {
    const previousLiveVolume = Number(chartData.liveDailyVolume);
    const intradayRange = range === '1D' || range === '5D';
    if (intradayRange) {
      const delta = Number.isFinite(previousLiveVolume) ? Math.max(0, liveVolume - previousLiveVolume) : 0;
      if (delta) chartData.v[index] = Math.max(0, Number(chartData.v[index]) || 0) + delta;
    } else chartData.v[index] = liveVolume;
    chartData.liveDailyVolume = liveVolume;
  }
}
async function refreshAllMarketData() { if (portfolioMutationInProgress || quoteRefreshInProgress || !Object.keys(holdings).length) return; quoteRefreshInProgress = true; const refreshVersion = marketRefreshVersion; try { const updates = await window.portfolioApp.refreshAllMarketData(Object.keys(holdings)); if (refreshVersion !== marketRefreshVersion) return; (updates || []).filter(Boolean).forEach(({ symbol, quote, marketCap: updatedMarketCap }) => { const d = holdings[symbol]; if (!d || !quote) return; d.price = quote.c ? `$${Number(quote.c).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : d.price; d.change = Number.isFinite(quote.dp) ? `${quote.dp >= 0 ? '+' : ''}${quote.dp.toFixed(2)}%` : d.change; d.priceChange = Number.isFinite(quote.d) ? quote.d : d.priceChange; d.liveMarketSource = quote.source || null; d.liveMarketQuote = quote.source === 'IBKR' ? { bid: quote.bid ?? null, ask: quote.ask ?? null, volume: quote.volume ?? null } : null; if (Number.isFinite(updatedMarketCap) && updatedMarketCap > 0) d.marketCap = updatedMarketCap; d.preMarket = Number.isFinite(quote.preMarket) ? quote.preMarket : null; d.afterHours = Number.isFinite(quote.afterHours) ? quote.afterHours : null; d.preMarketChange = Number.isFinite(quote.preMarketChange) ? quote.preMarketChange : null; d.preMarketPercent = Number.isFinite(quote.preMarketPercent) ? quote.preMarketPercent : null; d.afterHoursChange = Number.isFinite(quote.afterHoursChange) ? quote.afterHoursChange : null; d.afterHoursPercent = Number.isFinite(quote.afterHoursPercent) ? quote.afterHoursPercent : null; d.extendedSession = quote.extendedSession || null; applyLiveQuoteToChart(symbol, quote); }); lastQuoteRefresh = new Date(); await persist(); render(); } catch (error) { $('message').textContent = error.message || 'Could not refresh all ticker quotes.'; } finally { quoteRefreshInProgress = false; } }
// Yahoo only publishes an extended-session feed while it is active. Preserve
// the last reported quote after that feed closes, then discard it at the next
// regular-market open so the sidebar and overview do not flicker or vanish.
const refreshAllMarketDataWithExtendedHistory = refreshAllMarketData;
refreshAllMarketData = async () => {
  const priorExtended = new Map(Object.entries(holdings).map(([symbol, dossier]) => [symbol, {
    preMarket: dossier?.preMarket,
    preMarketChange: dossier?.preMarketChange,
    preMarketPercent: dossier?.preMarketPercent,
    afterHours: dossier?.afterHours,
    afterHoursChange: dossier?.afterHoursChange,
    afterHoursPercent: dossier?.afterHoursPercent
  }]));
  await refreshAllMarketDataWithExtendedHistory();
  const session = activeUSMarketExtendedSession();
  let changed = false;
  Object.entries(holdings).forEach(([symbol, dossier]) => {
    if (!dossier) return;
    if (session === 'regular') {
      ['preMarket', 'preMarketChange', 'preMarketPercent', 'afterHours', 'afterHoursChange', 'afterHoursPercent'].forEach(key => {
        if (dossier[key] !== null) { dossier[key] = null; changed = true; }
      });
      return;
    }
    const previous = priorExtended.get(symbol);
    if (!previous) return;
    const keys = session === 'pre'
      ? ['preMarket', 'preMarketChange', 'preMarketPercent']
      : ['afterHours', 'afterHoursChange', 'afterHoursPercent'];
    keys.forEach(key => {
      // Do not carry an old extended-hours value forward when the current
      // quote came from IBKR. Its basic live quote does not distinguish an
      // extended trade from the regular-session last price.
      if (dossier.liveMarketSource !== 'IBKR' && !Number.isFinite(dossier[key]) && Number.isFinite(previous[key])) {
        dossier[key] = previous[key];
        changed = true;
      }
    });
  });
  if (changed) { await persist(); render(); }
};
let pendingTickerDeletion = null;
function closeDeleteTickerModal() { pendingTickerDeletion = null; $('delete-ticker-modal').hidden = true; }
function requestTickerDeletion() {
  const dossier = holdings[ticker];
  if (portfolioMutationInProgress || !ticker || !dossier || dossier.isSearchResult) return;
  pendingTickerDeletion = ticker;
  $('delete-ticker-title').textContent = `Remove ${ticker}?`;
  $('delete-ticker-description').textContent = `${ticker}'s research notes will be saved and restored if you add it again.`;
  $('delete-ticker-modal').hidden = false;
  requestAnimationFrame(() => $('delete-ticker-cancel')?.focus());
}
async function deleteTicker(removedTicker) {
  const dossier = holdings[removedTicker];
  if (portfolioMutationInProgress || !removedTicker || !dossier || dossier.isSearchResult) return;
  portfolioMutationInProgress = true;
  let deleteError = '';
  try {
    marketRefreshVersion += 1;
    settings.noteArchive ||= {};
    settings.noteArchive[removedTicker] = { notes: structuredClone(dossier.notes || []), archivedAt: new Date().toISOString() };
    delete noteDrafts[removedTicker];
    delete holdings[removedTicker];
    ticker = Object.keys(holdings).find(symbol => !holdings[symbol]?.isSearchResult) || Object.keys(holdings)[0] || null;
    chartData = null;
    chartError = null;
    chartLoading = false;
    closeAddDestinationModal();
    // Saving is deliberately detached from the UI. A slow local write must never delay
    // access to the search controls after a ticker is removed.
    void Promise.all([window.portfolioApp.saveSettings(settings), persist()]).catch(error => { console.warn('Could not finish saving removed ticker state.', error); });
  } catch (error) {
    deleteError = error.message || 'The ticker was removed, but its saved notes could not be archived.';
  } finally {
    portfolioMutationInProgress = false;
    render();
    $('message').textContent = deleteError || `${removedTicker} was removed.`;
    requestAnimationFrame(() => $('ticker-input')?.focus());
  }
};
$('delete-ticker').onclick = requestTickerDeletion;
$('delete-ticker-cancel').onclick = closeDeleteTickerModal;
$('delete-ticker-modal').onclick = event => { if (event.target === $('delete-ticker-modal')) closeDeleteTickerModal(); };
$('delete-ticker-confirm').onclick = () => {
  const symbol = pendingTickerDeletion;
  closeDeleteTickerModal();
  if (symbol) void deleteTicker(symbol);
};
function openSnapTradeReconnectModal({ connectionId = '', institution = 'Brokerage' } = {}) {
  pendingSnapTradeReconnect = { connectionId, institution };
  $('snaptrade-reconnect-title').textContent = `Reconnect ${institution}`;
  $('snaptrade-reconnect-modal').hidden = false;
  requestAnimationFrame(() => $('snaptrade-reconnect-confirm')?.focus());
}
const closeSnapTradeReconnectModal = () => { $('snaptrade-reconnect-modal').hidden = true; };
function openSnapTradeManualRefreshModal() {
  const modal = $('snaptrade-manual-refresh-modal');
  const copy = $('snaptrade-manual-refresh-copy');
  const status = $('snaptrade-manual-refresh-status');
  const confirm = $('snaptrade-manual-refresh-confirm');
  const cancel = $('snaptrade-manual-refresh-cancel');
  copy.textContent = 'This asks SnapTrade to queue a fresh holdings sync for every active brokerage connection. It can take several minutes. SnapTrade may charge for this request or reject it if your plan does not include manual refresh.';
  status.hidden = true;
  status.className = 'manual-refresh-status';
  status.textContent = '';
  confirm.disabled = false;
  cancel.disabled = false;
  cancel.textContent = 'Cancel';
  modal.hidden = false;
  requestAnimationFrame(() => confirm.focus());
}
$('snaptrade-reconnect-cancel').onclick = () => { snapTradeReconnectDismissed = true; pendingSnapTradeReconnect = null; closeSnapTradeReconnectModal(); };
$('snaptrade-reconnect-modal').onclick = event => { if (event.target === $('snaptrade-reconnect-modal')) { snapTradeReconnectDismissed = true; pendingSnapTradeReconnect = null; closeSnapTradeReconnectModal(); } };
$('snaptrade-manual-refresh-cancel').onclick = () => { $('snaptrade-manual-refresh-modal').hidden = true; };
$('snaptrade-manual-refresh-modal').onclick = event => { if (event.target === $('snaptrade-manual-refresh-modal')) $('snaptrade-manual-refresh-modal').hidden = true; };
$('snaptrade-manual-refresh-confirm').onclick = () => { void requestSnapTradeManualRefresh(); };
$('snaptrade-reconnect-confirm').onclick = async () => {
  closeSnapTradeReconnectModal();
  try {
    const brokenConnection = (snapTradeState.connections || []).find(connection => connection.disabled);
    const connectionId = pendingSnapTradeReconnect?.connectionId || brokenConnection?.id || '';
    await window.portfolioApp.connectSnapTrade(connectionId ? { connectionId } : {});
    const status = 'SnapTrade Connection Portal opened. After completion it will close automatically and refresh the dashboard.';
    if (brokerageDiagnosticsPageOpen && $('diagnostics-status')) $('diagnostics-status').textContent = status;
    else $('snaptrade-config-status').textContent = status;
  } catch (error) {
    const status = error.message || 'Could not open SnapTrade reconnection.';
    if (brokerageDiagnosticsPageOpen && $('diagnostics-status')) $('diagnostics-status').textContent = status;
    else $('snaptrade-config-status').textContent = status;
  } finally {
    pendingSnapTradeReconnect = null;
  }
};
$('save-key').onclick = async () => { settings.finnhubToken = $('api-key').value.trim(); await window.portfolioApp.saveSettings(settings); $('connection-status').textContent = settings.finnhubToken ? 'Key saved locally.' : 'Key removed.'; await Promise.all([refreshAllMarketData(), refreshMarketData()]); };
$('save-fmp-key').onclick = async () => { settings.fmpToken = $('fmp-api-key').value.trim(); await window.portfolioApp.saveSettings(settings); $('fmp-connection-status').textContent = settings.fmpToken ? 'Key saved locally. Refreshing earnings history…' : 'Key removed.'; if (settings.fmpToken && ticker) await refreshMarketData(); if (settings.fmpToken) $('fmp-connection-status').textContent = 'Key saved locally.'; };
$('save-alpha-vantage-key').onclick = async () => { settings.alphaVantageToken = $('alpha-vantage-api-key').value.trim(); await window.portfolioApp.saveSettings(settings); $('alpha-vantage-connection-status').textContent = settings.alphaVantageToken ? 'Key saved locally. Refreshing outstanding shares…' : 'Key removed.'; if (settings.alphaVantageToken && ticker) await refreshMarketData(); if (settings.alphaVantageToken) $('alpha-vantage-connection-status').textContent = 'Key saved locally.'; };
$('save-youtube-key').onclick = async () => { settings.youtubeApiKey = $('youtube-api-key').value.trim(); await window.portfolioApp.saveSettings(settings); $('youtube-connection-status').textContent = settings.youtubeApiKey ? 'Key saved locally. AI Agent will use public YouTube evidence in future scans.' : 'Key removed.'; };
$('save-ibkr-settings').onclick = async () => {
  settings.ibkrHost = $('ibkr-host').value.trim() || '127.0.0.1';
  settings.ibkrPort = Math.max(1, Math.min(65535, Number($('ibkr-port').value) || 4001));
  settings.ibkrClientId = Math.max(0, Math.min(9999, Number($('ibkr-client-id').value) || 73));
  settings.ibkrLiveMarketData = $('ibkr-live-market-data').checked;
  settings.ibkrAutoLaunchGateway = $('ibkr-auto-launch').checked;
  await window.portfolioApp.saveSettings(settings);
  $('ibkr-connection-status').textContent = settings.ibkrLiveMarketData ? 'IBKR live data is preferred; existing providers remain the automatic fallback.' : 'Existing dashboard market-data providers are active.';
  void refreshAllMarketData();
  if (section === 'short-interest' && ticker) {
    delete shortableSharesBySymbol[ticker];
    void refreshShortableShares(ticker);
  }
};
$('launch-ibkr-gateway').onclick = async () => {
  $('ibkr-connection-status').textContent = 'Launching IBKR Gateway…';
  try { const result = await window.portfolioApp.launchIbkrGateway(); $('ibkr-connection-status').textContent = result.detail; }
  catch (error) { $('ibkr-connection-status').textContent = error.message || 'IBKR Gateway could not be launched.'; }
};
$('check-local-ai').onclick = async () => { const status = await window.portfolioApp.localAiStatus(); $('ai-status').textContent = status.running ? (status.modelReady ? 'Ollama and Gemma 3 are ready.' : 'Ollama is running. Download the Gemma 3 model to continue.') : 'Ollama is not detected. Install and open it first.'; };
$('download-local-model').onclick = async () => { $('ai-status').textContent = 'Downloading Gemma 3. This can take several minutes.'; try { const status = await window.portfolioApp.downloadLocalModel(); $('ai-status').textContent = status.modelReady ? 'Gemma 3 is ready.' : 'Model download completed, but Gemma 3 was not detected.'; } catch (error) { $('ai-status').textContent = error.message || 'Could not download the model.'; } };
$('refresh').onclick = async () => { await Promise.all([refreshAllMarketData(), refreshMarketData(), refreshTrendingStocks()]); };
document.addEventListener('change', event => {
  const control = event.target;
  if (!(control instanceof HTMLInputElement) || !control.matches('[data-shares-outstanding]')) return;
  sharesOutstanding = control.checked;
  renderChart();
});
window.addEventListener('keydown', event => {
  const editable = event.target instanceof HTMLElement && event.target.matches('input, textarea, select, [contenteditable="true"]');
  if (editable || $('add-destination-modal')?.hidden === false || $('delete-ticker-modal')?.hidden === false || $('snaptrade-reconnect-modal')?.hidden === false) return;
  const key = event.key.toLowerCase();
  if (event.key === '/') {
    event.preventDefault();
    $('ticker-input')?.focus();
    return;
  }
  if (key === 'r') {
    event.preventDefault();
    void Promise.all([refreshAllMarketData(), refreshMarketData(), refreshTrendingStocks(), refreshPortfolioQuotes()]);
    return;
  }
  if (key === 'd') { event.preventDefault(); openDashboard(); return; }
  if (key === 'p') {
    event.preventDefault();
    showWorkspacePage('portfolio');
    void refreshPortfolioQuotes();
    return;
  }
  if (key === 'm') {
    event.preventDefault();
    showWorkspacePage('macro');
    if (!macroData) void refreshMacroData();
    return;
  }
  if (!['ArrowDown', 'ArrowUp'].includes(event.key) || portfolioPageOpen || settingsPageOpen) return;
  const symbols = Object.keys(holdings).filter(symbol => isTickerEntry(holdings[symbol]));
  if (symbols.length < 2) return;
  const current = Math.max(0, symbols.indexOf(ticker));
  const step = event.key === 'ArrowDown' ? 1 : -1;
  ticker = symbols[(current + step + symbols.length) % symbols.length];
  section = 'thesis'; chartData = null; chartError = null; chartView = null;
  event.preventDefault();
  render();
  void refreshMarketData();
});
$('export').onclick = () => window.portfolioApp.exportBackup(holdings);
$('import').onclick = async () => { try { const imported = await window.portfolioApp.importBackup(); if (!imported || typeof imported !== 'object' || !Object.keys(imported).length) return; holdings = imported; ticker = Object.keys(holdings)[0]; persist(); render(); } catch { $('message').textContent = 'That backup could not be imported.'; } };
$('agent-automation-enabled').onchange = async event => {
  settings.agentAutomation = { ...(settings.agentAutomation || {}), enabled: event.target.checked };
  await window.portfolioApp.saveSettings(settings);
  configureAgentAutomation({ runNow: event.target.checked });
};
$('agent-test-notification').onclick = async () => {
  await window.portfolioApp.testAgentNotification();
  $('agent-automation-status').textContent = 'Demo notification sent. Check the lower-right corner of Windows and the notification center.';
};
(async () => { const [saved, storedSettings] = await Promise.all([window.portfolioApp.load(), window.portfolioApp.loadSettings()]); if (saved && typeof saved === 'object' && Object.keys(saved).length) holdings = saved; settings = storedSettings || {}; if (settings.openaiApiKey) delete settings.openaiApiKey; if (settings.xBearerToken) delete settings.xBearerToken; restoreAiAgentLeaderboard(); const retiredNotesRemoved = removeRetiredDossierNotes(); await Promise.all([window.portfolioApp.saveSettings(settings), retiredNotesRemoved ? persist() : Promise.resolve()]); $('api-key').value = settings.finnhubToken || ''; $('fmp-api-key').value = settings.fmpToken || ''; $('alpha-vantage-api-key').value = settings.alphaVantageToken || ''; $('youtube-api-key').value = settings.youtubeApiKey || ''; $('connection-status').textContent = settings.finnhubToken ? 'Key saved locally.' : 'No key saved.'; $('fmp-connection-status').textContent = settings.fmpToken ? 'Key saved locally.' : 'No key saved.'; $('alpha-vantage-connection-status').textContent = settings.alphaVantageToken ? 'Key saved locally.' : 'No key saved.'; $('youtube-connection-status').textContent = settings.youtubeApiKey ? 'Key saved locally.' : 'No key saved.'; await loadSnapTradeState(); updateSnapTradeFields(); const localStatus = await window.portfolioApp.localAiStatus(); $('ai-status').textContent = localStatus.running ? (localStatus.modelReady ? 'Gemma 3 is ready.' : 'Ollama is running. Download the Gemma 3 model to continue.') : 'Install Ollama to use local overviews.'; render(); void refreshTrendingStocks(); await Promise.all([refreshAllMarketData(), refreshMarketData()]); })().catch(error => {
  console.error('Dashboard startup continued after an optional-data error', error);
  $('message').textContent = 'Some background data could not be loaded. Navigation is still available.';
  try { render(); } catch (renderError) { console.error('Fallback dashboard render failed', renderError); }
});
setTimeout(() => configureAgentAutomation({ runNow: true }), 2000);
setTimeout(() => {
  $('ibkr-host').value = settings.ibkrHost || '127.0.0.1';
  $('ibkr-port').value = settings.ibkrPort || 4001;
  $('ibkr-client-id').value = settings.ibkrClientId || 73;
  $('ibkr-live-market-data').checked = settings.ibkrLiveMarketData !== false;
  $('ibkr-auto-launch').checked = settings.ibkrAutoLaunchGateway !== false;
  $('ibkr-connection-status').textContent = settings.ibkrLiveMarketData === false ? 'Existing dashboard market-data providers are active.' : 'IBKR is preferred when Gateway is connected; fallback is ready.';
}, 0);
window.portfolioApp.onShortableSharesUpdated(update => {
  if (!update?.symbol) return;
  // Re-read persisted history so event-driven updates never replace older rows.
  void refreshShortableShares(update.symbol);
});
window.portfolioApp.onShortableSharesStatus(status => {
  if (!shortableSharesBySymbol[ticker]) return;
  // Re-read the connection detail so the table shows the exact IBKR error.
  void refreshShortableShares(ticker);
});
setInterval(() => { if (section === 'short-interest' && shortableSharesBySymbol[ticker]) renderContent(); }, 10000);
setInterval(() => { void refreshAllMarketData(); }, 5000);
setInterval(() => { if (trendsPageOpen) void refreshTrackedTrendIndexes(); }, 15 * 60 * 1000);
// A custom date window is user-defined research context. Keep it independent
// from the periodic full-data refresh so its inputs and selected range never
// get replaced in the background. Live quotes still update every five seconds;
// pressing Refresh or Apply remains the explicit way to reload that window.
setInterval(() => { if (ticker && range !== 'CUSTOM') void refreshMarketData(); }, 300000);
setInterval(() => { if (snapTradeState.configured) void refreshPortfolioQuotes(); }, 5000);
setInterval(() => { if (snapTradeState.configured) void refreshSnapTradePortfolio(); }, 60000);
setInterval(() => { void refreshTrendingStocks(); }, 900000);
