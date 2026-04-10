"use strict";
// ──────────────────────────────────────────────
// EIFS — Live Voice Data Fusion WebSocket Route
// High-performance streaming with true data fusion
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
exports.setupLiveVoiceFusion = setupLiveVoiceFusion;
const ws_1 = require("ws");
const fusion = __importStar(require("../services/liveVoiceFusion"));
function setupLiveVoiceFusion(server) {
    const wss = new ws_1.WebSocketServer({
        noServer: true,
    });
    console.log('[LiveVoice Fusion] WebSocket server initialized at /ws/live-voice-fusion');
    wss.on('connection', (ws, req) => {
        const clientIp = req.socket.remoteAddress;
        console.log('[LiveVoice Fusion] New client connected:', clientIp);
        ws.binaryType = 'nodebuffer';
        // Track session for this connection
        let connectionSessionId = null;
        // Send connection confirmation
        send(ws, {
            type: 'connected',
            message: 'Connected to live voice fusion server',
        });
        // Handle messages
        ws.on('message', async (data) => {
            try {
                let message;
                if (Buffer.isBuffer(data)) {
                    // Handle binary audio data efficiently
                    const messageType = data[0];
                    if (messageType === 0x01) {
                        // Audio chunk with session ID
                        const sessionId = data.slice(1, 37).toString('utf8');
                        const audioData = data.slice(37).toString('base64');
                        const session = fusion.getSession(sessionId);
                        if (session) {
                            await fusion.handleMessage(session, {
                                type: 'audio_chunk',
                                data: audioData,
                            });
                        }
                        return;
                    }
                    else if (messageType === 0x02) {
                        // Interrupt signal
                        const sessionId = data.slice(1, 37).toString('utf8');
                        const session = fusion.getSession(sessionId);
                        if (session) {
                            await fusion.handleMessage(session, { type: 'interrupt' });
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
                    const buffer = Buffer.from(data);
                    message = JSON.parse(buffer.toString());
                }
                // Handle start message - create new session for this connection
                if (message.type === 'start') {
                    // Clean up any existing session for this connection
                    if (connectionSessionId) {
                        fusion.deleteSession(connectionSessionId);
                        console.log(`[LiveVoice Fusion] Cleaned up old session: ${connectionSessionId}`);
                    }
                    const session = fusion.createSession(ws, message.language || 'en-IN');
                    connectionSessionId = session.sessionId;
                    send(ws, {
                        type: 'connected',
                        sessionId: session.sessionId,
                    });
                    await fusion.handleMessage(session, message);
                    return;
                }
                // Use connection's session if no sessionId provided
                let sessionId = message.sessionId || connectionSessionId;
                if (!sessionId) {
                    console.warn('[LiveVoice Fusion] No session ID provided, creating new session');
                    const session = fusion.createSession(ws, message.language || 'en-IN');
                    connectionSessionId = session.sessionId;
                    sessionId = session.sessionId;
                    send(ws, {
                        type: 'connected',
                        sessionId: session.sessionId,
                    });
                }
                const session = fusion.getSession(sessionId);
                if (!session) {
                    console.warn(`[LiveVoice Fusion] Session ${sessionId} not found, creating new one`);
                    const newSession = fusion.createSession(ws, message.language || 'en-IN');
                    connectionSessionId = newSession.sessionId;
                    await fusion.handleMessage(newSession, message);
                    return;
                }
                await fusion.handleMessage(session, message);
            }
            catch (error) {
                console.error('[LiveVoice Fusion] Message handling error:', error);
                send(ws, {
                    type: 'error',
                    message: 'Invalid message format: ' + error.message,
                });
            }
        });
        // Handle disconnection
        ws.on('close', (code, reason) => {
            console.log(`[LiveVoice Fusion] Client disconnected. Code: ${code}`);
            const sessionsMap = fusion.getSessionsMap();
            for (const [id, session] of sessionsMap) {
                if (session.ws === ws) {
                    fusion.deleteSession(id);
                    break;
                }
            }
        });
        // Handle errors
        ws.on('error', (error) => {
            console.error('[LiveVoice Fusion] WebSocket error:', error);
        });
        // Send initial ready state
        send(ws, {
            type: 'status',
            status: 'Ready. Send "start" message to begin.',
            stage: 'idle',
        });
    });
    // Handle server-level errors
    wss.on('error', (error) => {
        console.error('[LiveVoice Fusion] Server error:', error);
    });
    // Log active connections periodically
    setInterval(() => {
        const activeSessions = fusion.getActiveSessionCount();
        const connectedClients = Array.from(wss.clients).filter((client) => client.readyState === ws_1.WebSocket.OPEN).length;
        if (activeSessions > 0 || connectedClients > 0) {
            const stats = fusion.getSessionStats();
            console.log(`[LiveVoice Fusion] Stats: ${connectedClients} connected, ${JSON.stringify(stats)}`);
        }
    }, 30000);
    return wss;
}
function send(ws, message) {
    if (ws.readyState === ws_1.WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}
//# sourceMappingURL=liveVoiceFusion.js.map