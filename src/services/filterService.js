/**
 * FILTER SERVICE
 * 
 * This determines whether a specific user should receive a notification
 * based on their filter preferences.
 */

function shouldNotifyUser(user, alert) {
  // =====================================================
  // STEP 1: Check if signal type is enabled
  // =====================================================
  
  if (alert.signalType === 'B' && alert.direction === 'bullish') {
    if (!user.enable_b_bullish) {
      return { notify: false, reason: 'B↑ signals disabled' };
    }
  }
  
  if (alert.signalType === 'B' && alert.direction === 'bearish') {
    if (!user.enable_b_bearish) {
      return { notify: false, reason: 'B↓ signals disabled' };
    }
  }
  
  if (alert.signalType === 'A' && alert.direction === 'bullish') {
    if (!user.enable_a_bullish) {
      return { notify: false, reason: 'A↑ signals disabled' };
    }
  }
  
  if (alert.signalType === 'A' && alert.direction === 'bearish') {
    if (!user.enable_a_bearish) {
      return { notify: false, reason: 'A↓ signals disabled' };
    }
  }
  
  // =====================================================
  // STEP 2: Check sample size (required for all filter modes)
  // =====================================================
  
  if (alert.sampleSize !== null && alert.sampleSize < user.min_sample_size) {
    return { 
      notify: false, 
      reason: `Sample size ${alert.sampleSize} < minimum ${user.min_sample_size}` 
    };
  }
  
  // =====================================================
  // STEP 3: Apply filter based on user's selected mode
  // =====================================================
  
  const filterMode = user.filter_mode || 'NONE';
  
  // Helper variables
  const passesWinRate = alert.winRate === null || alert.winRate >= user.min_win_rate;
  const passesEV = alert.ev === null || alert.ev >= user.min_ev;
  
  switch (filterMode) {
    case 'NONE':
      // No filtering - send everything
      return { notify: true, reason: 'No filter applied' };
      
    case 'WR':
      // Only check win rate
      if (!passesWinRate) {
        return { 
          notify: false, 
          reason: `Win rate ${alert.winRate}% < minimum ${user.min_win_rate}%` 
        };
      }
      return { notify: true, reason: 'Passed WR filter' };
      
    case 'EV':
      // Only check expected value
      if (!passesEV) {
        return { 
          notify: false, 
          reason: `EV ${alert.ev} < minimum ${user.min_ev}` 
        };
      }
      return { notify: true, reason: 'Passed EV filter' };
      
    case 'BOTH':
      // Must pass BOTH win rate AND EV
      if (!passesWinRate) {
        return { 
          notify: false, 
          reason: `Win rate ${alert.winRate}% < minimum ${user.min_win_rate}%` 
        };
      }
      if (!passesEV) {
        return { 
          notify: false, 
          reason: `EV ${alert.ev} < minimum ${user.min_ev}` 
        };
      }
      return { notify: true, reason: 'Passed BOTH filters' };
      
    case 'EITHER':
      // Must pass win rate OR EV (at least one)
      if (passesWinRate || passesEV) {
        return { notify: true, reason: 'Passed at least one filter' };
      }
      return { 
        notify: false, 
        reason: `Failed both filters: WR ${alert.winRate}% < ${user.min_win_rate}% AND EV ${alert.ev} < ${user.min_ev}` 
      };
      
    default:
      // Unknown filter mode - default to sending
      console.log(`⚠️ Unknown filter mode: ${filterMode}, defaulting to notify`);
      return { notify: true, reason: 'Unknown filter mode, defaulting to notify' };
  }
}

module.exports = { shouldNotifyUser };