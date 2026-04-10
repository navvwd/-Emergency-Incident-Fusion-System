export interface StreamingSTTCallbacks {
    onTranscript: (text: string, isFinal: boolean, language: string) => void;
    onTranslation: (originalText: string, translatedText: string, language: string) => void;
    onError: (error: string) => void;
    onConnected: () => void;
}
export declare class SarvamStreamingSTT {
    private ws;
    private apiKey;
    private callbacks;
    private targetLanguage;
    private isConnected;
    private isClosed;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectTimer;
    constructor(apiKey: string, callbacks: StreamingSTTCallbacks, targetLanguage?: string);
    isReady(): boolean;
    private scheduleReconnect;
    connect(): Promise<void>;
    private handleMessage;
    sendAudioChunk(audioChunk: Buffer): void;
    flushAudio(): void;
    close(): void;
}
export interface StreamingChatCallbacks {
    onToken: (token: string) => void;
    onComplete: (fullText: string) => void;
    onError: (error: string) => void;
}
export declare function streamChatCompletion(messages: Array<{
    role: string;
    content: string;
}>, callbacks: StreamingChatCallbacks, abortSignal?: AbortSignal): Promise<void>;
export declare function speechToTextTranslate(audioBuffer: Buffer, fileName?: string, sourceLanguage?: string, contentType?: string): Promise<{
    transcript: string;
    translatedText: string;
    language: string;
    confidence: number;
}>;
//# sourceMappingURL=sarvamStreaming.d.ts.map