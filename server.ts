import {
  serve as serveHTTP,
  serveTLS as serveHTTPS,
  Server,
  ServerRequest,
  HTTPOptions,
  HTTPSOptions,
} from "https://deno.land/std/http/server.ts";
import { MuxAsyncInfiniteIterator } from "./mux_async_infinite_iterator.ts";
import {
  acceptWebSocket,
  WebSocket,
  WebSocketEvent,
} from "https://deno.land/std/ws/mod.ts";

type WebSocketServerEvent = {
  event: WebSocketEvent;
  socket: WebSocket;
};

export class WebSocketServer {
  public sockets: Set<WebSocket>;
  private mux: MuxAsyncInfiniteIterator<WebSocketServerEvent>;

  constructor(private httpServer?: Server) {
    this.sockets = new Set();
    this.mux = new MuxAsyncInfiniteIterator();

    if (this.httpServer) {
      // Upgrade all incoming HTTP requests to WebSockets
      // (in other words hijack the HTTP server)
      this.upgradeAllRequests();
    } else {
      /* Handle upgrade HTTP requests through handleUpgrade()
      (leaving the HTTP server free to handle other requests) */
    }
  }

  async close(): Promise<void> {
    this.mux.stop = true;
    // Close all sockets before killing the server
    // to allow close frames to be sent through the sockets
    const closePromises = [...this.sockets].map((socket) => socket.close());
    await Promise.all(closePromises);
    if (this.httpServer) {
      this.httpServer.close();
    }
  }

  // Yields all WebSocket events on a single WebSocket.
  private async *iterateWebSocketEvents(
    socket: WebSocket,
  ): AsyncIterableIterator<WebSocketServerEvent> {
    // TODO yield an event upon connection which also exposes the http request?
    // yield { socket, event: "connection" } as WebSocketServerEvent;
    for await (const event of socket) {
      yield { socket, event } as WebSocketServerEvent;
    }

    this.untrackSocket(socket);
    // TODO also try to close the socket here?
    // try {
    //   socket.close();
    // } catch (e) {
    //
    // }
  }

  private trackSocket(socket: WebSocket): void {
    this.sockets.add(socket);
  }

  private untrackSocket(socket: WebSocket): void {
    this.sockets.delete(socket);
  }

  private async upgradeAllRequests(): Promise<void> {
    if (this.httpServer) {
      for await (const request of this.httpServer) {
        this.handleUpgrade(request);
      }
    }
  }

  // Upgrades any new HTTP request and adds it to the MuxAsyncInfiniteIterator
  private async handleUpgrade(req: ServerRequest): Promise<void> {
    const { conn, r: bufReader, w: bufWriter, headers } = req;
    try {
      const socket = await acceptWebSocket(
        { conn, bufReader, bufWriter, headers },
      );
      this.trackSocket(socket);
      this.mux.add(this.iterateWebSocketEvents(socket));
    } catch (err) {
      await req.respond({
        status: 400, // Bad request
        body: err.toString(),
      });
    }
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<WebSocketServerEvent> {
    return this.mux.iterate();
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
