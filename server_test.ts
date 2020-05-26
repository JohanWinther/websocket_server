import {
	assertEquals, assertNotEquals,
} from "https://deno.land/std/testing/asserts.ts";
import { delay } from "https://deno.land/std/async/delay.ts";
import {
	connectWebSocket,
	WebSocket,
	WebSocketEvent,
} from "https://deno.land/std/ws/mod.ts";
import { serve, WebSocketServer } from "./server.ts";

const { test } = Deno;

// serve
test("that `serve` returns a server", async () => {
	const port = 8123;
	const server = serve({ port });
	await server.close();
});

// server
test("that a `WebSocketServer` receives events from a client", async () => {
	async function saveIterationResults(
		items: { socket: WebSocket; event: WebSocketEvent; }[],
		server: WebSocketServer
	) {
		for await (const wsEvent of server) {
			items.push(wsEvent);
		}
	}

	const port = 8123;
	const server = serve({ port });
	const results: { socket: WebSocket; event: WebSocketEvent; }[] = [];
	saveIterationResults(results, server);

	const msgsPerClient = 3;
	const client1 = await connectWebSocket(`ws://127.0.0.1:${port}`);
	const client2 = await connectWebSocket(`ws://127.0.0.1:${port}`);
	await client1.send("client 1");
	await delay(10);
	await client2.send("client 2");
	await delay(10);
	await client1.send(new Uint8Array([1, 2, 3]));
	await delay(10);
	await client2.send(new Uint8Array([4, 5, 6]));
	await delay(10);
	await client1.close(1001, "done");
	await delay(10);
	await client2.close(1002, "done");
	await delay(10);

	assertEquals(server.sockets.size, 0, "sockets have not been untracked");
	assertEquals(results.length, 2 * msgsPerClient, "not all events were read");

	assertEquals(results[0].socket, results[2].socket, "first sockets");
	assertEquals(results[0].socket, results[4].socket);
	assertEquals(results[1].socket, results[3].socket);
	assertEquals(results[1].socket, results[5].socket);
	assertNotEquals(results[0].socket, results[1].socket);

	assertEquals(results[0].event, "client 1");
	assertEquals(results[1].event, "client 2");
	assertEquals(results[2].event, new Uint8Array([1, 2, 3]));
	assertEquals(results[3].event, new Uint8Array([4, 5, 6]));
	assertEquals(results[4].event, { code: 1001, reason: "done" });
	assertEquals(results[5].event, { code: 1002, reason: "done" });

	await server.close();
});