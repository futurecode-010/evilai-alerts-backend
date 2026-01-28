/**
 * ALERT PARSER SERVICE
 * 
 * This parses incoming TradingView webhook messages and extracts
 * all the relevant data (price, targets, stats, etc.)
 * 
 * Expected format from your Pine Script:
 * "B↑ ENTRY | Price: 21500 | TP: 21560 | TP1: 21530 | SL: 21475 | WR: 62% | EV: 3.2 | R:R: 2.4 | n=15"
 */

function parseAlert(rawMessage) {
  // Handle different input types
  let message;
  if (typeof rawMessage === 'string') {
    message = rawMessage;
  } else if (typeof rawMessage === 'object') {
    // If TradingView sends JSON, convert to string
    message = JSON.stringify(rawMessage);
  } else {
    throw new Error('Invalid message format');
  }
  
  console.log('📨 Parsing alert:', message);
  
  // Initialize result object with defaults
  const parsed = {
    raw: message,
    signalType: null,      // 'B' or 'A'
    direction: null,       // 'bullish' or 'bearish'
    price: null,
    target: null,
    tp1: null,
    stop: null,
    winRate: null,
    ev: null,
    rr: null,
    sampleSize: null,
    timestamp: new Date().toISOString(),
    isValid: false         // Will be true if we successfully parsed a signal
  };
  
  // =====================================================
  // STEP 1: Detect signal type and direction
  // =====================================================
  
  if (message.includes('B↑') || message.includes('B Bull')) {
    parsed.signalType = 'B';
    parsed.direction = 'bullish';
    parsed.isValid = true;
  } else if (message.includes('B↓') || message.includes('B Bear')) {
    parsed.signalType = 'B';
    parsed.direction = 'bearish';
    parsed.isValid = true;
  } else if (message.includes('A↑') || message.includes('A Bull')) {
    parsed.signalType = 'A';
    parsed.direction = 'bullish';
    parsed.isValid = true;
  } else if (message.includes('A↓') || message.includes('A Bear')) {
    parsed.signalType = 'A';
    parsed.direction = 'bearish';
    parsed.isValid = true;
  }
  
  if (!parsed.isValid) {
    console.log('⚠️ Could not detect signal type in message');
    return parsed;
  }
  
  // =====================================================
  // STEP 2: Extract numeric values using regex patterns
  // =====================================================
  
  // Helper function to extract a number after a label
  const extractNumber = (pattern) => {
    const match = message.match(pattern);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
    return null;
  };
  
  // Price: looks for "Price: 21500" or "Price:21500"
  parsed.price = extractNumber(/Price:\s*([\d.]+)/i);
  
  // Target (TP/Target): looks for "TP: 21560" or "Target: 21560"
  parsed.target = extractNumber(/(?:TP|Target):\s*([\d.]+)/i);
  
  // TP1 (50% target): looks for "TP1: 21530"
  parsed.tp1 = extractNumber(/TP1:\s*([\d.]+)/i);
  
  // Stop Loss: looks for "SL: 21475" or "Stop: 21475"
  parsed.stop = extractNumber(/(?:SL|Stop):\s*([\d.]+)/i);
  
  // Win Rate: looks for "WR: 62%" or "WR: 62"
  parsed.winRate = extractNumber(/WR:\s*([\d.]+)%?/i);
  
  // Expected Value: looks for "EV: 3.2" or "EV: -1.5"
  parsed.ev = extractNumber(/EV:\s*([-\d.]+)/i);
  
  // Risk/Reward: looks for "R:R: 2.4" or "RR: 2.4"
  parsed.rr = extractNumber(/R:?R:\s*([\d.]+)/i);
  
  // Sample Size: looks for "n=15" or "n: 15"
  parsed.sampleSize = extractNumber(/n[=:]\s*(\d+)/i);
  
  // =====================================================
  // STEP 3: Log what we found
  // =====================================================
  
  console.log('✅ Parsed alert:', {
    type: `${parsed.signalType}${parsed.direction === 'bullish' ? '↑' : '↓'}`,
    price: parsed.price,
    tp1: parsed.tp1,
    stop: parsed.stop,
    winRate: parsed.winRate ? `${parsed.winRate}%` : null,
    ev: parsed.ev,
    sampleSize: parsed.sampleSize
  });
  
  return parsed;
}

module.exports = { parseAlert };