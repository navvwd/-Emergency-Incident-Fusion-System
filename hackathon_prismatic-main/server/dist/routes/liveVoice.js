"use strict";
// ──────────────────────────────────────────────
// EIFS — Live Voice WebSocket Route
// Real-time bidirectional voice conversations
// ──────────────────────────────────────────────
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupLiveVoiceWebSocket = setupLiveVoiceWebSocket;
const ws_1 = require("ws");
const liveVoice = __importStar(require("../services/liveVoiceManager"));
function setupLiveVoiceWebSocket(server) {
    const wss = new ws_1.WebSocketServer({
        noServer: true,
    });
    console.log('[LiveVoice] WebSocket server initialized at /ws/live-voice');
    wss.on('connection', (ws, req) => {
        console.log('[LiveVoice] New client connected:', req.socket.remoteAddress);
        // Send connection confirmation
        ws.send(JSON.stringify({
            type: 'connected',
            message: 'Connected to live voice server',
        }));
        // Handle messages
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                // Handle initial connection message to create session
                if (message.type === 'start') {
                    const session = liveVoice.createLiveSession(ws, message.language || 'en-IN');
                    // Send session ID
                    ws.send(JSON.stringify({
                        type: 'connected',
                        sessionId: session.sessionId,
                    }));
                    // Initialize the session with greeting
                    await liveVoice.handleMessage(session, message);
                    return;
                }
                // For other messages, find or create session
                let session = liveVoice.getLiveSession(message.sessionId);
                if (!session) {
                    // Create new session if not found
                    session = liveVoice.createLiveSession(ws, 'en-IN');
                    ws.send(JSON.stringify({
                        type: 'connected',
                        sessionId: session.sessionId,
                    }));
                }
                // Handle the message
                await liveVoice.handleMessage(session, message);
            }
            catch (error) {
                console.error('[LiveVoice] Message handling error:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid message format: ' + error.message,
                }));
            }
        });
        // Handle disconnection
        ws.on('close', (code, reason) => {
            console.log(`[LiveVoice] Client disconnected. Code: ${code}, Reason: ${reason.toString()}`);
            // Clean up any sessions associated with this WebSocket
            // We need to iterate through sessions to find the one with this ws
            // This is handled by the session cleanup interval in the manager
        });
        // Handle errors
        ws.on('error', (error) => {
            console.error('[LiveVoice] WebSocket error:', error);
        });
        // Send initial ready state
        ws.send(JSON.stringify({
            type: 'status',
            status: 'Ready to start. Send "start" message with optional language code.',
            stage: 'idle',
        }));
    });
    // Handle server-level errors
    wss.on('error', (error) => {
        console.error('[LiveVoice] WebSocket server error:', error);
    });
    // Log active connections periodically
    setInterval(() => {
        const activeSessions = liveVoice.getActiveSessionCount();
        const connectedClients = Array.from(wss.clients).filter((client) => client.readyState === ws_1.WebSocket.OPEN).length;
        if (activeSessions > 0 || connectedClients > 0) {
            console.log(`[LiveVoice] Stats: ${connectedClients} connected, ${activeSessions} active sessions`);
        }
    }, 30000); // Every 30 seconds
    return wss;
}
//# sourceMappingURL=liveVoice.js.map