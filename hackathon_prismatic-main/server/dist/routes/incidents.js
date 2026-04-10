"use strict";
// ──────────────────────────────────────────────
// EIFS — Incidents Route
// GET /api/incidents — fallback REST endpoint
// Ref: PROJECT.md Section 7
// ──────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
/**
 * GET /api/incidents
 * Returns all active incidents ordered by severity DESC.
 * Fallback for when Supabase Realtime isn't available.
 */
router.get('/incidents', async (_req, res) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('incidents')
            .select('*')
            .eq('status', 'active')
            .order('severity_score', { ascending: false });
        if (error) {
            throw new Error(error.message);
        }
        const withConfidence = (data ?? []).map((incident) => ({
            ...incident,
            fusion_confidence: incident.report_count >= 3 ? 'high' :
                incident.report_count >= 2 ? 'medium' : 'low',
        }));
        res.status(200).json(withConfidence);
    }
    catch (error) {
        console.error(`[Incidents] GET failed: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch incidents',
            message: error.message,
        });
    }
});
// ── Fusion Log endpoints (inspection + feedback loop) ──
/**
 * GET /api/fusion-log
 * Returns recent fusion decisions with full score breakdowns.
 * Used for debugging and threshold tuning.
 */
router.get('/fusion-log', async (_req, res) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('fusion_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (error)
            throw new Error(error.message);
        res.status(200).json(data);
    }
    catch (error) {
        console.error(`[FusionLog] GET failed: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * PATCH /api/fusion-log/:id/label
 * Label a fusion decision as correct or incorrect.
 * Used to build ground truth for threshold tuning.
 */
router.patch('/fusion-log/:id/label', async (req, res) => {
    try {
        const { label } = req.body;
        if (!label || !['correct', 'incorrect'].includes(label)) {
            res.status(400).json({ error: 'Label must be "correct" or "incorrect"' });
            return;
        }
        const { error } = await supabase_1.supabase
            .from('fusion_log')
            .update({ manual_label: label })
            .eq('id', req.params.id);
        if (error)
            throw new Error(error.message);
        res.status(200).json({ success: true, id: req.params.id, label });
    }
    catch (error) {
        console.error(`[FusionLog] PATCH failed: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=incidents.js.map