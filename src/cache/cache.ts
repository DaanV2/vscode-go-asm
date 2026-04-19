interface CacheContainer<T> {
  __cache__: T | null | undefined;
}

export namespace Cache {
  // A simple utility to cache the result of a function that takes uses an object instance as the storage.
  export function getOrCreate<T>(
    container: CacheContainer<T>,
    createFn: () => T,
  ): T {
    if (container.__cache__ !== undefined && container.__cache__ !== null) {
      return container.__cache__;
    }

    const value = createFn();
    container.__cache__ = value;
    return value;
  }
}
