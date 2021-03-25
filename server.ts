import {
	serve as serveHTTP,
	serveTLS as serveHTTPS,
	Server,
	ServerRequest,
	HTTPOptions,
	HTTPSOptions,
} from "https://deno.land/std@0.89.0/http/server.ts";
import { Queue } from "./queue.ts";
import {
	acceptWebSocket,
	WebSocket,
	WebSocketEvent,
} from "https://deno.land/std@0.89.0/ws/mod.ts";

type WebSocketServerEvent = {
	event: WebSocketEvent;
	socket: WebSocket;
};

export class WebSocketServer {
	public sockets: Set<WebSocket>;
	private queue: Queue<WebSocketServerEvent>;

	constructor(private httpServer?: Server) {
		this.sockets = new Set();
		this.queue = new Queue();

		if (this.httpServer) {
			// Upgrade all incoming HTTP requests to WebSockets
			// (in other words hijack the HTTP server)
			this.upgradeAllRequests();
		} else {
			/* Handle upgrade HTTP requests through handleUpgrade()
			(leaving the HTTP server free to handle other requests) */
		}
	}

	async close() {
		this.queue.stop();
		// Close all sockets before killing the server
		// to allow close frames to be sent through the sockets
		const closePromises = [...this.sockets].map((socket) => {
			try {
				return socket.close();
			} catch (e) {
				return Promise.resolve();
			}
		});
		await Promise.all(closePromises);
		if (this.httpServer) {
			this.httpServer.close();
		}
	}

	private async upgradeAllRequests() {
		if (this.httpServer) {
			for await (const request of this.httpServer) {
				this.handleUpgrade(request);
			}
		}
	}

	// Upgrades any new HTTP request and start handling its events
	public async handleUpgrade(req: ServerRequest) {
		const { conn, r: bufReader, w: bufWriter, headers } = req;
		try {
			const socket = await acceptWebSocket(
				{ conn, bufReader, bufWriter, headers },
			);
			this.trackSocket(socket);
			this.handleSocketEvents(socket);
		} catch (err) {
			console.error(err);
			await req.respond({
				status: 400, // Bad request
				body: err.toString(),
			});
		}
	}

	private trackSocket(socket: WebSocket) {
		this.sockets.add(socket);
	}

	private untrackSocket(socket: WebSocket) {
		this.sockets.delete(socket);
	}

	// Adds WebSocket events to the queue
	private async handleSocketEvents(socket: WebSocket) {
		// TODO add a connection event which also exposes the http request?
		for await (const event of socket) {
			this.queue.add({ socket, event } as WebSocketServerEvent);
		}
		// When socket is closed, the for await loop will be finished
		this.untrackSocket(socket);
		// TODO also try to close the socket here if loop breaks due to error?
		// try {
		//   socket.close();
		// } catch (e) {
		//
		// }
	}

	[Symbol.asyncIterator](): AsyncIterableIterator<WebSocketServerEvent> {
		return this.queue.iterate();
	}
}

/**
 * Create a WebSocket server with given options
 *
 *     TODO add example usage here
 *
 * @param addr Server configuration
 * @return Async iterable server instance for incoming socket events
 */
export function serve(addr: string | HTTPOptions): WebSocketServer {
	const httpServer = serveHTTP(addr);
	return new WebSocketServer(httpServer);
}

/**
 * Start an WebSocket server with given options and event handler
 *
 *     TODO add example usage here
 *
 * @param addr Server configuration
 * @param handler Socket event handler
 */
export async function listenAndServe(
	addr: string | HTTPOptions,
	handler: (wsEvent: WebSocketServerEvent) => void,
): Promise<void> {
	const server = serve(addr);

	for await (const wsEvent of server) {
		handler(wsEvent);
	}
}

/**
 * Create a secure WebSocket server (WSS) with given options
 *
 *     TODO add example usage here
 *
 * @param options Server configuration
 * @return Async iterable server instance for incoming socket events
 */
export function serveTLS(options: HTTPSOptions): WebSocketServer {
	const httpsServer = serveHTTPS(options);
	return new WebSocketServer(httpsServer);
}

/**
 * Start a WebSocket server with given options and event handler
 *
 *     TODO add example usage here
 *
 * @param options Server configuration
 * @param handler Socket event handler
 */
export async function listenAndServeTLS(
	options: HTTPSOptions,
	handler: (wsEvent: WebSocketServerEvent) => void,
): Promise<void> {
	const server = serveTLS(options);

	for await (const wsEvent of server) {
		handler(wsEvent);
	}
}
