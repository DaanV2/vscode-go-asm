interface CacheContainer<T> {
  __cache__: T | null | undefined;
}

export namespace Cache {
  // A simple utility to cache the result of a function that takes a single string key.
  export function getOrCreate<T>(
    key: string,
    container: CacheContainer<T>,
    createFn: (key: string) => T,
  ): T {
    if (container.__cache__) {
      return container.__cache__;
    }

    const value = createFn(key);
    container.__cache__ = value;
    return value;
  }
}
