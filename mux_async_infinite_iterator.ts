// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
// A reworked MuxAsyncIterator which will stop only upon receiving an external signal
import { Deferred, deferred } from "https://deno.land/std/async/deferred.ts";

interface TaggedYieldedValue<T> {
  iterator: AsyncIterableIterator<T>;
  value: T;
}

/** The MuxAsyncInfiniteIterator class multiplexes multiple async iterators into a
 * single stream. It currently makes a few assumptions:
 * - The iterators do not throw.
 */
export class MuxAsyncInfiniteIterator<T> implements AsyncIterable<T> {
  private yields: Array<TaggedYieldedValue<T>> = [];
  private signal: Deferred<void> = deferred();
  public stop: Boolean = false;

  add(iterator: AsyncIterableIterator<T>): void {
    this.callIteratorNext(iterator);
  }

  private async callIteratorNext(
    iterator: AsyncIterableIterator<T>,
  ): Promise<void> {
    const { value, done } = await iterator.next();
    if (!done) {
      this.yields.push({ iterator, value });
    }
    this.signal.resolve();
  }

  async *iterate(): AsyncIterableIterator<T> {
    while (!this.stop) {
      // Sleep until any of the wrapped iterators yields.
      await this.signal;

      // Note that while we're looping over `yields`, new items may be added.
      for (let i = 0; i < this.yields.length; i++) {
        const { iterator, value } = this.yields[i];
        yield value;
        this.callIteratorNext(iterator);
      }

      // Clear the `yields` list and reset the `signal` promise.
      this.yields.length = 0;
      this.signal = deferred();
    }
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this.iterate();
  }
}
