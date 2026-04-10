// ──────────────────────────────────────────────
// EIFS — Live Voice Data Fusion WebSocket Route
// High-performance streaming with true data fusion
// ──────────────────────────────────────────────

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import * as fusion from '../services/liveVoiceFusion';

export function setupLiveVoiceFusion(server: Server): WebSocketServer {
  const wss = new WebSocketServer({
    noServer: true,
  });

  console.log('[LiveVoice Fusion] WebSocket server initialized at /ws/live-voice-fusion');

  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log('[LiveVoice Fusion] New client connected:', clientIp);

    ws.binaryType = 'nodebuffer';
    
    // Track session for this connection
    let connectionSessionId: string | null = null;

    // Send connection confirmation
    send(ws, {
      type: 'connected',
      message: 'Connected to live voice fusion server',
    });

    // Handle messages
    ws.on('message', async (data: Buffer | ArrayBuffer | string) => {
      try {
        let message: any;

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
          } else if (messageType === 0x02) {
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
        } else if (typeof data === 'string') {
          message = JSON.parse(data);
        } else {
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

      } catch (error: any) {
        console.error('[LiveVoice Fusion] Message handling error:', error);
        send(ws, {
          type: 'error',
          message: 'Invalid message format: ' + error.message,
        });
      }
    });

    // Handle disconnection
    ws.on('close', (code: number, reason: Buffer) => {
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
    ws.on('error', (error: Error) => {
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
  wss.on('error', (error: Error) => {
    console.error('[LiveVoice Fusion] Server error:', error);
  });

  // Log active connections periodically
  setInterval(() => {
    const activeSessions = fusion.getActiveSessionCount();
    const connectedClients = Array.from(wss.clients).filter(
      (client) => client.readyState === WebSocket.OPEN
    ).length;

    if (activeSessions > 0 || connectedClients > 0) {
      const stats = fusion.getSessionStats();
      console.log(`[LiveVoice Fusion] Stats: ${connectedClients} connected, ${JSON.stringify(stats)}`);
    }
  }, 30000);

  return wss;
}

function send(ws: WebSocket, message: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
