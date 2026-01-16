/**
 * Request Queue - Limits concurrent requests and provides cancellation support
 * 
 * This utility helps prevent overwhelming the server with too many parallel requests
 * (e.g., 20 timeseries requests when loading a page of 20 items)
 */

type QueuedRequest<T> = {
  id: string;
  execute: (signal: AbortSignal) => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  abortController: AbortController;
  priority: number;
};

class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private activeRequests = 0;
  private readonly maxConcurrent: number;
  private groupAbortControllers: Map<string, AbortController[]> = new Map();

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add a request to the queue
   * @param id Unique identifier for deduplication
   * @param execute Function that performs the request
   * @param groupId Optional group ID for batch cancellation (e.g., "page-1")
   * @param priority Lower number = higher priority
   */
  enqueue<T>(
    id: string,
    execute: (signal: AbortSignal) => Promise<T>,
    groupId?: string,
    priority = 0
  ): Promise<T> {
    // Check if this request is already pending
    const existing = this.queue.find((req) => req.id === id);
    if (existing) {
      return new Promise((resolve, reject) => {
        // Wait for the existing request to complete
        const original = existing as QueuedRequest<T>;
        const originalResolve = original.resolve;
        const originalReject = original.reject;
        original.resolve = (value) => {
          originalResolve(value);
          resolve(value);
        };
        original.reject = (reason) => {
          originalReject(reason);
          reject(reason);
        };
      });
    }

    const abortController = new AbortController();

    // Register abort controller with group
    if (groupId) {
      if (!this.groupAbortControllers.has(groupId)) {
        this.groupAbortControllers.set(groupId, []);
      }
      this.groupAbortControllers.get(groupId)!.push(abortController);
    }

    return new Promise<T>((resolve, reject) => {
      const request = {
        id,
        execute,
        resolve,
        reject,
        abortController,
        priority,
      } as QueuedRequest<unknown>;

      // Insert in priority order
      const insertIndex = this.queue.findIndex((req) => req.priority > priority);
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }

      this.processQueue();
    });
  }

  /**
   * Cancel all pending requests in a group
   */
  cancelGroup(groupId: string): void {
    const controllers = this.groupAbortControllers.get(groupId);
    if (controllers) {
      for (const controller of controllers) {
        controller.abort();
      }
      this.groupAbortControllers.delete(groupId);
    }

    // Remove cancelled requests from queue
    this.queue = this.queue.filter((req) => !req.abortController.signal.aborted);
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    for (const [groupId] of this.groupAbortControllers) {
      this.cancelGroup(groupId);
    }
    // Cancel any remaining requests not in a group
    for (const req of this.queue) {
      req.abortController.abort();
    }
    this.queue = [];
  }

  private async processQueue(): Promise<void> {
    while (this.activeRequests < this.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      // Skip if already aborted
      if (request.abortController.signal.aborted) {
        request.reject(new Error('Request was cancelled'));
        continue;
      }

      this.activeRequests++;

      try {
        const result = await request.execute(request.abortController.signal);
        if (!request.abortController.signal.aborted) {
          request.resolve(result);
        } else {
          request.reject(new Error('Request was cancelled'));
        }
      } catch (error) {
        if (!request.abortController.signal.aborted) {
          request.reject(error);
        } else {
          request.reject(new Error('Request was cancelled'));
        }
      } finally {
        this.activeRequests--;
        // Process next in queue
        this.processQueue();
      }
    }
  }

  /**
   * Get queue stats for debugging
   */
  getStats() {
    return {
      queued: this.queue.length,
      active: this.activeRequests,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

// Singleton instance for timeseries requests (limit to 3 concurrent)
export const timeseriesQueue = new RequestQueue(3);

// Export class for custom instances if needed
export { RequestQueue };
