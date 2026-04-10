import { AxiosInstance } from 'axios';
import { SarvamSTTResponse, SarvamLIDResponse, ExtractedData } from '../types';
export declare function getSarvamChatClient(): AxiosInstance;
/**
 * Unified STT using Sarvam v3 /speech-to-text endpoint.
 * - English: 1 call (transcribe) → done
 * - Non-English: 1 call (transcribe) → detect lang → 1 call (translate) → done
 * - Low confidence (< 0.4): retry with mode=translate as safety net
 * - Never uses legacy /speech-to-text-translate endpoint
 */
export declare function speechToText(audioBuffer: Buffer, fileName: string): Promise<SarvamSTTResponse>;
export declare function detectLanguage(text: string): Promise<SarvamLIDResponse>;
export declare function translate(text: string, sourceLang: string, targetLang: string): Promise<string>;
export declare function extractImage(imageBuffer: Buffer, fileName: string): Promise<string>;
export declare function chatCompletion(text: string, reportType: string): Promise<ExtractedData>;
/**
 * Text-to-Speech using Sarvam Bulbul v3.
 * Returns base64 data URL (data:audio/wav;base64,...)
 * Fire-and-forget safe — caller catches errors.
 */
export declare function textToSpeech(text: string, languageCode?: string, speaker?: string): Promise<string>;
//# sourceMappingURL=sarvam.d.ts.map