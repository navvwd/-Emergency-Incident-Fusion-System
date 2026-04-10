"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const reports_1 = __importDefault(require("./routes/reports"));
const incidents_1 = __importDefault(require("./routes/incidents"));
const agent_1 = __importDefault(require("./routes/agent"));
const liveVoiceFusion_1 = require("./routes/liveVoiceFusion");
<<<<<<< HEAD
=======
const resilience_1 = require("./services/resilience");
const logger_1 = require("./services/logger");
>>>>>>> c91130b (naveeth changes)
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const server = (0, http_1.createServer)(app);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
<<<<<<< HEAD
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'eifs-server',
=======
// ── Enhanced health endpoint with service status + critical events ──
app.get('/health', (_req, res) => {
    const services = (0, resilience_1.getHealthStatus)();
    const criticals = (0, logger_1.getRecentCriticalEvents)();
    const allHealthy = Object.values(services).every(s => s.healthy);
    res.status(criticals.length > 3 ? 503 : allHealthy ? 200 : 503).json({
        status: criticals.length > 3 ? 'degraded' : allHealthy ? 'healthy' : 'degraded',
        service: 'eifs-server',
        services,
        recent_critical_count: criticals.length,
        critical_events: criticals,
        uptime: process.uptime(),
>>>>>>> c91130b (naveeth changes)
        timestamp: new Date().toISOString(),
    });
});
app.use('/api', reports_1.default);
app.use('/api', incidents_1.default);
app.use('/api/agent', agent_1.default);
const liveVoiceFusionWss = (0, liveVoiceFusion_1.setupLiveVoiceFusion)(server);
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
<<<<<<< HEAD
server.listen(PORT, () => {
    console.log(`EIFS server running on http://localhost:${PORT}`);
=======
server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`EIFS server running on http://0.0.0.0:${PORT}`);
>>>>>>> c91130b (naveeth changes)
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Ingest: POST http://localhost:${PORT}/api/ingest-report`);
    console.log(`Incidents: GET http://localhost:${PORT}/api/incidents`);
    console.log(`AI Agent: POST http://localhost:${PORT}/api/agent/init`);
    console.log(`Live voice: ws://localhost:${PORT}/ws/live-voice-fusion`);
});
exports.default = app;
//# sourceMappingURL=index.js.map