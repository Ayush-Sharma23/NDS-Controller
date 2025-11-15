const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
require('dotenv').config();
const { execSync } = require('child_process');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Button to keyboard key mapping
// Configure these keys to match your DeSmuME control settings
const BUTTON_MAPPING = {
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  a: 'x',           // DeSmuME default: X key for A button
  b: 'z',           // DeSmuME default: Z key for B button
  x: 's',           // DeSmuME default: S key for X button
  y: 'a',           // DeSmuME default: A key for Y button
  l: 'q',           // DeSmuME default: Q key for L button
  r: 'w',           // DeSmuME default: W key for R button
  start: 'Return',  // DeSmuME default: Enter for Start
  select: 'space'   // DeSmuME default: Space for Select
};

// Track currently pressed buttons
const pressedButtons = new Set();

// Send keyboard input to DeSmuME window
//function sendKeyPress(key, isPressed) {
  //try {
    //// Find DeSmuME window
    //const windowSearch = execSync('xdotool search --name "DeSmuME" --class "Wine"').toString().trim();
    
    //if (!windowSearch) {
      //console.log('DeSmuME window not found');
      //return;
    //}

    //const windowId = windowSearch.split('\n');
    
    //if (isPressed) {
      //execSync(`xdotool keydown --window ${windowId} ${key}`);
    //} else {
      //execSync(`xdotool keyup --window ${windowId} ${key}`);
    //}
  //} catch (error) {
    //console.error(`Error sending key ${key}:`, error.message);
  //}
//}
// Send keyboard input to DeSmuME window
function sendKeyPress(key, isPressed) {
  try {
    // Try to find DeSmuME window - multiple methods for compatibility
    let windowId = null;
    
    try {
      // Method 1: Search by name only (most compatible)
      const search1 = execSync('xdotool search --name "DeSmuME" 2>/dev/null').toString().trim();
      if (search1) {
        windowId = search1.split('\n')[0];
      }
    } catch (e) {}
    
    // Method 2: Try alternative names
    if (!windowId) {
      try {
        const search2 = execSync('xdotool search --name "desmume" 2>/dev/null').toString().trim();
        if (search2) {
          windowId = search2.split('\n')[0];
        }
      } catch (e) {}
    }
    
    // Method 3: Search by window name pattern
    if (!windowId) {
      try {
        const search3 = execSync('xdotool search --name "Wine" 2>/dev/null').toString().trim();
        if (search3) {
          windowId = search3.split('\n')[0];
        }
      } catch (e) {}
    }
    
    if (!windowId) {
      // Silently fail - window not found
      return;
    }

    if (isPressed) {
      execSync(`xdotool keydown --window ${windowId} ${key} 2>/dev/null`);
    } else {
      execSync(`xdotool keyup --window ${windowId} ${key} 2>/dev/null`);
    }
  } catch (error) {
    // Silently fail on error
  }
}


// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    try {
      const input = JSON.parse(data);
      const { buttons } = input;

      if (!buttons) return;

      // Process each button
      for (const [buttonName, isPressed] of Object.entries(buttons)) {
        const key = BUTTON_MAPPING[buttonName];
        if (!key) continue;

        if (isPressed && !pressedButtons.has(buttonName)) {
          // Button pressed
          pressedButtons.add(buttonName);
          sendKeyPress(key, true);
        } else if (!isPressed && pressedButtons.has(buttonName)) {
          // Button released
          pressedButtons.delete(buttonName);
          sendKeyPress(key, false);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error.message);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Release all pressed buttons
    pressedButtons.forEach((button) => {
      const key = BUTTON_MAPPING[button];
      if (key) {
        sendKeyPress(key, false);
      }
    });
    pressedButtons.clear();
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 NDS Controller Server running on ws://0.0.0.0:${PORT}`);
  console.log(`Local network: ws://$(hostname -I | awk '{print $1}'):${PORT}`);
  console.log('Waiting for controller connections...');
});
