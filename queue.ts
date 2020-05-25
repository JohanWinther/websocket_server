import { deferred, Deferred } from "https://deno.land/std/async/mod.ts";

export class Queue<T> {
	private stopSignal: Boolean;
	private signal: Deferred<void>;
	private queue: Array<T>;

	constructor() {
		this.stopSignal = false;
		this.signal = deferred<void>();
		this.queue = [];
	}

	public add(item: T) {
		this.queue.push(item);
		this.signal.resolve();
	}

	public stop() {
		this.stopSignal = true;
	}

	// Generator function which returns a Generator when called
	public async *iterate() {
		while (!this.stopSignal) {
			// Sleep until any event is added to the queue
			await this.signal;

			// Note that while we're looping over the queue, new items may be added
			for (let i = 0; i < this.queue.length; i++) {
				yield this.queue[i];
			}
			// Clear the queue and reset the `signal` promise
			this.queue.length = 0;
			this.signal = deferred();
		}
	}
}
