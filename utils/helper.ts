// Utility functions for Slack MCP Server

import { AsyncLocalStorage } from 'async_hooks';

// Session context for tracking requests
interface SessionContext {
  sessionId?: string;
}

export const sessionStorage = new AsyncLocalStorage<SessionContext>();

// Timing utility for measuring API call performance
export async function timeApiCall<T>(
  apiName: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  const context = sessionStorage.getStore();
  const sessionPrefix = context?.sessionId ? `[${context.sessionId}] ` : '';
  try {
    const result = await apiCall();
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    console.log(`${sessionPrefix}[TIMING] ${apiName}: ${duration}ms`);
    return result as T;
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    console.log(`${sessionPrefix}[TIMING] ${apiName}: ${duration}ms (failed)`);
    throw error;
  }
}
