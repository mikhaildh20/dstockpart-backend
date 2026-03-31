import app from "./app.js";
import { createServer } from "http";
import { Server } from "socket.io";
import realtimeBus from "./realtime/event-bus.js";

const PORT = 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.emit("dashboard:connected", { ok: true });
});

realtimeBus.on("dashboard:update", (payload) => {
  io.emit("dashboard:update", payload);
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
