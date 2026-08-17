const net = require('net');
const fs = require('fs/promises');
const path = require('path');
const { EventEmitter } = require('events');

// Minimal TWS socket client for the documented generic tick 236 / tick type 89.
// It intentionally owns one socket and many symbol subscriptions.
class ShortableSharesService extends EventEmitter {
  constructor({ storagePath, config = {} }) {
    super();
    this.storagePath = storagePath;
    this.configure(config);
    this.socket = null; this.buffer = Buffer.alloc(0); this.connected = false; this.apiReady = false;
    this.connecting = false; this.reconnectTimer = null; this.handshakeTimedOut = false; this.nextRequestId = 910000;
    this.subscriptions = new Map(); this.requestToSymbol = new Map(); this.feeRequestToSymbol = new Map(); this.current = new Map(); this.feeCurrent = new Map(); this.liveQuotes = new Map();
    this.history = {}; this.feeHistory = {}; this.loaded = false; this.lastError = ''; this.lastUpdatedAt = null; this.feeRefreshTimer = null;
  }
  configure(config = {}) {
    this.config = {
      host: String(config.ibkrHost || process.env.IBKR_HOST || '127.0.0.1'),
      // IB Gateway's live API defaults to 4001. TWS uses different defaults.
      port: Number(config.ibkrPort || process.env.IBKR_PORT || 4001),
      clientId: Number(config.ibkrClientId || process.env.IBKR_CLIENT_ID || 73)
    };
  }
  async load() {
    if (this.loaded) return;
    try { const saved = JSON.parse(await fs.readFile(this.storagePath, 'utf8')); this.history = saved.history || {}; this.feeHistory = saved.feeHistory || {}; } catch { this.history = {}; this.feeHistory = {}; }
    this.loaded = true;
    Object.entries(this.history).forEach(([symbol, rows]) => { const latest = Array.isArray(rows) ? rows.at(-1) : null; if (latest) this.current.set(symbol, latest); });
    Object.entries(this.feeHistory).forEach(([symbol, rows]) => { const latest = Array.isArray(rows) ? rows.at(-1) : null; if (latest) this.feeCurrent.set(symbol, latest); });
  }
  async persist() { await fs.mkdir(path.dirname(this.storagePath), { recursive: true }); await fs.writeFile(this.storagePath, JSON.stringify({ version: 2, source: 'IBKR', history: this.history, feeHistory: this.feeHistory }, null, 2)); }
  status() { return this.connected ? 'live' : this.handshakeTimedOut ? 'gateway-timeout' : this.connecting || this.reconnectTimer ? 'reconnecting' : 'offline'; }
  connection() {
    const status = this.status();
    const defaultDetail = status === 'live'
      ? 'Connected to TWS / IB Gateway. Waiting for an IBKR shortable-shares update for this symbol.'
      : status === 'gateway-timeout'
        ? `IBKR accepted the socket at ${this.config.host}:${this.config.port}, but did not reply to the API handshake.`
        : status === 'reconnecting'
        ? `Connecting to ${this.config.host}:${this.config.port}…`
        : `TWS / IB Gateway is not connected at ${this.config.host}:${this.config.port}.`;
    return { status, detail: this.lastError || defaultDetail, host: this.config.host, port: this.config.port, updatedAt: this.lastUpdatedAt };
  }
  async get(symbol, range = 'today') {
    await this.load(); const key = String(symbol || '').toUpperCase(); this.subscribe(key);
    const now = Date.now(); const ranges = { today: 1, '5d': 5, '1m': 31, '3m': 93, all: Infinity };
    const days = ranges[range] || 1, cutoff = days === Infinity ? 0 : now - days * 86400000;
    const history = (this.history[key] || []).filter(row => Date.parse(row.observedAt) >= cutoff).slice().reverse();
    // Fee comparisons use the last available prior trading day, which can be
    // several calendar days earlier after a weekend or holiday. Keep that
    // separate from the visible availability-table range.
    const feeHistory = (this.feeHistory[key] || []).filter(row => Date.parse(row.observedAt) >= now - 14 * 86400000).slice().reverse();
    return { symbol: key, current: this.current.get(key) || null, history, feeCurrent: this.feeCurrent.get(key) || null, feeHistory, status: this.status(), connection: this.connection(), source: 'IBKR', note: 'Availability and fee-rate history are collected from IBKR while monitoring is enabled. Availability is live broker inventory; the fee rate is IBKR\'s latest published fee-rate bar.' };
  }
  // The same IBKR market-data subscription used for tick 89 also contains
  // the normal bid, ask, last, close, and volume fields. Keep those live
  // values in memory so the dashboard can prefer its authenticated IBKR feed
  // without inventing a second socket/client session.
  async getLiveQuote(symbol) {
    await this.load();
    const key = String(symbol || '').toUpperCase();
    this.subscribe(key);
    return this.liveQuotes.get(key) || null;
  }
  subscribe(symbol) {
    if (!symbol || !/^[A-Z.\-]{1,12}$/.test(symbol)) return;
    this.subscriptions.set(symbol, true);
    if (!this.socket && !this.connecting) this.connect();
    if (this.connected && this.apiReady) { this.requestMarketData(symbol); this.requestFeeRate(symbol); }
  }
  connect() {
    if (this.connecting || this.connected) return;
    this.connecting = true; this.emit('status', this.status());
    const socket = this.socket = net.createConnection({ host: this.config.host, port: this.config.port });
    socket.setNoDelay(true);
    socket.once('connect', () => {
      // API v100+ begins with "API\0" followed by a *length-prefixed* version
      // string.  The version itself is not null-terminated.  Gateway accepts the
      // TCP connection but closes it immediately if this first message is framed
      // like a normal null-delimited API message.
      const version = Buffer.from('v100..178', 'utf8');
      const length = Buffer.alloc(4); length.writeUInt32BE(version.length);
      socket.write(Buffer.concat([Buffer.from('API\0'), length, version]));
      // A TCP connection alone is not proof of an API session. Retain any
      // previous handshake-timeout detail until Gateway replies correctly.
      console.log('[IBKR Shortable] Connected');
    });
    socket.on('data', data => this.onData(data));
    socket.on('error', error => { this.lastError = `Connection error: ${error.message}`; console.log(`[IBKR Shortable] Socket error: ${error.message}`); this.emit('status', this.status()); });
    socket.on('close', () => this.onClose());
    setTimeout(() => {
      if (!this.connected && socket === this.socket) {
        this.handshakeTimedOut = true;
        this.lastError = `IBKR accepted the socket at ${this.config.host}:${this.config.port}, but did not complete the API handshake. Gateway did not process a standard client request.`;
        socket.destroy();
      }
    }, 8000).unref();
  }
  onClose() {
    const wasActive = this.connected || this.connecting; this.connected = false; this.apiReady = false; this.connecting = false; this.socket = null;
    // A Gateway reconnect creates a new market-data session, so prior request
    // IDs cannot be reused. Re-request every tracked symbol after API ready.
    this.requestToSymbol.clear(); this.feeRequestToSymbol.clear();
    if (wasActive) console.log('[IBKR Shortable] Connection lost');
    this.emit('status', this.status());
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; console.log('[IBKR Shortable] Reconnecting...'); this.connect(); }, 5000);
    this.reconnectTimer.unref?.();
  }
  frame(fields) { const body = Buffer.from(fields.map(value => String(value ?? '')).join('\0') + '\0'); const size = Buffer.alloc(4); size.writeUInt32BE(body.length); return Buffer.concat([size, body]); }
  send(fields) { if (this.socket && !this.socket.destroyed) this.socket.write(this.frame(fields)); }
  onData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
    // With the v100+ API handshake, Gateway returns the server version and
    // connection time in the normal length-prefixed wire format.  Treating
    // the leading zero byte of that frame length as a null delimiter causes a
    // premature StartApi request, after which Gateway closes the connection.
    if (!this.connected) {
      if (this.buffer.length < 4) return;
      const length = this.buffer.readUInt32BE(0);
      if (length <= 0 || length > 1024 * 1024) {
        this.lastError = 'IBKR returned an invalid API handshake frame.';
        this.socket?.destroy();
        return;
      }
      if (this.buffer.length < length + 4) return;
      const handshake = this.buffer.subarray(4, 4 + length).toString('utf8').split('\0');
      this.buffer = this.buffer.subarray(4 + length);
      const serverVersion = Number(handshake[0]);
      if (!Number.isFinite(serverVersion) || serverVersion <= 0) {
        this.lastError = 'IBKR did not return a valid API server version.';
        this.socket?.destroy();
        return;
      }
      this.connected = true; this.connecting = false; this.handshakeTimedOut = false; this.lastError = ''; clearTimeout(this.reconnectTimer);
      this.send([71, 2, this.config.clientId, '']); // StartApi
      this.emit('status', this.status());
    }
    while (this.buffer.length >= 4) {
      const length = this.buffer.readUInt32BE(0); if (this.buffer.length < length + 4) return;
      const fields = this.buffer.subarray(4, 4 + length).toString('utf8').split('\0'); fields.pop(); this.buffer = this.buffer.subarray(4 + length);
      this.handleMessage(fields);
    }
  }
  requestMarketData(symbol) {
    const existing = [...this.requestToSymbol.entries()].find(([, value]) => value === symbol)?.[0]; if (existing) return;
    const requestId = this.nextRequestId++; this.requestToSymbol.set(requestId, symbol);
    // reqMktData: generic tick 236 returns shortable-share tick type 89 when entitled.
    // reqMktData v11 contract order must exactly match the TWS API:
    // conId, symbol, secType, expiry, strike, right, multiplier, exchange,
    // primaryExchange, currency, localSymbol, tradingClass, deltaNeutral,
    // generic ticks, snapshot, regulatory snapshot, options.
    // IBKR's socket protocol expects boolean fields as numeric 0/1 flags.
    // Sending JavaScript `false` serializes to the literal text "false", which
    // Gateway rejects with error 320 before it can return tick 89.
    this.send([1, 11, requestId, 0, symbol, 'STK', '', 0, '', '', 'SMART', '', 'USD', '', '', 0, '236', 0, 0, '']);
    console.log(`[IBKR Shortable] Subscribed ${symbol} genericTick=236`);
  }
  requestFeeRate(symbol) {
    if ([...this.feeRequestToSymbol.values()].includes(symbol)) return;
    const requestId = this.nextRequestId++; this.feeRequestToSymbol.set(requestId, symbol);
    // IBKR's connected Gateway returns the current FEE_RATE daily bar for this
    // entitlement. Store that direct bar by its IBKR date so tomorrow's value
    // can be compared with today's value without using another provider.
    this.send([20, requestId, 0, symbol, 'STK', '', 0, '', '', 'SMART', '', 'USD', '', '', 0, '', '1 day', '1 D', 0, 'FEE_RATE', 1, 0, '']);
    console.log(`[IBKR Shortable] Requested ${symbol} current FEE_RATE bar`);
  }
  startFeeRefresh() {
    if (this.feeRefreshTimer) return;
    this.feeRefreshTimer = setInterval(() => {
      if (!this.connected || !this.apiReady) return;
      for (const symbol of this.subscriptions.keys()) this.requestFeeRate(symbol);
    // Keep the displayed direct IBKR fee refreshed and retain one bar per
    // trading day for the daily comparison.
    }, 60 * 1000);
    this.feeRefreshTimer.unref?.();
  }
  async record(symbol, sharesAvailable) {
    await this.load(); const previous = this.current.get(symbol);
    if (previous && previous.sharesAvailable === sharesAvailable) return;
    const row = { symbol, sharesAvailable, observedAt: new Date().toISOString(), source: 'IBKR', conId: null };
    (this.history[symbol] ||= []).push(row); this.current.set(symbol, row); this.lastUpdatedAt = row.observedAt; this.lastError = '';
    await this.persist(); this.emit('update', { symbol, current: row });
    console.log(`[IBKR Shortable] ${symbol}${previous ? ` changed ${previous.sharesAvailable} -> ${sharesAvailable}` : ` shares available: ${sharesAvailable}`}`);
  }
  async recordFeeRate(symbol, feeRate, sourceDate = '') {
    await this.load(); const previous = this.feeCurrent.get(symbol);
    const lastObserved = Date.parse(previous?.observedAt || 0);
    // Avoid duplicate messages within the same minute while retaining an
    // unchanged fee once the next scheduled observation is due.
    if (previous && Math.abs(previous.feeRate - feeRate) < 0.00001 && Date.now() - lastObserved < 55 * 1000) return;
    const normalizedDate = String(sourceDate || '').match(/\d{8}/)?.[0] || new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const row = { symbol, feeRate, sourceDate: normalizedDate, observedAt: new Date().toISOString(), source: 'IBKR' };
    const history = (this.feeHistory[symbol] ||= []);
    const sameBar = history.findIndex(item => String(item.sourceDate || '').replaceAll('-', '') === normalizedDate);
    if (sameBar >= 0) history[sameBar] = row;
    else history.push(row);
    // Retain enough local observations to compare against the previous
    // trading day, including weekends and holidays, without allowing the
    // file to grow indefinitely.
    const cutoff = Date.now() - 14 * 86400000;
    this.feeHistory[symbol] = history.filter(item => Date.parse(item.observedAt) >= cutoff);
    this.feeCurrent.set(symbol, row); this.lastUpdatedAt = row.observedAt; this.lastError = '';
    await this.persist(); this.emit('update', { symbol, feeCurrent: row });
    if (!previous || Math.abs(previous.feeRate - feeRate) >= 0.00001) console.log(`[IBKR Shortable] ${symbol} borrow fee: ${(feeRate * 100).toFixed(2)}%`);
  }
  async recordFeeRateHistory(symbol, bars) {
    await this.load();
    const normalized = bars
      .map(bar => ({ ...bar, sourceDate: String(bar.sourceDate || '').match(/\d{8}/)?.[0] || '' }))
      .filter(bar => Number.isFinite(bar.feeRate) && bar.feeRate >= 0 && /^\d{8}$/.test(bar.sourceDate))
      .map(bar => ({
        symbol,
        feeRate: bar.feeRate,
        // This is the date of the bar supplied by IBKR, not the time this
        // dashboard happened to observe it.
        sourceDate: bar.sourceDate,
        observedAt: `${bar.sourceDate.slice(0, 4)}-${bar.sourceDate.slice(4, 6)}-${bar.sourceDate.slice(6, 8)}T00:00:00.000Z`,
        source: 'IBKR'
      }));
    if (!normalized.length) return;
    const byDate = new Map((this.feeHistory[symbol] || []).map(row => [row.sourceDate || String(row.observedAt || '').slice(0, 10).replaceAll('-', ''), row]));
    normalized.forEach(row => byDate.set(row.sourceDate, row));
    const rows = [...byDate.values()]
      .filter(row => Date.parse(row.observedAt) >= Date.now() - 30 * 86400000)
      .sort((a, b) => String(a.sourceDate || '').localeCompare(String(b.sourceDate || '')));
    this.feeHistory[symbol] = rows;
    const latest = rows.at(-1);
    this.feeCurrent.set(symbol, { ...latest, observedAt: new Date().toISOString() });
    this.lastUpdatedAt = new Date().toISOString(); this.lastError = '';
    await this.persist(); this.emit('update', { symbol, feeCurrent: this.feeCurrent.get(symbol) });
  }
  recordLiveQuote(symbol, changes) {
    const previous = this.liveQuotes.get(symbol) || { symbol, source: 'IBKR' };
    const next = { ...previous, ...changes, symbol, source: 'IBKR', observedAt: new Date().toISOString() };
    this.liveQuotes.set(symbol, next);
    this.emit('quote', next);
  }
  handleMessage(fields) {
    const messageId = Number(fields[0]);
    // Gateway sends NEXT_VALID_ID after StartApi. Wait for it before market
    // data requests; sending reqMktData earlier can make Gateway drop the
    // first client session during initialization.
    if (messageId === 9) {
      this.apiReady = true;
      for (const symbol of this.subscriptions.keys()) { this.requestMarketData(symbol); this.requestFeeRate(symbol); }
      this.startFeeRefresh();
      return;
    }
    if (messageId === 4) {
      // Current Gateway sends ERR_MSG as [4, reqId, errorCode, errorText].
      // Retain compatibility with older versioned messages as well.
      const currentFormat = Number.isFinite(Number(fields[2])) && Number.isFinite(Number(fields[1]));
      const code = Number(currentFormat ? fields[2] : fields[3]);
      const detail = (currentFormat ? fields.slice(3) : fields.slice(4)).join(' ');
      // Connection-status notices are normal and do not mean this symbol is unavailable.
      if (![2103, 2104, 2106, 2108, 2158].includes(code)) {
        this.lastError = `IBKR ${code || 'message'}: ${detail || 'No detail supplied.'}`;
        this.emit('status', this.status());
      }
      console.log(`[IBKR Shortable] ${currentFormat ? fields.slice(2).join(' ') : fields.slice(3).join(' ')}`); return;
    }
    // Current Gateway tick messages omit a version: [id, reqId, tickType, value].
    // Accept both that and older versioned forms.
    const candidates = [
      { requestId: Number(fields[1]), tickType: Number(fields[2]), value: Number(fields[3]) },
      { requestId: Number(fields[2]), tickType: Number(fields[3]), value: Number(fields[4]) }
    ];
    const tick = candidates.find(candidate => candidate.tickType === 89 && this.requestToSymbol.has(candidate.requestId));
    if ((messageId === 2 || messageId === 45) && tick) {
      if (Number.isFinite(tick.value) && tick.value >= 0) void this.record(this.requestToSymbol.get(tick.requestId), Math.trunc(tick.value));
    }
    // Standard quote ticks are returned alongside generic tick 236. Current
    // Gateway packets omit the old version field, while older gateways keep
    // it, so use the same dual-shape parser as tick 89 above.
    const liveTick = candidates.find(candidate => this.requestToSymbol.has(candidate.requestId)
      && [1, 2, 4, 6, 7, 8, 9, 14].includes(candidate.tickType)
      && Number.isFinite(candidate.value) && candidate.value >= 0);
    if ((messageId === 1 || messageId === 2 || messageId === 45) && liveTick) {
      const symbol = this.requestToSymbol.get(liveTick.requestId);
      const fieldByTick = { 1: 'bid', 2: 'ask', 4: 'last', 6: 'high', 7: 'low', 8: 'volume', 9: 'previousClose', 14: 'open' };
      this.recordLiveQuote(symbol, { [fieldByTick[liveTick.tickType]]: liveTick.value });
    }
    // Historical-data reply: [17, reqId, start, end, count, date, open,
    // high, low, close, volume, barCount, WAP]. FEE_RATE close is a decimal.
    if (messageId === 17) {
      const requestId = Number(fields[1]); const symbol = this.feeRequestToSymbol.get(requestId);
      if (!symbol) return;
      const feeRate = Number(fields[9]); const sourceDate = String(fields[5] || ''); this.feeRequestToSymbol.delete(requestId);
      if (Number.isFinite(feeRate) && feeRate >= 0) void this.recordFeeRate(symbol, feeRate, sourceDate);
    }
  }
  async close() { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; clearInterval(this.feeRefreshTimer); this.feeRefreshTimer = null; this.socket?.destroy(); }
}
module.exports = { ShortableSharesService };

