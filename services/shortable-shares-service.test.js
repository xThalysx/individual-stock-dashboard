const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { ShortableSharesService } = require('./shortable-shares-service');

(async () => {
  const storagePath = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'ibkr-shortable-')), 'history.json');
  const service = new ShortableSharesService({ storagePath });

  // Gateway's v100+ server-version reply is a normal length-prefixed frame.
  // The client must wait for the full frame before emitting StartApi.
  const handshakeWrites = [];
  service.socket = { destroyed: false, write: value => handshakeWrites.push(value) };
  const handshakePayload = Buffer.from('178\0' + '20260812 18:00:00\0');
  const handshakeFrame = Buffer.alloc(4 + handshakePayload.length);
  handshakeFrame.writeUInt32BE(handshakePayload.length, 0);
  handshakePayload.copy(handshakeFrame, 4);
  service.onData(handshakeFrame.subarray(0, 3));
  assert.strictEqual(service.connected, false, 'partial handshake must not connect early');
  service.onData(handshakeFrame.subarray(3));
  assert.strictEqual(service.connected, true, 'full handshake establishes the API session');
  assert.strictEqual(handshakeWrites.length, 1, 'StartApi is sent once after the handshake');
  assert.strictEqual(handshakeWrites[0].subarray(4).toString('utf8'), '71\0' + '2\0' + '73\0\0');
  service.connected = false;
  service.socket = null;

  await service.record('HTZ', 250000);
  await service.record('HTZ', 250000);
  await service.record('HTZ', 180000);
  const stored = JSON.parse(await fs.readFile(storagePath, 'utf8'));
  assert.strictEqual(stored.history.HTZ.length, 2, 'unchanged availability must not create a duplicate row');
  assert.strictEqual(stored.history.HTZ[1].sharesAvailable, 180000);

  await service.recordFeeRate('HTZ', .2304);
  await service.recordFeeRate('HTZ', .2304);
  const storedFee = JSON.parse(await fs.readFile(storagePath, 'utf8'));
  assert.strictEqual(storedFee.feeHistory.HTZ.length, 1, 'unchanged fee must not create a duplicate row');
  assert.strictEqual(storedFee.feeHistory.HTZ[0].feeRate, .2304);

  service.requestToSymbol.set(7, 'HTZ');
  service.handleMessage(['2', '1', '7', '88', '999999']);
  assert.strictEqual(service.current.get('HTZ').sharesAvailable, 180000, 'only tick type 89 is accepted');
  service.handleMessage(['2', '1', '7', '89', '175000']);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.strictEqual(service.current.get('HTZ').sharesAvailable, 175000);

  service.feeRequestToSymbol.set(12, 'HTZ');
  service.handleMessage(['17', '12', 'start', 'end', '1', '20260813', '.21', '.23', '.20', '.225', '-1', '-1', '-1']);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.strictEqual(service.feeCurrent.get('HTZ').feeRate, .225, 'FEE_RATE close is persisted as the latest fee');

  await service.close();
  console.log('shortable-shares-service test passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

