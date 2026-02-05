const passesFilters = (alert, user) => {
  const minWinRate = user.min_win_rate ?? user.minWinRate ?? 0;
  const minEV = user.min_ev ?? user.minEV ?? -100;
  const minSampleSize = user.min_sample_size ?? user.minSampleSize ?? 0;

  const winRate = alert.winRate ?? alert.wr ?? 0;
  const ev = alert.ev ?? 0;
  const sampleSize = alert.sampleSize ?? alert.n ?? 0;
  
  console.log(`Filter check: WR ${winRate}>=${minWinRate}, EV ${ev}>=${minEV}, n ${sampleSize}>=${minSampleSize}`);
  
  if (winRate < minWinRate) return false;
  if (ev < minEV) return false;
  if (sampleSize < minSampleSize) return false;
  return true;
};

module.exports = { passesFilters };
