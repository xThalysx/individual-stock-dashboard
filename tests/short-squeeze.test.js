const assert = require('assert');
const Squeeze = require('../renderer/short-squeeze.js');
const zone = Squeeze.calculateAccelerationZone({ closes: [10, 10.2, 10.1, 10.5, 10.3, 10.6, 10.4, 10.7, 10.6], highs: [10.2, 10.4, 10.3, 10.9, 10.7, 11, 10.8, 11.1, 10.9], lows: [9.8, 10, 9.9, 10.2, 10, 10.3, 10.1, 10.4, 10.3] });
assert(zone && zone.high > zone.low, 'zone must be derived from valid prices');
const low = Squeeze.analyze({ shortFloat: .03, daysToCover: .4, currentPrice: 10, zone, relativeVolume: .7 });
const elevated = Squeeze.analyze({ shortFloat: .17, shortFloatChange: .18, daysToCover: 4, currentPrice: 10.5, zone, relativeVolume: 1.7 });
const high = Squeeze.analyze({ shortFloat: .36, shortFloatChange: .5, daysToCover: 8, borrowFee: .7, utilization: .98, callOi: 5000, putOi: 1000, currentPrice: zone.high * 1.04, zone, relativeVolume: 3 });
assert(low.score < elevated.score && elevated.score < high.score, 'scores should increase with squeeze pressure');
assert(high.status === 'Active Squeeze', 'high score requires price confirmation for Active Squeeze');
assert(Squeeze.analyze({ shortFloat: .4, daysToCover: 9 }).coverage === 40, 'missing automatically retrieved inputs must lower coverage');
console.log('short-squeeze tests passed');

