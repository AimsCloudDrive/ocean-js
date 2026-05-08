export class BatchUpdateManager {
  private pendingUpdates = new Set<() => void>();
  private isScheduled = false;
  private rafId: number | null = null;

  queueUpdate(update: () => void): void {
    this.pendingUpdates.add(update);

    if (!this.isScheduled) {
      this.isScheduled = true;

      this.rafId = requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  private flush(): void {
    const updates = Array.from(this.pendingUpdates);
    this.pendingUpdates.clear();
    this.isScheduled = false;
    this.rafId = null;

    updates.forEach((update) => {
      try {
        update();
      } catch (error) {
        console.error('Batch update error:', error);
      }
    });
  }

  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingUpdates.clear();
    this.isScheduled = false;
  }

  get pendingCount(): number {
    return this.pendingUpdates.size;
  }

  get isUpdating(): boolean {
    return this.isScheduled;
  }
}

export const batchUpdateManager = new BatchUpdateManager();
