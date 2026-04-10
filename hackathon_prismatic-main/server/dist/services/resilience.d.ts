export declare function isCircuitOpen(serviceName: string): boolean;
export declare function recordSuccess(serviceName: string): void;
export declare function recordFailure(serviceName: string): void;
export declare function getHealthStatus(): Record<string, {
    healthy: boolean;
    failures: number;
}>;
/**
 * Retry with exponential backoff + jitter.
 * Checks circuit before calling. Respects retry budget.
 */
export declare function withRetry<T>(fn: () => Promise<T>, serviceName: string, maxRetries?: number): Promise<T>;
//# sourceMappingURL=resilience.d.ts.map