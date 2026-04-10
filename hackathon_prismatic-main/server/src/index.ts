import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import reportsRouter from './routes/reports';
import incidentsRouter from './routes/incidents';
import agentRouter from './routes/agent';
import { setupLiveVoiceFusion } from './routes/liveVoiceFusion';

import { getHealthStatus } from './services/resilience';
import { getRecentCriticalEvents } from './services/logger';

const app = express();
const PORT = process.env.PORT || 3001;
const server = createServer(app);

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3001',
    'http://10.0.2.2:5173',
    'http://10.0.2.2:3001',
    /^http:\/\/192\.168\.\d+\.\d+/,
    /^http:\/\/10\.\d+\.\d+\.\d+/,
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());

// ── Enhanced health endpoint with service status + critical events ──
app.get('/health', (_req, res) => {
  const services = getHealthStatus();
  const criticals = getRecentCriticalEvents();
  const allHealthy = Object.values(services).every((s: any) => s.healthy);

  res.status(criticals.length > 3 ? 503 : allHealthy ? 200 : 503).json({
    status: criticals.length > 3 ? 'degraded' : allHealthy ? 'healthy' : 'degraded',
    service: 'eifs-server',
    services,
    recent_critical_count: criticals.length,
    critical_events: criticals,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', reportsRouter);
app.use('/api', incidentsRouter);
app.use('/api/agent', agentRouter);

const liveVoiceFusionWss = setupLiveVoiceFusion(server);

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;

  if (pathname === '/ws/live-voice-fusion') {
    liveVoiceFusionWss.handleUpgrade(request, socket, head, (ws) => {
      liveVoiceFusionWss.emit('connection', ws, request);
    });
    return;
  }

  socket.destroy();
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`EIFS server running on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Ingest: POST http://localhost:${PORT}/api/ingest-report`);
  console.log(`Incidents: GET http://localhost:${PORT}/api/incidents`);
  console.log(`AI Agent: POST http://localhost:${PORT}/api/agent/init`);
  console.log(`Live voice: ws://localhost:${PORT}/ws/live-voice-fusion`);
});

export default app;

