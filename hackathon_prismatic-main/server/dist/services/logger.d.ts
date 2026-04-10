export type CriticalEvent = 'FUSION_FAILED' | 'FUSION_DISABLED' | 'PIPELINE_TIMEOUT' | 'CIRCUIT_OPEN' | 'STT_FAILED' | 'VISION_BOTH_FAILED' | 'EMBEDDING_FAILED';
export interface CriticalLogEntry {
    level: 'CRITICAL';
    event: CriticalEvent;
    timestamp: string;
    details: Record<string, any>;
}
export declare function logCritical(event: CriticalEvent, details: Record<string, any>): void;
export declare function getRecentCriticalEvents(windowMs?: number): CriticalLogEntry[];
export declare function getAllCriticalEvents(): CriticalLogEntry[];
//# sourceMappingURL=logger.d.ts.map