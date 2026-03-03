type CartEventListener = (count: number) => void;

class CartEventEmitter {
  private listeners: Set<CartEventListener> = new Set();
  private currentCount: number = 0;

  subscribe(listener: CartEventListener): () => void {
    this.listeners.add(listener);
    listener(this.currentCount);
    return () => this.listeners.delete(listener);
  }

  emit(count: number): void {
    this.currentCount = count;
    this.listeners.forEach(listener => listener(count));
  }

  getCount(): number {
    return this.currentCount;
  }

  setInitialCount(count: number): void {
    this.currentCount = count;
  }
}

export const cartEvents = new CartEventEmitter();
