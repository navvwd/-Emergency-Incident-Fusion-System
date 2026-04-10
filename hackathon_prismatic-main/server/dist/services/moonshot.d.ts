/**
 * Sends an image to Moonshot Kimi Vision for scene understanding.
 * Returns a concise factual description of the emergency scene.
 */
export declare function describeScene(imageBuffer: Buffer): Promise<string>;
export interface ChatCallbacks {
    onToken: (token: string) => void;
    onComplete: (text: string) => void;
    onError: (error: string) => void;
}
/**
 * Streaming chat completion using Moonshot Kimi
 * Much better than Sarvam for natural conversation
 */
export declare function streamChatCompletion(messages: Array<{
    role: string;
    content: string;
}>, callbacks: ChatCallbacks, abortSignal?: AbortSignal): Promise<void>;
//# sourceMappingURL=moonshot.d.ts.map