// NDS Controller State
const state = {
  buttons: {
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
    x: false,
    y: false,
    l: false,
    r: false,
    start: false,
    select: false
  },
  touchscreen: {
    x: 0,
    y: 0,
    touched: false
  }
};

// Settings
const settings = {
  serverHost: 'localhost',
  serverPort: 8080,
  connectionType: 'websocket',
  pollingRate: 60,
  hapticEnabled: true
};

// Connection
let ws = null;
let connected = false;
let pollingInterval = null;
let packetCount = 0;
let lastPingTime = 0;
let currentLatency = 0;

// DOM Elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const pollingRateDisplay = document.getElementById('pollingRate');
const latencyDisplay = document.getElementById('latency');
const packetsSentDisplay = document.getElementById('packetsSent');
const settingsModal = document.getElementById('settingsModal');
const helpModal = document.getElementById('helpModal');
const touchscreen = document.getElementById('touchscreen');
const touchIndicator = document.getElementById('touchIndicator');
const debugLog = document.getElementById('debugLog');

// Initialize
function init() {
  setupButtons();
  setupTouchscreen();
  setupModals();
  setupSettings();
  setupButtonStyleCustomization();
  setupNetworkScan();
  preventDefaultTouchBehavior();
  loadSettings();
  log('Controller initialized');
}

// Setup button event listeners
function setupButtons() {
  const buttons = document.querySelectorAll('[data-button]');
  buttons.forEach(button => {
    const buttonName = button.dataset.button;
    
    // Mouse events
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      pressButton(buttonName, button);
    });
    button.addEventListener('mouseup', (e) => {
      e.preventDefault();
      releaseButton(buttonName, button);
    });
    button.addEventListener('mouseleave', () => {
      releaseButton(buttonName, button);
    });
    
    // Touch events
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      pressButton(buttonName, button);
    }, { passive: false });
    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      releaseButton(buttonName, button);
    }, { passive: false });
    button.addEventListener('touchcancel', () => {
      releaseButton(buttonName, button);
    });
  });
}

// Press button
function pressButton(buttonName, element) {
  if (!state.buttons[buttonName]) {
    state.buttons[buttonName] = true;
    element.classList.add('pressed');
    hapticFeedback();
    sendState();
  }
}

// Release button
function releaseButton(buttonName, element) {
  if (state.buttons[buttonName]) {
    state.buttons[buttonName] = false;
    element.classList.remove('pressed');
    sendState();
  }
}

// Setup touchscreen
function setupTouchscreen() {
  touchscreen.addEventListener('touchstart', handleTouch, { passive: false });
  touchscreen.addEventListener('touchmove', handleTouch, { passive: false });
  touchscreen.addEventListener('touchend', handleTouchEnd, { passive: false });
  touchscreen.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  touchscreen.addEventListener('mousedown', handleMouse);
  touchscreen.addEventListener('mousemove', handleMouseMove);
  touchscreen.addEventListener('mouseup', handleMouseEnd);
  touchscreen.addEventListener('mouseleave', handleMouseEnd);
}

let isTouching = false;
let isMouseDown = false;

function handleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  if (!touch) return;
  
  const rect = touchscreen.getBoundingClientRect();
  const x = Math.floor(((touch.clientX - rect.left) / rect.width) * 256);
  const y = Math.floor(((touch.clientY - rect.top) / rect.height) * 192);
  
  state.touchscreen.x = Math.max(0, Math.min(255, x));
  state.touchscreen.y = Math.max(0, Math.min(191, y));
  state.touchscreen.touched = true;
  
  updateTouchIndicator(touch.clientX - rect.left, touch.clientY - rect.top);
  sendState();
  isTouching = true;
}

function handleTouchEnd(e) {
  e.preventDefault();
  state.touchscreen.touched = false;
  touchIndicator.classList.remove('active');
  sendState();
  isTouching = false;
}

function handleMouse(e) {
  isMouseDown = true;
  updateMousePosition(e);
}

function handleMouseMove(e) {
  if (isMouseDown) {
    updateMousePosition(e);
  }
}

function handleMouseEnd() {
  if (isMouseDown) {
    isMouseDown = false;
    state.touchscreen.touched = false;
    touchIndicator.classList.remove('active');
    sendState();
  }
}

