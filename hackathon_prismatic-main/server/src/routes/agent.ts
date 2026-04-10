// ──────────────────────────────────────────────
// EIFS — AI Agent Routes
// Voice and text conversational agent endpoints
// ──────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as agent from '../services/agent';
import { AgentResponse } from '../services/agent';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for audio
});

const router = Router();

// ─── POST /api/agent/init ────────────────────
// Initialize a new agent session

router.post('/init', async (req: Request, res: Response) => {
  try {
    const { language = 'en-IN' } = req.body;
    const response = await agent.initializeSession(language);

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('[Agent Route] Init failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize agent session',
      message: error.message,
    });
  }
});

// ─── POST /api/agent/chat ────────────────────
// Send text message to agent

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      res.status(400).json({
        success: false,
        error: 'sessionId and message are required',
      });
      return;
    }

    const response = await agent.processMessage(sessionId, message);

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('[Agent Route] Chat failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      message: error.message,
    });
  }
});

// ─── POST /api/agent/voice ───────────────────
// Send voice message to agent (STT -> Agent -> TTS)

router.post('/voice', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      res.status(400).json({
        success: false,
        error: 'Audio file is required',
      });
      return;
    }

    // If no sessionId, create new session
    let effectiveSessionId = sessionId;
    if (!effectiveSessionId) {
      const newSession = await agent.initializeSession('en-IN');
      effectiveSessionId = newSession.sessionId;
    }

    const response = await agent.processMessage(
      effectiveSessionId,
      '', // Empty text, will use STT
      audioFile.buffer
    );

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('[Agent Route] Voice processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process voice message',
      message: error.message,
    });
  }
});

// ─── GET /api/agent/session/:sessionId ───────
// Get session info and history

router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = agent.getSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        stage: session.stage,
        context: session.context,
        history: session.history,
        languageCode: session.languageCode,
      },
    });
  } catch (error: any) {
    console.error('[Agent Route] Get session failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session',
      message: error.message,
    });
  }
});

// ─── DELETE /api/agent/session/:sessionId ────
// End agent session

router.delete('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    agent.deleteSession(sessionId);

    res.status(200).json({
      success: true,
      message: 'Session ended',
    });
  } catch (error: any) {
    console.error('[Agent Route] Delete session failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end session',
      message: error.message,
    });
  }
});

// ─── POST /api/agent/report ──────────────────
// Submit report from agent session

router.post('/report', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const session = agent.getSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    // Build report text from session context
    const reportText = buildReportFromSession(session);

    // Forward to report ingestion pipeline
    const reportData = {
      report_type: 'text',
      text_content: reportText,
      language: session.languageCode,
    };

    // Use the internal API to submit report
    const ingestResponse = await fetch('http://localhost:3001/api/ingest-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    });

    const result = await ingestResponse.json() as { success: boolean; data?: any };

    if (result.success) {
      // End the agent session after successful report
      agent.deleteSession(sessionId);
    }

    res.status(200).json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    console.error('[Agent Route] Submit report failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit report',
      message: error.message,
    });
  }
});

// ─── Helper: Build Report from Session ───────

function buildReportFromSession(session: any): string {
  const ctx = session.context;
  let report = '';

  if (ctx.emergencyType) {
    report += `Emergency Type: ${ctx.emergencyType.replace('_', ' ')}. `;
  }

  if (ctx.location) {
    report += `Location: ${ctx.location}. `;
  }

  if (ctx.peopleAffected) {
    report += `People affected: ${ctx.peopleAffected}. `;
  }

  if (ctx.severity) {
    report += `Severity: ${ctx.severity}. `;
  }

  // Add conversation summary
  const userMessages = session.history
    .filter((h: any) => h.role === 'user')
    .map((h: any) => h.content)
    .join('. ');

  if (userMessages) {
    report += `Details: ${userMessages}`;
  }

  return report || 'Emergency report submitted via AI agent.';
}

export default router;
