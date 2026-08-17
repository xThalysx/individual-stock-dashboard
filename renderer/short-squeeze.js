(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ShortSqueeze = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const weights = { shortCrowding: 24, exitDifficulty: 16, borrowPressure: 18, optionsPressure: 13, technicalPressure: 15, volume: 14 };
  const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
  const clamp = (value, low = 0, high = 100) => Math.max(low, Math.min(high, value));
  const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const normalize = (value, points) => {
    const numeric = finite(value);
    if (numeric === null) return null;
    for (let index = 1; index < points.length; index += 1) {
      const [beforeX, beforeY] = points[index - 1], [afterX, afterY] = points[index];
      if (numeric <= afterX) return clamp(beforeY + (numeric - beforeX) / (afterX - beforeX) * (afterY - beforeY));
    }
    return points.at(-1)[1];
  };
  const percent = value => finite(value) === null ? null : finite(value) > 1 ? finite(value) : finite(value) * 100;

  function calculateAtr(highs = [], lows = [], closes = [], period = 14) {
    const ranges = closes.map((close, index) => {
      const high = finite(highs[index]) ?? close, low = finite(lows[index]) ?? close;
      const previous = index ? finite(closes[index - 1]) : null;
      return Math.max(high - low, previous === null ? 0 : Math.abs(high - previous), previous === null ? 0 : Math.abs(low - previous));
    }).filter(Number.isFinite);
    return average(ranges.slice(-period));
  }

  function resistanceLevels(closes = [], highs = [], lows = []) {
    const values = closes.map(finite).filter(Number.isFinite);
    if (values.length < 7) return [];
    const candidates = [];
    for (let index = 2; index < values.length - 2; index += 1) {
      const high = finite(highs[index]) ?? values[index];
      if (high >= (finite(highs[index - 1]) ?? values[index - 1]) && high >= (finite(highs[index - 2]) ?? values[index - 2]) && high >= (finite(highs[index + 1]) ?? values[index + 1]) && high >= (finite(highs[index + 2]) ?? values[index + 2])) candidates.push(high);
    }
    const tolerance = Math.max((Math.max(...values) - Math.min(...values)) * .025, Math.abs(values.at(-1)) * .0125, .01);
    return candidates.sort((a, b) => a - b).reduce((levels, value) => {
      const match = levels.find(level => Math.abs(level.value - value) <= tolerance);
      if (match) { match.value = (match.value * match.hits + value) / (match.hits + 1); match.hits += 1; }
      else levels.push({ value, hits: 1 });
      return levels;
    }, []).sort((a, b) => b.hits - a.hits).map(level => level.value);
  }

  function calculateAccelerationZone({ closes = [], highs = [], lows = [], callStrikes = [] } = {}) {
    const current = finite(closes.at(-1));
    if (current === null) return null;
    const atr = calculateAtr(highs, lows, closes);
    const recent = closes.slice(-252).map(finite).filter(Number.isFinite);
    const candidates = resistanceLevels(closes, highs, lows).concat(
      recent.length >= 20 ? [Math.max(...recent.slice(-20))] : [],
      recent.length >= 50 ? [Math.max(...recent.slice(-50))] : [],
      recent.length ? [Math.max(...recent)] : [],
      callStrikes.map(finite).filter(Number.isFinite)
    ).filter(value => value >= current * .97);
    if (!candidates.length) return null;
    const tolerance = Math.max((atr || 0) * .8, current * .0125, .01);
    const clusters = candidates.sort((a, b) => a - b).reduce((all, value) => {
      const cluster = all.find(item => Math.abs(item.center - value) <= tolerance);
      if (cluster) { cluster.values.push(value); cluster.center = average(cluster.values); }
      else all.push({ center: value, values: [value] });
      return all;
    }, []);
    const selected = clusters.sort((a, b) => Math.abs(a.center - current) - Math.abs(b.center - current) || b.values.length - a.values.length)[0];
    const halfWidth = Math.max((atr || 0) * .45, current * .006, .01);
    return { low: Math.max(0, selected.center - halfWidth), high: selected.center + halfWidth, center: selected.center, atr: atr || null, contributors: selected.values.length };
  }

  function scoreFactors(input = {}) {
    const shortFloat = percent(input.shortFloat);
    const shortFloatChange = percent(input.shortFloatChange);
    const daysToCover = finite(input.daysToCover);
    const relativeVolume = finite(input.relativeVolume);
    const sharesAvailable = finite(input.sharesAvailable);
    const sharesShort = finite(input.sharesShort);
    const borrowFeeRate = percent(input.borrowFeeRate);
    const current = finite(input.currentPrice);
    const zone = input.zone;
    const distanceToZone = current && zone ? (zone.low - current) / current * 100 : null;
    const shortCrowding = shortFloat === null ? null : clamp(normalize(shortFloat, [[0, 0], [5, 15], [10, 40], [20, 70], [35, 100]]) + Math.max(0, normalize(shortFloatChange ?? 0, [[-10, 0], [0, 0], [10, 12], [30, 25], [60, 35]]) || 0));
    const exitDifficulty = daysToCover === null ? null : normalize(daysToCover, [[0, 0], [1, 8], [3, 35], [5, 65], [8, 100]]);
    const optionsPressure = finite(input.callOi) !== null && finite(input.putOi) !== null ? normalize(finite(input.callOi) / Math.max(finite(input.putOi), 1), [[0, 0], [1, 25], [1.5, 55], [2.5, 100]]) : null;
    const technicalPressure = zone && current ? clamp(normalize(-distanceToZone, [[-15, 0], [-8, 20], [-3, 45], [0, 75], [3, 100]])) : null;
    const volume = relativeVolume === null ? null : normalize(relativeVolume, [[0, 0], [.8, 10], [1, 25], [1.5, 55], [2.5, 100]]);
    const availabilityPressure = sharesAvailable === null || sharesShort === null || sharesShort <= 0 ? null : normalize(sharesAvailable / sharesShort, [[0, 100], [.05, 95], [.2, 80], [.5, 60], [1, 40], [3, 15], [10, 0]]);
    const feePressure = borrowFeeRate === null ? null : normalize(borrowFeeRate, [[0, 0], [2, 8], [5, 22], [10, 48], [20, 75], [40, 100]]);
    const borrowParts = [availabilityPressure, feePressure].filter(Number.isFinite);
    const borrowPressure = borrowParts.length ? average(borrowParts) : null;
    return { shortCrowding, exitDifficulty, borrowPressure, availabilityPressure, feePressure, optionsPressure, technicalPressure, volume, distanceToZone };
  }

  function analyze(input = {}) {
    const factors = scoreFactors(input);
    const available = Object.entries(weights).filter(([key]) => Number.isFinite(factors[key]));
    const availableWeight = available.reduce((sum, [key]) => sum + weights[key], 0);
    const rawScore = availableWeight ? available.reduce((sum, [key]) => sum + factors[key] * weights[key], 0) / availableWeight : null;
    const coverage = Math.round(availableWeight / Object.values(weights).reduce((sum, value) => sum + value, 0) * 100);
    const score = rawScore === null ? null : Math.round(rawScore);
    const current = finite(input.currentPrice), zone = input.zone, relativeVolume = finite(input.relativeVolume);
    const sharesAvailable = finite(input.sharesAvailable), borrowFeeRate = percent(input.borrowFeeRate);
    const priceAboveZone = current && zone ? current > zone.high : false;
    const active = score !== null && score >= 75 && priceAboveZone && (relativeVolume === null || relativeVolume >= 1.5);
    const inZone = current && zone ? current >= zone.low && current <= zone.high : false;
    const status = active ? 'Active Squeeze' : score !== null && score >= 75 && (inZone || priceAboveZone) ? 'Acceleration' : score !== null && score >= 60 ? 'Ignition' : score !== null && score >= 40 ? 'Pressure Building' : 'Normal';
    const confidence = coverage >= 80 ? 'High' : coverage >= 50 ? 'Medium' : 'Low';
    return { score, coverage, confidence, status, factors, zone, data: { shortFloat: percent(input.shortFloat), shortFloatChange: percent(input.shortFloatChange), daysToCover: finite(input.daysToCover), sharesShort: finite(input.sharesShort), sharesAvailable, borrowFeeRate, relativeVolume, currentPrice: current, callOi: finite(input.callOi), putOi: finite(input.putOi) } };
  }
  return { analyze, calculateAccelerationZone, calculateAtr, resistanceLevels, scoreFactors };
});

