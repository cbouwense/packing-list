import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:1874");

ws.on("error", console.error);

ws.on("open", function open() {
  ws.send("something");
});

ws.on("message", function message(data) {
  console.log("received: %s", data);
});
