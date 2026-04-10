import { WebSocket } from 'ws';
export interface LiveSession {
    sessionId: string;
    ws: WebSocket;
    languageCode: string;
    detectedLanguage: string;
    stage: 'idle' | 'greeting' | 'listening' | 'processing' | 'speaking';
    context: {
        emergencyType?: string;
        location?: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        injuries?: string;
        peopleAffected?: number;
        lastUserMessage?: string;
        lastAgentResponse?: string;
        translatedMessage?: string;
    };
    history: Array<{
        role: 'user' | 'agent';
        content: string;
        translatedContent?: string;
        timestamp: Date;
    }>;
    audioBuffer: Buffer[];
    isRecording: boolean;
    silenceTimer?: ReturnType<typeof setTimeout>;
    ttsWs: WebSocket | null;
    ttsReady: boolean;
    ttsQueue: string[];
    ttsProcessing: boolean;
    isSpeaking: boolean;
    currentAbort?: AbortController;
    interruptRequested: boolean;
    createdAt: Date;
    lastActivity: Date;
    messageCount: number;
}
export interface AgentAction {
    type: 'first_aid' | 'precaution' | 'emergency_number' | 'calming_exercise';
    title: string;
    content: string;
}
export declare function createLiveSession(ws: WebSocket, languageCode?: string): LiveSession;
export declare function getLiveSession(id: string): LiveSession | undefined;
export declare function deleteLiveSession(id: string): void;
export declare function getSessionsMap(): Map<string, LiveSession>;
export declare function getActiveSessionCount(): number;
export declare function getSessionStats(): {
    total: number;
    byStage: Record<string, number>;
};
export declare function handleMessage(session: LiveSession, message: any): Promise<void>;
//# sourceMappingURL=liveVoiceManagerLive.d.ts.map