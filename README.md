# Deno WebSocket Server 🔌

A WebSocket server library for [Deno](https://deno.land).

The [raison d'être][wiktionary:raison d'être] for this library is to provide a unified async iterator for the events of all connected WebSocket clients.
The way it does this is through a custom [MuxAsyncInfiniteIterator](./mux_async_infinite_iterator.ts) (based on the [MuxAsyncIterator][deno:std/async/mux_async_iterator.ts]), which multiplexes multiple async iterators into a single stream.

**Note**: This WebSocket server is **not** an `EventEmitter` (i.e. it does not use events with callbacks like [websockets/ws](https://github.com/websockets/ws)).
Instead, it specifies the [asyncIterator][mdn:asyncIterator] symbol and should be used in conjunction with a [`for await...of`][mdn:for-await...of] loop, just like the [Deno http server][deno:std/http/server].
The iterator yields `WebSocketServerEvent`s which contain both the `WebSocketEvent` and the corresponding `WebSocket` from which the event was received.

## Usage

### Simple server
```typescript
import { serve } from 'https://raw.githubusercontent.com/JohanWinther/websocket-server/master/mod.ts'
const server = serve(":8080");
for await (const { event } of server) {
  console.log(event);
}
```

### Echo / broadcast server
Check out the example [echo/broadcast server](./example_server.ts).

## FAQ

### How do I create a WebSocket client?
This library provides a class only for WebSocket servers, not WebSocket clients, because it is straightforward to create clients with the [std/ws][deno:std/ws] module.

Here is a simple example:
```typescript
import { connectWebSocket } from "https://deno.land/std/ws/mod.ts";
try {
  const socket = await connectWebSocket("ws://127.0.0.1:8080");
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
GitHub [releases][changelog] is used for changelog entries.

## Acknowledgements
- Thanks to [zorbyte](https://github.com/zorbyte) for helping me understand enough about async iterators to implmenent the server

## License
[MIT](LICENSE)

[changelog]: https://github.com/JohanWinther/websocket-server/releases
[mdn:asyncIterator]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator
[mdn:for-await...of]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
[deno:std/async/mux_async_iterator.ts]: https://deno.land/std/async/mux_async_iterator.ts
[deno:std/http/server]: https://deno.land/std/http/server.ts
[deno:std/ws]: https://deno.land/std/ws/
[wiktionary:raison d'être]: https://en.wiktionary.org/wiki/raison_d%27%C3%AAtre
