const passesFilters = (alert, userFilters) => {
  const { minWinRate = 0, minEV = -100, minSampleSize = 0 } = userFilters;
  const winRate = alert.winRate ?? alert.wr ?? 0;
  const ev = alert.ev ?? 0;
  const sampleSize = alert.sampleSize ?? alert.n ?? 0;
  
  if (winRate < minWinRate) return false;
  if (ev < minEV) return false;
  if (sampleSize < minSampleSize) return false;
  return true;
};

module.exports = { passesFilters };
