import { WebSocket } from 'ws';
import * as sarvam from './sarvamStreaming';
export interface FusionSession {
    sessionId: string;
    ws: WebSocket;
    languageCode: string;
    detectedLanguage: string;
    stage: 'greeting' | 'listening' | 'processing' | 'idle';
    context: {
        emergencyType?: string;
        location?: string;
        latitude?: number;
        longitude?: number;
        geoAccuracy?: number;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        injuries?: string;
        peopleAffected?: number;
        lastUserMessage?: string;
        lastAgentResponse?: string;
        dispatched?: boolean;
    };
    history: Array<{
        role: 'user' | 'agent';
        content: string;
        timestamp: Date;
    }>;
    audioBuffer: Buffer[];
    isRecording: boolean;
    isHandlingAudioEnd: boolean;
    streamingTranscriptReceived: boolean;
    silenceTimer?: NodeJS.Timeout;
    accumulateTimer?: NodeJS.Timeout;
    accumulatedTranscripts: string[];
    currentChatAbort?: AbortController;
    sttStream?: sarvam.SarvamStreamingSTT;
    partialTranscript: string;
    createdAt: Date;
    lastActivity: Date;
}
export type FusionMessage = {
    type: 'start';
    language?: string;
} | {
    type: 'audio_chunk';
    data: string;
} | {
    type: 'audio_end';
} | {
    type: 'interrupt';
} | {
    type: 'geolocation';
    latitude: number;
    longitude: number;
    accuracy?: number;
} | {
    type: 'ping';
};
export type FusionResponse = {
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
    language: string;
} | {
    type: 'translation';
    original: string;
    translated: string;
} | {
    type: 'agent_response_start';
} | {
    type: 'agent_response_token';
    token: string;
} | {
    type: 'agent_response_complete';
    text: string;
    actions?: AgentAction[];
} | {
    type: 'interrupted';
} | {
    type: 'error';
    message: string;
} | {
    type: 'dispatch';
    incident_type: string;
    location: string;
    latitude?: number;
    longitude?: number;
} | {
    type: 'pong';
};
export interface AgentAction {
    type: 'first_aid' | 'precaution' | 'emergency_number' | 'calming_exercise';
    title: string;
    content: string;
}
export declare function createSession(ws: WebSocket, languageCode?: string): FusionSession;
export declare function getSession(sessionId: string): FusionSession | undefined;
export declare function deleteSession(sessionId: string): void;
export declare function getSessionsMap(): Map<string, FusionSession>;
export declare function getActiveSessionCount(): number;
export declare function getSessionStats(): {
    total: number;
};
export declare function handleMessage(session: FusionSession, message: FusionMessage): Promise<void>;
//# sourceMappingURL=liveVoiceFusion.d.ts.map