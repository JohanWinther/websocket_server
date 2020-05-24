import {
  serve,
  isWebSocketPingEvent,
  isWebSocketPongEvent,
  isWebSocketCloseEvent,
} from "./mod.ts";

// Example WebSocket echo/broadcast server
const wss = serve({ port: 8080 });
console.log(`ws://localhost:8080`);

for await (const { socket, event } of wss) {
  if (isWebSocketPingEvent(event) || isWebSocketPongEvent(event)) {
    // ping/pong
    const [type, body] = event;
    console.log("ws:" + type, body);
    // ping and pong frames are already handled by the server,
    // thus there is no need to call `socket.pong()` manually.
  } else if (isWebSocketCloseEvent(event)) {
    // close
    const { code, reason } = event;
    console.log("ws:close", code, reason);
  } else {
    // text/binary message
    if (typeof event === "string") {
      console.log("ws:text", event);
    } else if (event instanceof Uint8Array) {
      console.log("ws:binary", event);
    }
    // echo message
    socket.send(event);
    // broadcast message to all clients (including the client which sent the message)
    for (const sock of wss.sockets) {
      if (!sock.isClosed) sock.send(event);
    }

    if (event === "close") {
      // Close the socket that sent the message "close"
      socket.close();
    } else if (event === "quit") {
      // Close the WebSocket server if message === "quit".
      // This will make the AsyncIterableIterator finish,
      // which will break the for await loop
      wss.close();
    }
  }
}

Deno.exit(0);