function updateMousePosition(e) {
  const rect = touchscreen.getBoundingClientRect();
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * 256);
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * 192);
  
  state.touchscreen.x = Math.max(0, Math.min(255, x));
  state.touchscreen.y = Math.max(0, Math.min(191, y));
  state.touchscreen.touched = true;
  
  updateTouchIndicator(e.clientX - rect.left, e.clientY - rect.top);
  sendState();
}

function updateTouchIndicator(x, y) {
  touchIndicator.style.left = x + 'px';
  touchIndicator.style.top = y + 'px';
  touchIndicator.classList.add('active');
}

// Setup modals
function setupModals() {
  document.getElementById('settingsBtn').addEventListener('click', () => {
    settingsModal.classList.add('active');
  });
  
  document.getElementById('helpBtn').addEventListener('click', () => {
    helpModal.classList.add('active');
  });
  
  document.getElementById('closeSettings').addEventListener('click', () => {
    settingsModal.classList.remove('active');
  });
  
  document.getElementById('closeHelp').addEventListener('click', () => {
    helpModal.classList.remove('active');
  });
  
  // Close on background click
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove('active');
    }
  });
  
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      helpModal.classList.remove('active');
    }
  });
}

// Setup settings
function setupSettings() {
  const serverHost = document.getElementById('serverHost');
  const serverPort = document.getElementById('serverPort');
  const connectionType = document.getElementById('connectionType');
  const pollingRateSlider = document.getElementById('pollingRateSlider');
  const pollingRateValue = document.getElementById('pollingRateValue');
  const hapticFeedback = document.getElementById('hapticFeedback');
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  
  // Load current settings
  serverHost.value = settings.serverHost;
  serverPort.value = settings.serverPort;
  connectionType.value = settings.connectionType;
  pollingRateSlider.value = settings.pollingRate;
  pollingRateValue.textContent = settings.pollingRate;
  hapticFeedback.checked = settings.hapticEnabled;
  
  // Update settings
  serverHost.addEventListener('input', () => {
    settings.serverHost = serverHost.value;
    saveSettings();
  });
  
  serverPort.addEventListener('input', () => {
    settings.serverPort = parseInt(serverPort.value);
    saveSettings();
  });
  
  connectionType.addEventListener('change', () => {
    settings.connectionType = connectionType.value;
    saveSettings();
  });
  
  pollingRateSlider.addEventListener('input', () => {
    settings.pollingRate = parseInt(pollingRateSlider.value);
    pollingRateValue.textContent = settings.pollingRate;
    saveSettings();
    if (connected) {
      stopPolling();
      startPolling();
    }
  });
  
  hapticFeedback.addEventListener('change', () => {
    settings.hapticEnabled = hapticFeedback.checked;
    saveSettings();
  });
  
  connectBtn.addEventListener('click', connect);
  disconnectBtn.addEventListener('click', disconnect);
}

// ===== Button Style Customization =====
function setupButtonStyleCustomization() {
  const buttonSizeRange = document.getElementById('button-size-range');
  const buttonSizeValue = document.getElementById('button-size-value');
  const buttonColorPicker = document.getElementById('button-color-picker');
  
  // Load saved preferences or defaults
  let buttonSize = localStorage.getItem('nds_button_size') || '64';
  let buttonColor = localStorage.getItem('nds_button_color') || '#222222';
  
  buttonSizeRange.value = buttonSize;
  buttonSizeValue.textContent = buttonSize;
  buttonColorPicker.value = buttonColor;
  
  function applyButtonStyles() {
    const buttons = document.querySelectorAll('.nds-button, .shoulder-btn, .control-btn');
    buttons.forEach(btn => {
      if (btn.classList.contains('center')) return; // Skip center indicator
      btn.style.width = `${buttonSize}px`;
      btn.style.height = `${buttonSize}px`;
      btn.style.backgroundColor = buttonColor;
    });
  }
  
  buttonSizeRange.addEventListener('input', (e) => {
    buttonSize = e.target.value;
    buttonSizeValue.textContent = buttonSize;
    localStorage.setItem('nds_button_size', buttonSize);
    applyButtonStyles();
  });
  
  buttonColorPicker.addEventListener('input', (e) => {
    buttonColor = e.target.value;
    localStorage.setItem('nds_button_color', buttonColor);
    applyButtonStyles();
  });
  
  // Apply styles on load
  applyButtonStyles();
}

