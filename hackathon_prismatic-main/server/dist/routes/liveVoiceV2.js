"use strict";
// ──────────────────────────────────────────────
// EIFS — Live Voice WebSocket Route V2
// High-performance streaming audio
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
exports.setupLiveVoiceWebSocketV2 = setupLiveVoiceWebSocketV2;
const ws_1 = require("ws");
const liveVoice = __importStar(require("../services/liveVoiceManagerV2"));
function setupLiveVoiceWebSocketV2(server) {
    const wss = new ws_1.WebSocketServer({
        noServer: true,
    });
    console.log('[LiveVoice V2] WebSocket server initialized at /ws/live-voice-v2');
    wss.on('connection', (ws, req) => {
        const clientIp = req.socket.remoteAddress;
        console.log('[LiveVoice V2] New client connected:', clientIp);
        // Set up binary message support
        ws.binaryType = 'nodebuffer';
        // Send connection confirmation
        send(ws, {
            type: 'connected',
            message: 'Connected to live voice server v2',
        });
        // Handle messages (both text and binary)
        ws.on('message', async (data) => {
            try {
                let message;
                // Handle different message types
                if (Buffer.isBuffer(data)) {
                    // Binary data - could be audio chunks
                    const messageType = data[0]; // First byte indicates message type
                    if (messageType === 0x01) {
                        // Audio chunk
                        const sessionId = data.slice(1, 37).toString('utf8'); // UUID is 36 chars
                        const audioData = data.slice(37).toString('base64');
                        const session = liveVoice.getLiveSession(sessionId);
                        if (session) {
                            await liveVoice.handleMessage(session, {
                                type: 'audio_chunk',
                                data: audioData,
                            });
                        }
                        return;
                    }
                    else if (messageType === 0x02) {
                        // Interrupt signal
                        const sessionId = data.slice(1, 37).toString('utf8');
                        const session = liveVoice.getLiveSession(sessionId);
                        if (session) {
                            await liveVoice.handleMessage(session, { type: 'interrupt' });
                        }
                        return;
                    }
                    // Try parsing as JSON
                    message = JSON.parse(data.toString());
                }
                else if (typeof data === 'string') {
                    message = JSON.parse(data);
                }
                else {
                    // ArrayBuffer
                    const buffer = Buffer.from(data);
                    message = JSON.parse(buffer.toString());
                }
                // Handle initial connection message to create session
                if (message.type === 'start') {
                    const session = liveVoice.createLiveSession(ws, message.language || 'en-IN');
                    // Send session ID
                    send(ws, {
                        type: 'connected',
                        sessionId: session.sessionId,
                    });
                    // Initialize the session with greeting
                    await liveVoice.handleMessage(session, message);
                    return;
                }
                // For other messages, find or create session
                let session = liveVoice.getLiveSession(message.sessionId);
                if (!session) {
                    // Create new session if not found
                    session = liveVoice.createLiveSession(ws, message.language || 'en-IN');
                    send(ws, {
                        type: 'connected',
                        sessionId: session.sessionId,
                    });
                }
                // Handle the message
                await liveVoice.handleMessage(session, message);
            }
            catch (error) {
                console.error('[LiveVoice V2] Message handling error:', error);
                send(ws, {
                    type: 'error',
                    message: 'Invalid message format: ' + error.message,
                });
            }
        });
        // Handle disconnection
        ws.on('close', (code, reason) => {
            console.log(`[LiveVoice V2] Client disconnected. Code: ${code}, Reason: ${reason.toString()}`);
            // Find and cleanup session associated with this WebSocket
            const sessionsMap = liveVoice.getSessionsMap();
            for (const [id, session] of sessionsMap) {
                if (session.ws === ws) {
                    liveVoice.deleteLiveSession(id);
                    break;
                }
            }
        });
        // Handle errors
        ws.on('error', (error) => {
            console.error('[LiveVoice V2] WebSocket error:', error);
        });
        // Send initial ready state
        send(ws, {
            type: 'status',
            status: 'Ready to start. Send "start" message with optional language code.',
            stage: 'idle',
        });
    });
    // Handle server-level errors
    wss.on('error', (error) => {
        console.error('[LiveVoice V2] WebSocket server error:', error);
    });
    // Log active connections periodically
    setInterval(() => {
        const activeSessions = liveVoice.getActiveSessionCount();
        const connectedClients = Array.from(wss.clients).filter((client) => client.readyState === ws_1.WebSocket.OPEN).length;
        if (activeSessions > 0 || connectedClients > 0) {
            const stats = liveVoice.getSessionStats();
            console.log(`[LiveVoice V2] Stats: ${connectedClients} connected, ${JSON.stringify(stats)}`);
        }
    }, 30000); // Every 30 seconds
    return wss;
}
// Helper function to send JSON messages
function send(ws, message) {
    if (ws.readyState === ws_1.WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}
//# sourceMappingURL=liveVoiceV2.js.map