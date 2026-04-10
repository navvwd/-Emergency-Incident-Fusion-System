import { WebSocket } from 'ws';
export interface LiveVoiceSession {
    sessionId: string;
    ws: WebSocket;
    languageCode: string;
    stage: 'greeting' | 'listening' | 'processing' | 'speaking' | 'idle';
    context: {
        emergencyType?: string;
        location?: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        injuries?: string;
        peopleAffected?: number;
        lastUserMessage?: string;
        lastAgentResponse?: string;
    };
    history: Array<{
        role: 'user' | 'agent';
        content: string;
        timestamp: Date;
    }>;
    audioBuffer: Buffer[];
    isRecording: boolean;
    silenceTimer?: NodeJS.Timeout;
    createdAt: Date;
    lastActivity: Date;
}
export type LiveVoiceMessage = {
    type: 'start';
    language?: string;
} | {
    type: 'audio';
    data: string;
} | {
    type: 'stop';
} | {
    type: 'interrupt';
} | {
    type: 'ping';
};
export type LiveVoiceResponse = {
    type: 'connected';
    sessionId: string;
} | {
    type: 'status';
    status: string;
    stage: string;
} | {
    type: 'transcript';
    text: string;
    isFinal: boolean;
} | {
    type: 'agent_response';
    text: string;
    actions?: AgentAction[];
} | {
    type: 'audio';
    data: string;
} | {
    type: 'error';
    message: string;
} | {
    type: 'pong';
};
export interface AgentAction {
    type: 'first_aid' | 'precaution' | 'emergency_number' | 'calming_exercise';
    title: string;
    content: string;
}
export declare function createLiveSession(ws: WebSocket, languageCode?: string): LiveVoiceSession;
export declare function getLiveSession(sessionId: string): LiveVoiceSession | undefined;
export declare function deleteLiveSession(sessionId: string): void;
export declare function updateSessionActivity(session: LiveVoiceSession): void;
export declare function sendToClient(session: LiveVoiceSession, message: LiveVoiceResponse): void;
export declare function handleMessage(session: LiveVoiceSession, message: LiveVoiceMessage): Promise<void>;
export declare function getActiveSessionCount(): number;
//# sourceMappingURL=liveVoiceManager.d.ts.map