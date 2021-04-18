# Deno WebSocket Server 🔌
<p align="center">
  <img src="./sockie.svg">
</p>
<p align="center">
	<a href="https://github.com/JohanWinther/websocket_server/actions"><img src="https://github.com/JohanWinther/websocket_server/workflows/CI/badge.svg"></a>
</p>
<p align="center">
A WebSocket server library for <a href="https://deno.land">Deno</a>.
</p>

The [raison d'être](https://en.wiktionary.org/wiki/raison_d%27%C3%AAtre) for this library is to provide a unified async iterator for the events of all connected WebSocket clients.

**Note**: This WebSocket server is **not** an `EventEmitter` (i.e. it does not use events with callbacks like [websockets/ws](https://github.com/websockets/ws)).
Instead, it specifies the [asyncIterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator) symbol and should be used in conjunction with a [`for await...of`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of) loop, just like the [Deno http server](https://deno.land/std@0.92.0/http/server.ts).
The iterator return values are of
```typescript
type WebSocketServerEvent = {
  event: WebSocketEvent;
  socket: WebSocket;
};
```
where `socket` is the WebSocket from which the data was received on.

## Usage

### Simple server
```typescript
import { serve } from "https://deno.land/x/websocket_server/mod.ts";
const server = serve(":8080");
for await (const { event } of server) {
  console.log(event);
}
```

### Simple server with handler
```typescript
import { listenAndServe } from "https://deno.land/x/websocket_server/mod.ts";

listenAndServe(":8080", ({ socket, event }) => {
  console.log(socket.conn.rid, event);
});
```

### Using an existing HTTP server
```typescript
import { serve } from "https://deno.land/std@0.92.0/http/server.ts";
import { WebSocketServer } from "https://deno.land/x/websocket_server/mod.ts";

const httpServer = serve(":8080");
const wss = new WebSocketServer(httpServer);
for await (const { event, socket } of wss) {
  console.log(event);
  if (!socket.isClosed) {
    socket.send("Hello, I am using the HTTP server!");
  }
}
```

### Multiple WebSocket servers sharing an existing HTTP server
```typescript
import { serve } from "https://deno.land/std@0.92.0/http/server.ts";
import { WebSocketServer } from "https://deno.land/x/websocket_server/mod.ts";

async function serverHandler(wss: WebSocketServer, message: string) {
  for await (const { event, socket } of wss) {
    console.log(event);
    if (!socket.isClosed) {
      socket.send(message);
    }
  }
}

const httpServer = serve(":8080");
const wss1 = new WebSocketServer();
const wss2 = new WebSocketServer();
serverHandler(wss1, "Received your message on server 1.");
serverHandler(wss2, "Received your message on server 2.");

for await (const req of httpServer) {
  if (req.url === "/foo") {
    wss1.handleUpgrade(req);
  } else if (req.url === '/bar') {
    wss2.handleUpgrade(req);
  } else {
    // Do stuff with your HTTP server e.g. close the connection
    await req.respond({
      body: "You are not welcome!",
      status: 400,
    });
    req.conn.close();
  }
}
```

### Echo / broadcast server
Check out the example [echo/broadcast server](example_server.ts).

## FAQ

### How do I create a WebSocket client?
This library provides a class only for WebSocket servers, not WebSocket clients, because it is straightforward to create clients with the [WebSocket API](https://developer.mozilla.org/docs/Web/API/WebSockets_API).

Here is a simple example:
```typescript
try {
  const socket = new WebSocket("ws://127.0.0.1:8080");
  for await (const event of socket) {
    console.log(event);
    if (typeof event === "string" && event === "Who is this?") {
      socket.send("It is me, a simple WebSocket client.");
    }
  }
} catch (err) {
  console.error(`Could not connect to WebSocket: '${err}'`);
}
```

## Changelog
Changelog entries can be found at [releases](https://github.com/JohanWinther/websocket-server/releases).

## Acknowledgements
- Thanks to [zorbyte](https://github.com/zorbyte) for helping me understand enough about async iterators to implement the server.
- The logo is based on ["Dino in the Rain"](https://github.com/denolib/high-res-deno-logo) by [@kevinkassimo](https://github.com/kevinkassimo) (MIT license).

## License
[MIT](LICENSE)
