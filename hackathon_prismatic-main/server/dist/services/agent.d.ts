export interface AgentSession {
    sessionId: string;
    userId?: string;
    languageCode: string;
    stage: 'greeting' | 'assessing' | 'gathering' | 'advice' | 'closing';
    context: {
        emergencyType?: string;
        location?: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        injuries?: string;
        peopleAffected?: number;
    };
    history: Array<{
        role: 'user' | 'agent';
        content: string;
        timestamp: Date;
    }>;
    createdAt: Date;
    lastActivity: Date;
}
export interface AgentResponse {
    text: string;
    transcript?: string;
    actions?: AgentAction[];
    sessionId: string;
    stage: string;
}
export interface AgentAction {
    type: 'first_aid' | 'precaution' | 'emergency_number' | 'calming_exercise';
    title: string;
    content: string;
}
export declare function createSession(languageCode?: string, userId?: string): AgentSession;
export declare function getSession(sessionId: string): AgentSession | undefined;
export declare function updateSession(session: AgentSession): void;
export declare function deleteSession(sessionId: string): void;
export declare function processMessage(sessionId: string, userMessage: string, audioBuffer?: Buffer): Promise<AgentResponse>;
export declare function initializeSession(languageCode?: string): Promise<AgentResponse>;
//# sourceMappingURL=agent.d.ts.map