// ===== Local Network WebSocket Server Scan =====
function setupNetworkScan() {
  const scanButton = document.getElementById('scan-button');
  
  scanButton.addEventListener('click', async () => {
    const resultsList = document.getElementById('scan-results');
    resultsList.innerHTML = '<li>Scanning... please wait.</li>';
    try {
      const servers = await scanForServers(8080);
      if (servers.length === 0) {
        resultsList.innerHTML = '<li>No servers found on network.</li>';
      }
    } catch (err) {
      console.error('Scan failed:', err);
      resultsList.innerHTML = '<li>Scan failed. Check console.</li>';
    }
  });
}

async function getLocalIP() {
  return new Promise((resolve, reject) => {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    pc.createOffer().then(sdp => pc.setLocalDescription(sdp));
    pc.onicecandidate = (event) => {
      if (!event || !event.candidate) return;
      const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
      const ipMatch = ipRegex.exec(event.candidate.candidate);
      if (ipMatch) {
        pc.close();
        resolve(ipMatch[1]);
      }
    };
  });
}

async function scanForServers(port = 8080, timeout = 800) {
  const localIP = await getLocalIP();
  if (!localIP) throw new Error('Unable to get local IP');
  
  const parts = localIP.split('.');
  parts.pop();
  const baseIP = parts.join('.') + '.';
  
  const candidates = [];
  for (let i = 1; i <= 254; i++) {
    candidates.push(baseIP + i);
  }
  
  const foundServers = [];
  const scanPromises = candidates.map(ip => new Promise(resolve => {
    const url = `ws://${ip}:${port}`;
    let completed = false;
    const ws = new WebSocket(url);
    
    const timer = setTimeout(() => {
      if (!completed) {
        completed = true;
        ws.close();
        resolve(null);
      }
    }, timeout);
    
    ws.onopen = () => {
      if (!completed) {
        completed = true;
        clearTimeout(timer);
        ws.close();
        resolve(ip);
      }
    };
    
    ws.onerror = () => {
      if (!completed) {
        completed = true;
        clearTimeout(timer);
        resolve(null);
      }
    };
  }));
  
  // Update UI as results come
  scanPromises.forEach(promise => promise.then(ip => {
    if (ip) {
      foundServers.push(ip);
      updateScanResults(foundServers);
    }
  }));
  
  await Promise.all(scanPromises);
  return foundServers;
}

function updateScanResults(servers) {
  const list = document.getElementById('scan-results');
  if (!list) return;
  list.innerHTML = '';
  servers.forEach(ip => {
    const li = document.createElement('li');
    li.textContent = ip;
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => {
      document.getElementById('serverHost').value = ip;
      if (typeof connect === 'function') {
        connect();
      }
    });
    list.appendChild(li);
  });
}

// Save settings to memory
function saveSettings() {
  log('Settings saved');
}

// Load settings from memory
function loadSettings() {
  // Already loaded in setupSettings()
}

// Connect to server
function connect() {
  if (connected) {
    log('Already connected');
    return;
  }
  
  log(`Connecting to ${settings.serverHost}:${settings.serverPort}...`);
  if (settings.connectionType === 'websocket') {
    connectWebSocket();
  } else {
    connectHTTP();
  }
}

// Connect via WebSocket
function connectWebSocket() {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${settings.serverHost}:${settings.serverPort}`;
    ws = new WebSocket(url);
    
    ws.onopen = () => {
      connected = true;
      updateConnectionStatus(true);
      log('Connected via WebSocket');
      startPolling();
    };
    
    ws.onclose = () => {
      connected = false;
      updateConnectionStatus(false);
      log('Disconnected');
      stopPolling();
      
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (!connected) {
          log('Attempting to reconnect...');
          connect();
        }
      }, 3000);
    };
    
    ws.onerror = (error) => {
      log(`WebSocket error: ${error.message || 'Connection failed'}`);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') {
          currentLatency = Date.now() - lastPingTime;
          const latencyDisplay = document.getElementById('latency');
          if (latencyDisplay) {
            latencyDisplay.textContent = currentLatency + ' ms';
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };
  } catch (error) {
    log(`Connection error: ${error.message}`);
    connected = false;
    updateConnectionStatus(false);
  }
}

// Connect via HTTP (polling)
function connectHTTP() {
  const url = `http://${settings.serverHost}:${settings.serverPort}/test`;
  fetch(url, { method: 'GET', mode: 'no-cors' })
    .then(() => {
      connected = true;
      updateConnectionStatus(true);
      log('Connected via HTTP');
      startPolling();
    })
    .catch((error) => {
      log(`HTTP connection error: ${error.message}`);
      connected = false;
      updateConnectionStatus(false);
    });
}

