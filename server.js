import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 1874 });

wss.on("connection", function connection(ws) {
  ws.on("error", console.error);

  ws.on("message", function message(data) {
    console.log("received: %s", data);
    wss.clients.forEach((client) => {
      client.send(data);
    });
  });

  // TODO: handle disconnections?
  ws.on("connection", function connection(ws, req) {
    const ip = req.socket.remoteAddress;
    connectedClientIps.add(ip);

    ws.on("error", console.error);
  });

  // ws.send("something");
});
