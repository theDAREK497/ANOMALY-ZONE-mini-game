import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

interface Player {
  id: string;
  username: string;
  role: "player" | "gm";
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = parseInt(process.env.PORT || "3000", 10);

// In-Memory Database State
let gameState: string = "setup";
let map: any = null;
let messages: any[] = [];
let stashLoot: any[] = [
  { id: "1", name: "Аптечка", weight: 10 },
  { id: "2", name: "Патроны", weight: 20 },
  { id: "3", name: "Антирад", weight: 15 },
  { id: "4", name: "Тушенка", weight: 30 },
  { id: "5", name: "Пусто", weight: 25 },
];
let artifactLoot: any[] = [
  { id: "1", name: "Капля", weight: 20 },
  { id: "2", name: "Кровь камня", weight: 15 },
  { id: "3", name: "Слизь", weight: 25 },
  { id: "4", name: "Колючка", weight: 10 },
  { id: "5", name: "Медуза", weight: 30 },
];

// Connected Sockets
const clients = new Map<WebSocket, Player>();

function broadcast(type: string, payload: any, excludeSocket?: WebSocket) {
  const data = JSON.stringify({ type, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== excludeSocket) {
      client.send(data);
    }
  });
}

function getActiveGMId(): string | null {
  for (const [ws, player] of clients.entries()) {
    if (player.role === "gm" && ws.readyState === WebSocket.OPEN) {
      return player.id;
    }
  }
  return null;
}

wss.on("connection", (ws) => {
  console.log("Новое сокет-подключение.");

  ws.on("message", (messageStr) => {
    try {
      const { type, payload } = JSON.parse(messageStr.toString());

      switch (type) {
        case "JOIN": {
          const { id, username, role } = payload;
          
          // Check if there's already an active GM if joining as GM
          if (role === "gm") {
            const activeGMId = getActiveGMId();
            if (activeGMId && activeGMId !== id) {
              ws.send(JSON.stringify({
                type: "JOIN_REJECTED",
                payload: { reason: "GM_ALREADY_EXISTS" }
              }));
              return;
            }
          }

          clients.set(ws, { id, username, role });
          console.log(`Пользователь ${username} вошел как ${role}`);

          // Send current state
          ws.send(JSON.stringify({
            type: "INIT_STATE",
            payload: {
              gameState,
              map,
              messages,
              stashLoot,
              artifactLoot,
              hasActiveGM: getActiveGMId() !== null
            }
          }));

          // Broadcast players list of all open connections
          broadcastPlayersList();
          break;
        }

        case "SYNC_APP_STATE": {
          const clientData = clients.get(ws);
          if (!clientData) return;

          // Only GM can update state parameters like map, loot etc
          if (clientData.role !== "gm") {
            // But players should be able to trigger non-malicious state actions or sync player coordinates if needed
            // Our app handles coordinate sync via onUpdateMap/broadcast. Let's let all messages through for now, 
            // but update stored server-side copy.
          }

          if (payload.gameState !== undefined) gameState = payload.gameState;
          if (payload.map !== undefined) map = payload.map;
          if (payload.messages !== undefined) messages = payload.messages;
          if (payload.stashLoot !== undefined) stashLoot = payload.stashLoot;
          if (payload.artifactLoot !== undefined) artifactLoot = payload.artifactLoot;

          // Broadcast changes to all other clients
          broadcast("SYNC_APP_STATE", payload, ws);
          break;
        }

        case "FORCE_CLAIM_GM": {
          const { id, username } = payload;
          // Kick other GM if any, assign role to this socket
          for (const [socket, player] of clients.entries()) {
            if (player.role === "gm" && player.id !== id) {
              player.role = "player";
              socket.send(JSON.stringify({
                type: "ROLE_KICKED",
                payload: { newRole: "player", message: "Ваши полномочия GM были перехвачены другим участником." }
              }));
            }
          }
          clients.set(ws, { id, username, role: "gm" });
          ws.send(JSON.stringify({ type: "INIT_STATE", payload: { gameState, map, messages, stashLoot, artifactLoot, hasActiveGM: true } }));
          broadcastPlayersList();
          break;
        }

        case "REQUEST_STATE": {
          ws.send(JSON.stringify({
            type: "INIT_STATE",
            payload: {
              gameState,
              map,
              messages,
              stashLoot,
              artifactLoot,
              hasActiveGM: getActiveGMId() !== null
            }
          }));
          break;
        }
      }
    } catch (err) {
      console.error("Ошибка при обработке сообщения сокета:", err);
    }
  });

  ws.on("close", () => {
    const player = clients.get(ws);
    if (player) {
      console.log(`Пользователь ${player.username} отключился.`);
      clients.delete(ws);
      broadcastPlayersList();
    }
  });
});

function broadcastPlayersList() {
  const list = Array.from(clients.values());
  const hasActiveGM = getActiveGMId() !== null;
  broadcast("PLAYERS_UPDATE", { players: list, hasActiveGM });
}

// Set up server assets / Dev server
async function startServer() {
  // Vite dev server mounting in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\n======================================================`);
    console.log(`⭐ STANDALONE ANOMALY ZONE SERVER RUNNING PORT: ${PORT}`);
    console.log(`👉 Access locally inside development preview`);
    console.log(`👉 Access on local network at http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}

startServer();
