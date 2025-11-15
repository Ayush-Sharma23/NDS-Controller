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
        pollingRateDisplay.textContent = settings.pollingRate + ' Hz';
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

// Save settings to memory
function saveSettings() {
    log('Settings saved');
}

// Load settings from memory
function loadSettings() {
    pollingRateDisplay.textContent = settings.pollingRate + ' Hz';
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
            // Handle server responses (pong for latency measurement)
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'pong') {
                    currentLatency = Date.now() - lastPingTime;
                    latencyDisplay.textContent = currentLatency + ' ms';
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
    // Test connection
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
        latencyDisplay.textContent = '-- ms';
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
        packetsSentDisplay.textContent = packetCount.toString();
        
        // Send ping every 30 packets for latency measurement
        if (packetCount % 30 === 0) {
            lastPingTime = Date.now();
            ws.send(JSON.stringify({ type: 'ping', timestamp: lastPingTime }));
        }
    } else if (settings.connectionType === 'http') {
        // Send via HTTP POST
        const url = `http://${settings.serverHost}:${settings.serverPort}/controller`;
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: json,
            mode: 'no-cors'
        }).then(() => {
            packetCount++;
            packetsSentDisplay.textContent = packetCount.toString();
        }).catch(() => {
            // Ignore errors in no-cors mode
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
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
    
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