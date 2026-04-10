"use strict";
// ──────────────────────────────────────────────
// EIFS — Live Voice WebSocket Route (Gemini Live Style)
// Full-duplex streaming audio
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
exports.setupLiveVoiceLive = setupLiveVoiceLive;
const ws_1 = require("ws");
const liveVoice = __importStar(require("../services/liveVoiceManagerLive"));
function setupLiveVoiceLive(server) {
    const wss = new ws_1.WebSocketServer({ noServer: true });
    console.log('[LiveMode] WebSocket server initialized at /ws/live-voice-live');
    wss.on('connection', (ws, req) => {
        const clientIp = req.socket.remoteAddress;
        console.log('[LiveMode] New client connected:', clientIp);
        ws.binaryType = 'nodebuffer';
        // Send connection confirmation
        send(ws, {
            type: 'connected',
            message: 'Connected to Gemini Live voice server',
        });
        ws.on('message', async (data) => {
            try {
                let message;
                if (Buffer.isBuffer(data)) {
                    // Binary: first byte is message type
                    const messageType = data[0];
                    if (messageType === 0x01) {
                        // Audio chunk
                        const sessionId = data.slice(1, 37).toString('utf8');
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
                    message = JSON.parse(data.toString());
                }
                else if (typeof data === 'string') {
                    message = JSON.parse(data);
                }
                else {
                    const buffer = Buffer.from(data);
                    message = JSON.parse(buffer.toString());
                }
                if (message.type === 'start') {
                    const session = liveVoice.createLiveSession(ws, message.language || 'en-IN');
                    send(ws, {
                        type: 'connected',
                        sessionId: session.sessionId,
                    });
                    await liveVoice.handleMessage(session, message);
                    return;
                }
                let session = liveVoice.getLiveSession(message.sessionId);
                if (!session) {
                    session = liveVoice.createLiveSession(ws, message.language || 'en-IN');
                    send(ws, {
                        type: 'connected',
                        sessionId: session.sessionId,
                    });
                }
                await liveVoice.handleMessage(session, message);
            }
            catch (error) {
                console.error('[LiveMode] Message handling error:', error);
                send(ws, {
                    type: 'error',
                    message: 'Invalid message format: ' + error.message,
                });
            }
        });
        ws.on('close', (code, reason) => {
            console.log(`[LiveMode] Client disconnected. Code: ${code}`);
            const sessionsMap = liveVoice.getSessionsMap();
            for (const [id, session] of sessionsMap) {
                if (session.ws === ws) {
                    liveVoice.deleteLiveSession(id);
                    break;
                }
            }
        });
        ws.on('error', (error) => {
            console.error('[LiveMode] WebSocket error:', error);
        });
        send(ws, {
            type: 'status',
            status: 'Ready to start. Send "start" message with language code.',
            stage: 'idle',
        });
    });
    wss.on('error', (error) => {
        console.error('[LiveMode] WebSocket server error:', error);
    });
    // Log active connections periodically
    setInterval(() => {
        const activeSessions = liveVoice.getActiveSessionCount();
        const connectedClients = Array.from(wss.clients).filter((client) => client.readyState === ws_1.WebSocket.OPEN).length;
        if (activeSessions > 0 || connectedClients > 0) {
            const stats = liveVoice.getSessionStats();
            console.log(`[LiveMode] Stats: ${connectedClients} connected, ${JSON.stringify(stats)}`);
        }
    }, 30000);
    return wss;
}
function send(ws, message) {
    if (ws.readyState === ws_1.WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}
//# sourceMappingURL=liveVoiceLive.js.map