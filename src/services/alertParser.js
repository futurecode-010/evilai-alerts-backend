const SESSION_MAP = {
  1: 'Asian (18:00-02:00)',
  2: 'London (03:00-08:20)',
  3: 'NY (08:20-13:30)',
  4: 'Extended NY (08:20-17:00)',
  5: 'Custom'
};

const EM_MAP = {
  1: 'GC Scalp',
  2: 'GC Intraday',
  3: 'GC Swing'
};

const formatTimeframe = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}H`;
  return `${Math.floor(seconds / 86400)}D`;
};

const parse = (data) => {
  try {
    const alert = typeof data === 'string' ? JSON.parse(data) : data;
    
    if (alert.signal && alert.action) {
      const isA = alert.signal.startsWith('A_');
      const isLong = alert.signal.endsWith('_LONG');
      
      return {
        type: isA ? (isLong ? 'A↑' : 'A↓') : (isLong ? 'B↑' : 'B↓'),
        setup: isA ? 'A' : 'B',
        direction: isLong ? 'bullish' : 'bearish',
        action: alert.action,
        price: parseFloat(alert.price) || null,
        target: parseFloat(alert.target) || null,
        tp1: parseFloat(alert.tp1) || null,
        stop: parseFloat(alert.stop) || null,
        entry: parseFloat(alert.entry) || null,
        exit: parseFloat(alert.exit) || null,
        winRate: parseInt(alert.wr) || 0,
        ev: parseFloat(alert.ev) || 0,
        sampleSize: parseInt(alert.n) || 0,
        session: SESSION_MAP[alert.session] || 'Unknown',
        sessionId: parseInt(alert.session) || 0,
        emMode: EM_MAP[alert.em] || 'Unknown',
        emId: parseInt(alert.em) || 0,
        timeframe: formatTimeframe(parseInt(alert.tf) || 0),
        timeframeSecs: parseInt(alert.tf) || 0,
        raw: alert
      };
    }
    
    if (alert.message) {
      const regex = /^(A[↑↓]|B[↑↓])\s+ENTRY\s*\|\s*Price:\s*([\d.]+)\s*\|\s*TP:\s*([\d.]+)\s*\|\s*SL:\s*([\d.]+)\s*\|\s*WR:\s*(\d+)%?\s*\|\s*EV:\s*([\d.-]+)\s*\|\s*n=(\d+)/i;
      const match = alert.message.match(regex);
      if (match) {
        return {
          type: match[1],
          setup: match[1].startsWith('A') ? 'A' : 'B',
          direction: match[1].includes('↑') ? 'bullish' : 'bearish',
          action: 'ENTRY',
          price: parseFloat(match[2]),
          target: parseFloat(match[3]),
          stop: parseFloat(match[4]),
          winRate: parseInt(match[5]),
          ev: parseFloat(match[6]),
          sampleSize: parseInt(match[7]),
          raw: alert
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Parse error:', error);
    return null;
  }
};

module.exports = { parse, SESSION_MAP, EM_MAP, formatTimeframe };