// Disconnect
function disconnect() {
  if (!connected) {
    log('Not connected');
    return;
  }
  
  if (ws) {
    ws.close();
    ws = null;
  }
  
  connected = false;
  updateConnectionStatus(false);
  stopPolling();
  log('Disconnected');
}

// Update connection status UI
function updateConnectionStatus(isConnected) {
  if (isConnected) {
    statusDot.classList.add('connected');
    statusText.textContent = 'Connected';
  } else {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Disconnected';
    const latencyDisplay = document.getElementById('latency');
    if (latencyDisplay) {
      latencyDisplay.textContent = '-- ms';
    }
  }
}

// Start polling
function startPolling() {
  const interval = 1000 / settings.pollingRate;
  pollingInterval = setInterval(() => {
    sendState();
  }, interval);
}

// Stop polling
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// Send state to server
function sendState() {
  if (!connected) return;
  
  const data = {
    buttons: { ...state.buttons },
    touchscreen: { ...state.touchscreen }
  };
  
  const json = JSON.stringify(data);
  
  if (settings.connectionType === 'websocket' && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(json);
    packetCount++;
    const packetsSentDisplay = document.getElementById('packetsSent');
    if (packetsSentDisplay) {
      packetsSentDisplay.textContent = packetCount.toString();
    }
    
    // Send ping every 30 packets for latency measurement
    if (packetCount % 30 === 0) {
      lastPingTime = Date.now();
      ws.send(JSON.stringify({ type: 'ping', timestamp: lastPingTime }));
    }
  } else if (settings.connectionType === 'http') {
    const url = `http://${settings.serverHost}:${settings.serverPort}/controller`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      mode: 'no-cors'
    }).then(() => {
      packetCount++;
      const packetsSentDisplay = document.getElementById('packetsSent');
      if (packetsSentDisplay) {
        packetsSentDisplay.textContent = packetCount.toString();
      }
    }).catch(() => {
      // Ignore errors
    });
  }
}

// Haptic feedback
function hapticFeedback() {
  if (!settings.hapticEnabled) return;
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// Logging
function log(message) {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `[${time}] ${message}`;
  debugLog.appendChild(entry);
  debugLog.scrollTop = debugLog.scrollHeight;
  
  // Keep only last 50 entries
  while (debugLog.children.length > 50) {
    debugLog.removeChild(debugLog.firstChild);
  }
}

// Prevent default touch behavior
function preventDefaultTouchBehavior() {
  document.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });
  
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('gestureend', (e) => {
    e.preventDefault();
  });
}

// Request fullscreen
function requestFullscreen() {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen();
  }
}

// Keyboard support (optional)
document.addEventListener('keydown', (e) => {
  const keyMap = {
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'z': 'a',
    'x': 'b',
    'a': 'x',
    's': 'y',
    'q': 'l',
    'w': 'r',
    'Enter': 'start',
    'Shift': 'select'
  };
  
  const button = keyMap[e.key];
  if (button && !e.repeat) {
    const element = document.querySelector(`[data-button="${button}"]`);
    if (element) {
      pressButton(button, element);
    }
  }
});

document.addEventListener('keyup', (e) => {
  const keyMap = {
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'z': 'a',
    'x': 'b',
    'a': 'x',
    's': 'y',
    'q': 'l',
    'w': 'r',
    'Enter': 'start',
    'Shift': 'select'
  };
  
  const button = keyMap[e.key];
  if (button) {
    const element = document.querySelector(`[data-button="${button}"]`);
    if (element) {
      releaseButton(button, element);
    }
  }
});

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
