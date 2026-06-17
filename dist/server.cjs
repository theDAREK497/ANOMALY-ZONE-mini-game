var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_http = __toESM(require("http"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_ws = require("ws");
var import_vite = require("vite");
var app = (0, import_express.default)();
var server = import_http.default.createServer(app);
var wss = new import_ws.WebSocketServer({ server });
var PORT = parseInt(process.env.PORT || "3000", 10);
var gameState = "setup";
var map = null;
var messages = [];
var stashLoot = [
  { id: "1", name: "\u0410\u043F\u0442\u0435\u0447\u043A\u0430", weight: 10 },
  { id: "2", name: "\u041F\u0430\u0442\u0440\u043E\u043D\u044B", weight: 20 },
  { id: "3", name: "\u0410\u043D\u0442\u0438\u0440\u0430\u0434", weight: 15 },
  { id: "4", name: "\u0422\u0443\u0448\u0435\u043D\u043A\u0430", weight: 30 },
  { id: "5", name: "\u041F\u0443\u0441\u0442\u043E", weight: 25 }
];
var artifactLoot = [
  { id: "1", name: "\u041A\u0430\u043F\u043B\u044F", weight: 20 },
  { id: "2", name: "\u041A\u0440\u043E\u0432\u044C \u043A\u0430\u043C\u043D\u044F", weight: 15 },
  { id: "3", name: "\u0421\u043B\u0438\u0437\u044C", weight: 25 },
  { id: "4", name: "\u041A\u043E\u043B\u044E\u0447\u043A\u0430", weight: 10 },
  { id: "5", name: "\u041C\u0435\u0434\u0443\u0437\u0430", weight: 30 }
];
var activeVotes = {};
var clients = /* @__PURE__ */ new Map();
function broadcast(type, payload, excludeSocket) {
  const data = JSON.stringify({ type, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === import_ws.WebSocket.OPEN && client !== excludeSocket) {
      client.send(data);
    }
  });
}
function getActiveGMId() {
  for (const [ws, player] of clients.entries()) {
    if (player.role === "gm" && ws.readyState === import_ws.WebSocket.OPEN) {
      return player.id;
    }
  }
  return null;
}
function getActivePlayersCount() {
  return Array.from(clients.values()).filter((p) => p.role === "player").length;
}
function appendSystemMessage(text, type = "info") {
  const msgObj = {
    id: Math.random().toString(36).substring(2, 9),
    sender: "\u0421\u0418\u0421\u0422\u0415\u041C\u0410",
    text,
    type,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString()
  };
  messages.push(msgObj);
}
function getWeightedLoot(lootTable) {
  if (lootTable.length === 0) return "\u041D\u0438\u0447\u0435\u0433\u043E";
  const totalWeight = lootTable.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of lootTable) {
    random -= item.weight;
    if (random <= 0) return item.name;
  }
  return lootTable[lootTable.length - 1].name;
}
function checkGameLossSurvival() {
  if (!map) return;
  if (map.health <= 0) {
    appendSystemMessage("\u{1F480} \u0413\u0420\u0423\u041F\u041F\u0410 \u041F\u041E\u0413\u0418\u0411\u041B\u0410! \u041E\u0447\u043A\u0438 \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u0438\u0441\u0441\u044F\u043A\u043B\u0438 \u0432 \u0430\u043D\u043E\u043C\u0430\u043B\u0438\u0438!", "danger");
    gameState = "ended";
  }
  if (map.radiation >= map.maxRadiation) {
    appendSystemMessage("\u{1F480} \u0413\u0420\u0423\u041F\u041F\u0410 \u041F\u041E\u0413\u0418\u0411\u041B\u0410! \u041D\u0430\u0431\u043E\u0440 \u043A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0439 \u0440\u0430\u0434\u0438\u0430\u0446\u0438\u0438 \u043F\u0440\u0438\u0432\u0435\u043B \u043A \u043B\u0443\u0447\u0435\u0432\u043E\u0439 \u0441\u043C\u0435\u0440\u0442\u0438 \u0432\u0441\u0435\u0433\u043E \u043E\u0442\u0440\u044F\u0434\u0430!", "danger");
    gameState = "ended";
  }
}
function resolveArtifactDetectionByLevel(px, py) {
  let artifacts = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.grid[y][x].type === "artifact") {
        const dist = Math.max(Math.abs(x - px), Math.abs(y - py));
        if (dist <= 3) {
          artifacts.push({ x, y, dist });
        }
      }
    }
  }
  artifacts.sort((a, b) => a.dist - b.dist);
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const nx = px + dx;
      const ny = py + dy;
      if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
        map.grid[ny][nx].isScannedForArtifact = true;
      }
    }
  }
  if (artifacts.length === 0) {
    appendSystemMessage("\u{1F52E} \u0410\u043D\u0430\u043B\u0438\u0437\u0430\u0442\u043E\u0440 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u043E\u0432 \u043C\u043E\u043B\u0447\u0438\u0442. \u0412 \u0440\u0430\u0434\u0438\u0443\u0441\u0435 3\u0445 \u043A\u043B\u0435\u0442\u043E\u043A \u043F\u0443\u0441\u0442\u043E.", "info");
    map.activeDirectionHighlight = null;
    return;
  }
  const closest = artifacts[0];
  const level = map.detectorLevel;
  if (level === 1) {
    appendSystemMessage("\u{1F52E} \u0423\u0420\u041E\u0412\u0415\u041D\u042C 1 (\u041F\u0420\u041E\u0421\u0422\u041E\u0419): \u0414\u0435\u0442\u0435\u043A\u0442\u043E\u0440 \u043C\u0435\u0440\u043D\u043E \u043F\u0438\u0449\u0438\u0442. \u041F\u043E\u0431\u043B\u0438\u0437\u043E\u0441\u0442\u0438 \u0435\u0441\u0442\u044C \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442!", "loot");
    map.activeDirectionHighlight = null;
  } else if (level === 2) {
    let dirY = "";
    let dirX = "";
    if (closest.y < py) dirY = "\u0421\u0415\u0412\u0415\u0420";
    else if (closest.y > py) dirY = "\u042E\u0413";
    if (closest.x < px) dirX = "\u0417\u0410\u041F\u0410\u0414";
    else if (closest.x > px) dirX = "\u0412\u041E\u0421\u0422\u041E\u041A";
    const directionText = [dirY, dirX].filter(Boolean).join("-");
    appendSystemMessage(`\u{1F52E} \u0423\u0420\u041E\u0412\u0415\u041D\u042C 2 (\u041D\u0410\u041F\u0420\u0410\u0412\u041B\u0415\u041D\u0418\u0415): \u0420\u0430\u0434\u0430\u0440 \u0444\u0438\u043A\u0441\u0438\u0440\u0443\u0435\u0442 \u0438\u0437\u043B\u0443\u0447\u0435\u043D\u0438\u0435 \u0432 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0438: ${directionText}!`, "loot");
    let code = "";
    if (closest.y < py) code += "N";
    if (closest.y > py) code += "S";
    if (closest.x < px) code += "W";
    if (closest.x > px) code += "E";
    map.activeDirectionHighlight = code;
  } else if (level === 3) {
    appendSystemMessage("\u{1F52E} \u0423\u0420\u041E\u0412\u0415\u041D\u042C 3 (\u041E\u0411\u041B\u0410\u0421\u0422\u042C): \u041F\u0440\u0438\u0431\u043E\u0440 \u043B\u043E\u043A\u0430\u043B\u0438\u0437\u043E\u0432\u0430\u043B \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442 \u0432 \u043F\u0440\u0438\u0431\u043B\u0438\u0437\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u043C \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u0435 3x3!", "loot");
    map.activeDirectionHighlight = null;
    const ax = closest.x;
    const ay = closest.y;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const hx = ax + dx;
        const hy = ay + dy;
        if (hx >= 0 && hx < map.width && hy >= 0 && hy < map.height) {
          map.grid[hy][hx].isScannedForArtifact = true;
          map.grid[hy][hx].isApproximateLocation = true;
        }
      }
    }
  } else if (level === 4) {
    appendSystemMessage("\u{1F52E} \u0423\u0420\u041E\u0412\u0415\u041D\u042C 4 (\u0422\u041E\u0427\u041D\u042B\u0419): \u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u044B \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u0440\u0430\u0441\u0441\u0435\u043A\u0440\u0435\u0447\u0435\u043D\u044B!", "loot");
    map.activeDirectionHighlight = null;
    map.grid[closest.y][closest.x].isRevealed = true;
    map.grid[closest.y][closest.x].isScannedForArtifact = true;
  }
}
function resolveCellEnter(nx, ny) {
  map.grid[ny][nx].isRevealed = true;
  const cell = map.grid[ny][nx];
  if (cell.radiationLevel > 0) {
    const dose = cell.radiationLevel * 8;
    map.radiation = Math.min(map.maxRadiation, map.radiation + dose);
    appendSystemMessage(`\u2623\uFE0F \u0412\u043D\u0438\u043C\u0430\u043D\u0438\u0435! \u0414\u043E\u0437\u0430 \u043E\u0431\u043B\u0443\u0447\u0435\u043D\u0438\u044F: +${dose} \u0440\u0430\u0434 (\u0422\u0435\u043A: ${map.radiation}/${map.maxRadiation})!`, "warning");
    const radDmg = cell.radiationLevel * 6;
    map.health = Math.max(0, map.health - radDmg);
    appendSystemMessage(`\u{1F494} \u0417\u0434\u043E\u0440\u043E\u0432\u044C\u0435 \u043E\u0442\u0440\u044F\u0434\u0430 \u0441\u043D\u0438\u0437\u0438\u043B\u043E\u0441\u044C \u043D\u0430 -${radDmg} HP \u0438\u0437-\u0437\u0430 \u0444\u043E\u043D\u0438\u0440\u0443\u044E\u0449\u0438\u0445 \u043E\u0447\u0430\u0433\u043E\u0432 \u0440\u0430\u0434\u0438\u0430\u0446\u0438\u0438.`, "danger");
  }
  if (cell.type === "exit") {
    appendSystemMessage("\u{1F3C6} \u041F\u043E\u0437\u0434\u0440\u0430\u0432\u043B\u044F\u0435\u043C! \u0413\u0440\u0443\u043F\u043F\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043F\u0440\u0435\u043E\u0434\u043E\u043B\u0435\u043B\u0430 \u043A\u043E\u0440\u0434\u043E\u043D\u044B \u0438 \u043F\u043E\u043A\u0438\u043D\u0443\u043B\u0430 \u0430\u043D\u043E\u043C\u0430\u043B\u044C\u043D\u0443\u044E \u0437\u043E\u043D\u0443!", "success");
    gameState = "ended";
    return;
  }
  if (cell.type === "stash") {
    const loot = getWeightedLoot(stashLoot);
    appendSystemMessage(`\u{1F4E6} \u041D\u0430\u0439\u0434\u0435\u043D \u0437\u0430\u0431\u0440\u043E\u0448\u0435\u043D\u043D\u044B\u0439 \u0441\u0445\u0440\u043E\u043D! \u041F\u043E\u043B\u0443\u0447\u0435\u043D\u043E: "${loot}"`, "loot");
    if (!map.inventory) map.inventory = [];
    if (loot && loot !== "\u041D\u0438\u0447\u0435\u0433\u043E" && loot !== "\u041F\u0443\u0441\u0442\u043E") {
      map.inventory.push(loot);
    }
    map.grid[ny][nx].type = "empty";
  }
  if (cell.type === "artifact") {
    const loot = getWeightedLoot(artifactLoot);
    appendSystemMessage(`\u{1F48E} \u0423\u0420\u0410! \u0412\u044B \u043F\u043E\u0434\u043E\u0431\u0440\u0430\u043B\u0438 \u0446\u0435\u043D\u043D\u044B\u0439 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442: "${loot}"`, "loot");
    if (!map.inventory) map.inventory = [];
    if (loot && loot !== "\u041D\u0438\u0447\u0435\u0433\u043E" && loot !== "\u041F\u0443\u0441\u0442\u043E") {
      map.inventory.push(loot);
    }
    map.grid[ny][nx].type = "empty";
  }
  if (cell.type === "anomaly") {
    const name = cell.anomalyType;
    if (name === "fire") {
      map.health = Math.max(0, map.health - 25);
      appendSystemMessage("\u{1F525} \u0416\u0410\u0420\u041A\u0410! \u041E\u0433\u043D\u0435\u043D\u043D\u044B\u0439 \u0441\u0442\u043E\u043B\u0431 \u0441\u0436\u0438\u0433\u0430\u0435\u0442 \u0441\u043D\u0430\u0440\u044F\u0436\u0435\u043D\u0438\u0435: -25HP \u0443 \u0432\u0441\u0435\u0439 \u0433\u0440\u0443\u043F\u043F\u044B!", "danger");
    } else if (name === "trampoline") {
      map.health = Math.max(0, map.health - 20);
      appendSystemMessage("\u{1F4A8} \u0422\u0420\u0410\u041C\u041F\u041B\u0418\u041D! \u0421\u0442\u043E\u043B\u043A\u043D\u043E\u0432\u0435\u043D\u0438\u0435 \u0441\u0436\u0430\u0442\u043E\u0433\u043E \u0432\u043E\u0437\u0434\u0443\u0445\u0430 \u0448\u0432\u044B\u0440\u044F\u0435\u0442 \u0433\u0440\u0443\u043F\u043F\u0443: -20HP! \u0421\u043B\u0443\u0447\u0430\u0439\u043D\u0430\u044F \u0442\u0435\u043B\u0435\u043F\u043E\u0440\u0442\u0430\u0446\u0438\u044F...", "danger");
      const tx = Math.floor(Math.random() * map.width);
      const ty = Math.floor(Math.random() * map.height);
      map.playerPos = { x: tx, y: ty };
      resolveCellEnter(tx, ty);
    } else if (name === "sphere") {
      map.health = Math.max(0, map.health - 30);
      appendSystemMessage("\u{1FAE7} \u0413\u0420\u0410\u0412\u0418-\u0421\u0424\u0415\u0420\u0410! \u0421\u0434\u0430\u0432\u043B\u0438\u0432\u0430\u044E\u0449\u0438\u0439 \u043A\u0443\u043F\u043E\u043B \u043D\u0430\u043D\u043E\u0441\u0438\u0442 \u0442\u044F\u0436\u0435\u043B\u044B\u0435 \u0443\u0432\u0435\u0447\u044C\u044F: -30HP!", "danger");
      if (!cell.hasExpanded) {
        cell.hasExpanded = true;
        const adj = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 },
          { dx: 1, dy: 1 },
          { dx: -1, dy: -1 },
          { dx: 1, dy: -1 },
          { dx: -1, dy: 1 }
        ];
        adj.forEach((d) => {
          const ax = nx + d.dx;
          const ay = ny + d.dy;
          if (ax >= 0 && ax < map.width && ay >= 0 && ay < map.height) {
            if (map.grid[ay][ax].type === "empty") {
              map.grid[ay][ax] = {
                ...map.grid[ay][ax],
                type: "anomaly",
                anomalyType: "sphere",
                isRevealed: true,
                hasExpanded: true
              };
            }
          }
        });
        appendSystemMessage("\u{1FAE7} \u0410\u043D\u043E\u043C\u0430\u043B\u0438\u044F \u0421\u0444\u0435\u0440\u0430 \u0434\u0435\u0442\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043B\u0430 \u0438 \u0440\u0430\u0441\u0448\u0438\u0440\u0438\u043B\u0430 \u0441\u043C\u0435\u0440\u0442\u043E\u043D\u043E\u0441\u043D\u043E\u0435 \u043F\u043E\u043B\u0435 \u043D\u0430 \u0441\u043E\u0441\u0435\u0434\u043D\u0438\u0435 \u043A\u043B\u0435\u0442\u043A\u0438!", "danger");
      }
    } else if (name === "electric") {
      map.health = Math.max(0, map.health - 25);
      appendSystemMessage("\u26A1 \u042D\u041B\u0415\u041A\u0422\u0420\u0410! \u042D\u043B\u0435\u043A\u0442\u0440\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0448\u043E\u043A \u043F\u0430\u0440\u0430\u043B\u0438\u0437\u0443\u0435\u0442 \u043E\u0442\u0440\u044F\u0434: -25HP!", "danger");
    } else if (name === "vortex") {
      map.health = Math.max(0, map.health - 15);
      appendSystemMessage("\u{1F300} \u0412\u041E\u0420\u041E\u041D\u041A\u0410! \u0413\u0440\u0443\u043F\u043F\u0443 \u0437\u0430\u0442\u044F\u043D\u0443\u043B\u043E \u0432 \u043C\u0430\u043B\u0443\u044E \u0441\u0438\u043D\u0433\u0443\u043B\u044F\u0440\u043D\u043E\u0441\u0442\u044C: -15HP! \u0412\u044B \u0441\u0434\u0432\u0438\u043D\u0443\u0442\u044B \u0432 \u0441\u0442\u043E\u0440\u043E\u043D\u0443.", "danger");
      const directions = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
      const valid = directions.filter(
        (d) => nx + d.dx >= 0 && nx + d.dx < map.width && ny + d.dy >= 0 && ny + d.dy < map.height
      );
      if (valid.length > 0) {
        const d = valid[Math.floor(Math.random() * valid.length)];
        map.playerPos = { x: nx + d.dx, y: ny + d.dy };
        resolveCellEnter(nx + d.dx, ny + d.dy);
      }
    } else if (name === "time_loop") {
      map.health = Math.max(0, map.health - 10);
      appendSystemMessage("\u23F3 \u0425\u0420\u041E\u041D\u041E\u0421\u0414\u0412\u0418\u0413! \u0412\u0441\u043F\u044B\u0448\u043A\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u043F\u0435\u0442\u043B\u0438 \u043F\u0435\u0440\u0435\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442 \u0433\u0440\u0443\u043F\u043F\u0443 \u043D\u0430 \u0442\u043E\u0447\u043A\u0443 \u0432\u0445\u043E\u0434\u0430: -10HP!", "danger");
      map.playerPos = { x: map.entrance.x, y: map.entrance.y };
      resolveCellEnter(map.entrance.x, map.entrance.y);
    }
  }
}
function getAnomalyRussianName(type) {
  if (!type) return "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u0430\u043D\u043E\u043C\u0430\u043B\u0438\u044F";
  const translations = {
    "fire": "\u0416\u0430\u0440\u043A\u0430",
    "trampoline": "\u0422\u0440\u0430\u043C\u043F\u043B\u0438\u043D",
    "sphere": "\u0413\u0440\u0430\u0432\u0438-\u0441\u0444\u0435\u0440\u0430",
    "electric": "\u042D\u043B\u0435\u043A\u0442\u0440\u0430",
    "vortex": "\u0412\u043E\u0440\u043E\u043D\u043A\u0430",
    "time_loop": "\u0425\u0440\u043E\u043D\u043E\u0441\u0434\u0432\u0438\u0433"
  };
  return translations[type] || type;
}
function executeGameAction(action) {
  if (!map) return;
  if (!map.playerPos) {
    map.playerPos = { x: map.entrance.x, y: map.entrance.y };
  }
  const px = map.playerPos.x;
  const py = map.playerPos.y;
  let dx = 0;
  let dy = 0;
  if (action === "UP") dy = -1;
  else if (action === "DOWN") dy = 1;
  else if (action === "LEFT") dx = -1;
  else if (action === "RIGHT") dx = 1;
  if (dx !== 0 || dy !== 0) {
    const nx = px + dx;
    const ny = py + dy;
    if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
      map.playerPos = { x: nx, y: ny };
      resolveCellEnter(nx, ny);
    } else {
      appendSystemMessage("\u26D4 \u041A\u043E\u043C\u0430\u043D\u0434\u0438\u0440 \u043F\u0435\u0440\u0435\u0434\u0443\u043C\u0430\u043B: \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0435 \u0437\u0430 \u0433\u0440\u0430\u043D\u0438\u0446\u044B \u0438\u0437\u0443\u0447\u0435\u043D\u043D\u043E\u0433\u043E \u0441\u0435\u043A\u0442\u043E\u0440\u0430 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u043E!");
    }
  } else if (action.startsWith("BOLT")) {
    if (map.boltCharges === void 0) map.boltCharges = 10;
    if (map.boltCharges <= 0) {
      appendSystemMessage("\u274C \u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0431\u043E\u043B\u0442: \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0441\u044F \u0437\u0430\u043F\u0430\u0441 \u0432 \u0440\u044E\u043A\u0437\u0430\u043A\u0435!", "warning");
      return;
    }
    map.boltCharges--;
    let boltDir = "UP";
    if (action.includes("_")) {
      boltDir = action.split("_")[1];
    }
    let bdx = 0;
    let bdy = 0;
    let directionName = "";
    if (boltDir === "UP") {
      bdy = -1;
      directionName = "\u0432\u0432\u0435\u0440\u0445 (\u043D\u0430 \u0421\u0415\u0412\u0415\u0420) \u2B06\uFE0F";
    } else if (boltDir === "DOWN") {
      bdy = 1;
      directionName = "\u0432\u043D\u0438\u0437 (\u043D\u0430 \u042E\u0413) \u2B07\uFE0F";
    } else if (boltDir === "LEFT") {
      bdx = -1;
      directionName = "\u0432\u043B\u0435\u0432\u043E (\u043D\u0430 \u0417\u0410\u041F\u0410\u0414) \u2B05\uFE0F";
    } else if (boltDir === "RIGHT") {
      bdx = 1;
      directionName = "\u0432\u043F\u0440\u0430\u0432\u043E (\u043D\u0430 \u0412\u041E\u0421\u0422\u041E\u041A) \u27A1\uFE0F";
    }
    appendSystemMessage(`\u{1F529} \u0411\u0440\u043E\u0448\u0435\u043D \u0431\u043E\u043B\u0442 \u0432 \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0438: ${directionName}! \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0431\u043E\u043B\u0442\u043E\u0432: ${map.boltCharges}`);
    let anomalyDetected = false;
    for (let step = 1; step <= 3; step++) {
      const targetX = px + bdx * step;
      const targetY = py + bdy * step;
      if (targetX >= 0 && targetX < map.width && targetY >= 0 && targetY < map.height) {
        map.grid[targetY][targetX].isScannedByBolt = true;
        if (map.grid[targetY][targetX].type === "anomaly") {
          anomalyDetected = true;
          map.grid[targetY][targetX].isRevealed = true;
          const translatedName = getAnomalyRussianName(map.grid[targetY][targetX].anomalyType);
          appendSystemMessage(`\u{1F4A5} \u0411\u043E\u043B\u0442 \u0434\u0435\u0442\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043B \u0430\u043D\u043E\u043C\u0430\u043B\u0438\u044E \u043D\u0430 \u0440\u0430\u0441\u0441\u0442\u043E\u044F\u043D\u0438\u0438 ${step} \u043A\u043B. \u043F\u043E\u0434 \u0432\u043E\u0437\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435\u043C \u043E\u0447\u0430\u0433\u0430: "${translatedName}"!`, "danger");
          break;
        }
      } else {
        break;
      }
    }
    if (!anomalyDetected) {
      appendSystemMessage(`\u{1F7E2} \u0411\u043E\u043B\u0442 \u043F\u0440\u043E\u043B\u0435\u0442\u0435\u043B \u043F\u0443\u0442\u044C \u043F\u043E \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044E ${directionName} \u0438 \u0443\u043F\u0430\u043B \u0431\u0435\u0437 \u0448\u0443\u043C\u0430. \u041E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438 \u0432\u043F\u0435\u0440\u0435\u0434\u0438 \u043D\u0435\u0442.`, "success");
    }
  } else if (action === "GEIGER") {
    if (map.geigerCharges <= 0) {
      appendSystemMessage("\u274C \u041D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0441\u0447\u0435\u0442\u0447\u0438\u043A \u0413\u0435\u0439\u0433\u0435\u0440\u0430: \u0440\u0430\u0437\u0440\u044F\u0436\u0435\u043D\u044B \u0430\u043A\u043A\u0443\u043C\u0443\u043B\u044F\u0442\u043E\u0440\u044B!", "warning");
      return;
    }
    map.geigerCharges--;
    appendSystemMessage(`\u{1F4E1} \u0410\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D \u0441\u0447\u0435\u0442\u0447\u0438\u043A \u0413\u0435\u0439\u0433\u0435\u0440\u0430 (\u0417\u0430\u0440\u044F\u0434\u043E\u0432 \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C: ${map.geigerCharges})`);
    let foundRad = false;
    for (let gdy = -2; gdy <= 2; gdy++) {
      for (let gdx = -2; gdx <= 2; gdx++) {
        const nx = px + gdx;
        const ny = py + gdy;
        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
          map.grid[ny][nx].isScannedForRadiation = true;
          if (map.grid[ny][nx].radiationLevel > 0) foundRad = true;
        }
      }
    }
    if (foundRad) {
      appendSystemMessage("\u26A0\uFE0F \u041F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u0435! \u0420\u044F\u0434\u043E\u043C \u043E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u044B \u043E\u0447\u0430\u0433\u0438 \u0436\u0435\u0441\u0442\u043A\u043E\u0439 \u0440\u0430\u0434\u0438\u0430\u0446\u0438\u0438!", "warning");
    } else {
      appendSystemMessage("\u{1F7E2} \u0420\u0430\u0434\u0438\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0439 \u0444\u043E\u043D \u0432\u043E\u043A\u0440\u0443\u0433 \u043E\u0442\u0440\u044F\u0434\u0430 \u0432 \u043F\u0440\u0435\u0434\u0435\u043B\u0430\u0445 \u043D\u043E\u0440\u043C\u044B.", "success");
    }
  } else if (action === "SCAN") {
    if (map.detectorCharges <= 0) {
      appendSystemMessage("\u274C \u041F\u043E\u0438\u0441\u043A \u0441\u043E\u0440\u0432\u0430\u043D: \u0434\u0435\u0442\u0435\u043A\u0442\u043E\u0440 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u043E\u0432 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u0440\u0430\u0437\u0440\u044F\u0436\u0435\u043D!", "warning");
      return;
    }
    map.detectorCharges--;
    appendSystemMessage(`\u{1F52E} \u0417\u0430\u043F\u0443\u0449\u0435\u043D \u0434\u0435\u0442\u0435\u043A\u0442\u043E\u0440 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u043E\u0432 (\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0414\u0435\u0442\u0435\u043A\u0442\u043E\u0440\u0430: ${map.detectorLevel}, \u0437\u0430\u0440\u044F\u0434\u043E\u0432: ${map.detectorCharges})`);
    resolveArtifactDetectionByLevel(px, py);
  }
  if (action === "UP" || action === "DOWN" || action === "LEFT" || action === "RIGHT") {
    map.activeDirectionHighlight = null;
  }
  map.timerSeconds = 60;
  checkGameLossSurvival();
}
var serverClockInterval = null;
function initTurnTimerClock() {
  if (serverClockInterval) clearInterval(serverClockInterval);
  serverClockInterval = setInterval(() => {
    if (gameState === "playing" && map) {
      if (map.timerSeconds > 0) {
        map.timerSeconds--;
        broadcast("TIMER_TICK", { timerSeconds: map.timerSeconds });
      } else {
        map.timerSeconds = 60;
        const radPenalty = 15;
        map.radiation = Math.min(map.maxRadiation, map.radiation + radPenalty);
        appendSystemMessage(`\u26A0\uFE0F \u0412\u0420\u0415\u041C\u042F \u0425\u041E\u0414\u0410 \u0418\u0421\u0422\u0415\u041A\u041B\u041E! \u041F\u0440\u0435\u0431\u044B\u0432\u0430\u043D\u0438\u0435 \u0431\u0435\u0437 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F \u043E\u0431\u043B\u0443\u0447\u0430\u0435\u0442 \u043E\u0442\u0440\u044F\u0434 (+${radPenalty} \u0440\u0430\u0434)!`, "danger");
        map.health = Math.max(0, map.health - 10);
        checkGameLossSurvival();
        activeVotes = {};
        broadcast("VOTES_UPDATE", { activeVotes, activePlayersCount: getActivePlayersCount() });
        broadcast("SYNC_APP_STATE", { map, gameState, messages });
      }
    }
  }, 1e3);
}
initTurnTimerClock();
var PLAYER_DB_FILE = import_path.default.join(process.cwd(), "db_players.json");
var playerDb = {};
try {
  if (import_fs.default.existsSync(PLAYER_DB_FILE)) {
    playerDb = JSON.parse(import_fs.default.readFileSync(PLAYER_DB_FILE, "utf-8"));
  }
} catch (e) {
  console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 db_players.json, \u0441\u043E\u0437\u0434\u0430\u0435\u043C \u043D\u043E\u0432\u044B\u0439:", e);
}
function savePlayerDb() {
  try {
    import_fs.default.writeFileSync(PLAYER_DB_FILE, JSON.stringify(playerDb, null, 2), "utf-8");
  } catch (e) {
    console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F db_players.json:", e);
  }
}
var SHOP_ITEMS_FILE = import_path.default.join(process.cwd(), "db_shop_items.json");
var shopItems = [];
try {
  if (import_fs.default.existsSync(SHOP_ITEMS_FILE)) {
    shopItems = JSON.parse(import_fs.default.readFileSync(SHOP_ITEMS_FILE, "utf-8"));
  } else {
    shopItems = [
      { id: "s1", name: "\u0410\u043F\u0442\u0435\u0447\u043A\u0430 \u043F\u0435\u0440\u0432\u043E\u0439 \u043F\u043E\u043C\u043E\u0449\u0438", price: 150, type: "med", description: "\u0411\u044B\u0441\u0442\u0440\u043E \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u0442 \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u0435 \u043E\u0442\u0440\u044F\u0434\u0430." },
      { id: "s2", name: "\u0410\u043D\u0442\u0438\u0440\u0430\u0434\u0438\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0439 \u0448\u043F\u0440\u0438\u0446", price: 100, type: "med", description: "\u0412\u044B\u0432\u043E\u0434\u0438\u0442 150 \u0440\u0430\u0434 \u0442\u044F\u0436\u0435\u043B\u044B\u0445 \u0438\u0437\u043E\u0442\u043E\u043F\u043E\u0432." },
      { id: "s3", name: "\u042D\u043A\u0437\u043E\u0441\u043A\u0435\u043B\u0435\u0442 \u041C\u043E\u043D\u043E\u043B\u0438\u0442\u0430", price: 1500, type: "armor", description: "\u041F\u0440\u0435\u0432\u043E\u0441\u0445\u043E\u0434\u043D\u0430\u044F \u0431\u0440\u043E\u043D\u044F." },
      { id: "s4", name: "\u041D\u0430\u0443\u0447\u043D\u0430\u044F \u0430\u043F\u0442\u0435\u0447\u043A\u0430", price: 250, type: "med", description: "\u041F\u0440\u0435\u043C\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u0442\u0430\u043B\u043A\u0435\u0440\u0441\u043A\u0438\u0439 \u043C\u0435\u0434\u0438\u043A\u0430\u043C\u0435\u043D\u0442." },
      { id: "s5", name: "\u0414\u0435\u0442\u0435\u043A\u0442\u043E\u0440 '\u041E\u0442\u043A\u043B\u0438\u043A'", price: 300, type: "misc", description: "\u041F\u0440\u043E\u0441\u0442\u043E\u0439 \u0434\u0435\u0442\u0435\u043A\u0442\u043E\u0440 \u0430\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u043E\u0432." }
    ];
    import_fs.default.writeFileSync(SHOP_ITEMS_FILE, JSON.stringify(shopItems, null, 2), "utf-8");
  }
} catch (e) {
  console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 db_shop_items.json:", e);
}
function saveShopItems() {
  try {
    import_fs.default.writeFileSync(SHOP_ITEMS_FILE, JSON.stringify(shopItems, null, 2), "utf-8");
  } catch (e) {
    console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F db_shop_items.json:", e);
  }
}
var TAVERN_SETTINGS_FILE = import_path.default.join(process.cwd(), "db_tavern_settings.json");
var tavernSettings = {
  tavernName: "\u0411\u0430\u0440 \xAB100 \u0420\u0435\u043D\u0442\u0433\u0435\u043D\xBB",
  enabledGames: {
    trades: true,
    pazaak: true,
    dice: true,
    races: true,
    slots: true,
    roulette: true,
    shooting: true
  }
};
try {
  if (import_fs.default.existsSync(TAVERN_SETTINGS_FILE)) {
    tavernSettings = JSON.parse(import_fs.default.readFileSync(TAVERN_SETTINGS_FILE, "utf-8"));
  } else {
    import_fs.default.writeFileSync(TAVERN_SETTINGS_FILE, JSON.stringify(tavernSettings, null, 2), "utf-8");
  }
} catch (e) {
  console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 db_tavern_settings.json, \u0441\u043E\u0437\u0434\u0430\u0435\u043C \u0434\u0435\u0444\u043E\u043B\u0442:", e);
}
function saveTavernSettings() {
  try {
    import_fs.default.writeFileSync(TAVERN_SETTINGS_FILE, JSON.stringify(tavernSettings, null, 2), "utf-8");
  } catch (e) {
    console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F db_tavern_settings.json:", e);
  }
}
function initPlayerProfile(id, username) {
  if (!playerDb[id]) {
    playerDb[id] = {
      userName: username,
      balance: 1e3,
      unlockedCards: ["+1", "-1", "+2", "-2", "+3", "-3", "+4", "-4", "+5", "-5"],
      pazaakDeck: []
    };
    savePlayerDb();
    appendSystemMessage(`\u{1F464} \u0411\u0430\u0437\u0430 \u0414\u0430\u043D\u043D\u044B\u0445: \u0421\u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D \u043A\u043E\u0448\u0435\u043B\u0435\u043A \u0432 \u041A\u041F\u041A-\u0441\u0435\u0442\u0438 \u0434\u043B\u044F \u0441\u0442\u0430\u043B\u043A\u0435\u0440\u0430 "${username}" (+1000 RU).`, "info");
  } else if (!playerDb[id].userName) {
    playerDb[id].userName = username;
    savePlayerDb();
  }
  return playerDb[id];
}
function broadcastTavernGames() {
  broadcast("SYNC_TAVERN_GAMES", { pazaakLobbies, playerDb, activeRace, shopItems, tavernSettings });
}
var pazaakLobbies = {};
var activeRace = {
  status: "none",
  contestants: [
    { name: "\u0411\u0443\u044F\u043D \u{1F40E}", position: 0, odds: 1.4, color: "text-amber-500", type: "favorite" },
    { name: "\u0428\u0443\u0441\u0442\u0440\u044B\u0439 \u{1F41C}", position: 0, odds: 2, color: "text-emerald-500", type: "balanced" },
    { name: "\u0423\u0441\u0430\u0447 \u0421\u0438\u0434\u043E\u0440\u043E\u0432\u0438\u0447\u0430 \u{1FAB3}", position: 0, odds: 2.6, color: "text-yellow-500", type: "balanced" },
    { name: "\u0420\u0436\u0430\u0432\u044B\u0439 \u0411\u043E\u043B\u0442 \u{1F697}", position: 0, odds: 4, color: "text-cyan-500", type: "underdog" }
  ],
  bets: [],
  winner: null,
  log: [],
  tickCount: 0
};
function rollPazaakStep(lobby) {
  if (lobby.status !== "playing") return;
  const currentTurn = lobby.turn;
  const isA = currentTurn === lobby.creatorId;
  const stand = isA ? lobby.playerAStand : lobby.playerBStand;
  if (stand) {
    if (lobby.playerAStand && lobby.playerBStand) {
      checkPazaakRoundEnd(lobby);
      return;
    }
    lobby.turn = isA ? lobby.opponentId : lobby.creatorId;
    rollPazaakStep(lobby);
    return;
  }
  const drawn = Math.floor(Math.random() * 10) + 1;
  if (isA) {
    lobby.playerABoard.push(drawn);
    lobby.playerAScore = lobby.playerABoard.reduce((sum, b) => sum + b, 0);
    lobby.log.push(`${lobby.creatorName} \u0442\u044F\u043D\u0435\u0442 \u043A\u0430\u0440\u0442\u0443: ${drawn}. \u0421\u0447\u0435\u0442: ${lobby.playerAScore}`);
    if (lobby.playerAScore > 20) {
      lobby.statusMessage = `${lobby.creatorName} \u0440\u0435\u0448\u0430\u0435\u0442 \u0447\u0442\u043E \u0434\u0435\u043B\u0430\u0442\u044C \u0441 \u043F\u0435\u0440\u0435\u0431\u043E\u0440\u043E\u043C (${lobby.playerAScore})...`;
    } else {
      lobby.statusMessage = `\u0425\u043E\u0434 ${lobby.creatorName} (${lobby.playerAScore}). \u0421\u044B\u0433\u0440\u0430\u0439\u0442\u0435 \u043A\u0430\u0440\u0442\u0443 \u041A\u041F\u041A \u0438\u043B\u0438 \u043F\u0430\u0441\u0443\u0439\u0442\u0435.`;
    }
  } else {
    lobby.playerBBoard.push(drawn);
    lobby.playerBScore = lobby.playerBBoard.reduce((sum, b) => sum + b, 0);
    lobby.log.push(`${lobby.opponentName} \u0442\u044F\u043D\u0435\u0442 \u043A\u0430\u0440\u0442\u0443: ${drawn}. \u0421\u0447\u0435\u0442: ${lobby.playerBScore}`);
    if (lobby.playerBScore > 20) {
      lobby.statusMessage = `${lobby.opponentName} \u0440\u0435\u0448\u0430\u0435\u0442 \u0447\u0442\u043E \u0434\u0435\u043B\u0430\u0442\u044C \u0441 \u043F\u0435\u0440\u0435\u0431\u043E\u0440\u043E\u043C (${lobby.playerBScore})...`;
    } else {
      lobby.statusMessage = `\u0425\u043E\u0434 ${lobby.opponentName} (${lobby.playerBScore}). \u0421\u044B\u0433\u0440\u0430\u0439\u0442\u0435 \u043A\u0430\u0440\u0442\u0443 \u041A\u041F\u041A \u0438\u043B\u0438 \u043F\u0430\u0441\u0443\u0439\u0442\u0435.`;
    }
  }
  if (lobby.opponentId === "BOT_BAR" && lobby.turn === "BOT_BAR" && !lobby.playerBStand) {
    runPazaakBotTurn(lobby);
  }
}
function runPazaakBotTurn(lobby) {
  setTimeout(() => {
    if (lobby.status !== "playing" || lobby.turn !== "BOT_BAR") return;
    let playedCard = false;
    let score = lobby.playerBScore;
    for (let i = 0; i < lobby.playerBHands.length; i++) {
      const card = lobby.playerBHands[i];
      if (!card) continue;
      let val = 0;
      if (card.startsWith("+/-")) {
        const amt = parseInt(card.replace("+/-", ""), 10);
        if (score + amt === 20) val = amt;
        else if (score - amt === 20) val = -amt;
        else if (score > 20 && score - amt <= 20) val = -amt;
      } else if (card.startsWith("+")) {
        const amt = parseInt(card.replace("+", ""), 10);
        if (score + amt === 20) val = amt;
      } else if (card.startsWith("-")) {
        const amt = parseInt(card.replace("-", ""), 10);
        if (score - amt === 20 || score > 20 && score - amt <= 20) val = -amt;
      } else if (card === "D") {
        const last = lobby.playerBBoard[lobby.playerBBoard.length - 1] || 0;
        if (score + last === 20) val = last;
      }
      if (val !== 0) {
        lobby.playerBBoard.push(val);
        lobby.playerBScore = lobby.playerBBoard.reduce((sum, b) => sum + b, 0);
        lobby.log.push(`\u{1F916} \u0425\u0430\u0440\u043E\u043D \u0441\u044B\u0433\u0440\u0430\u043B \u043A\u0430\u0440\u0442\u0443 [${card}] (\u044D\u0444\u0444\u0435\u043A\u0442: ${val > 0 ? "+" : ""}${val}). \u0421\u0447\u0435\u0442: ${lobby.playerBScore}`);
        lobby.playerBHands[i] = null;
        playedCard = true;
        break;
      }
    }
    score = lobby.playerBScore;
    if (score === 20 || score >= 18 && score >= lobby.playerAScore && lobby.playerAStand || score >= 18 && !lobby.playerAStand) {
      lobby.playerBStand = true;
      lobby.log.push(`\u{1F916} \u0425\u0430\u0440\u043E\u043D \u043E\u0431\u044A\u044F\u0432\u0438\u043B STAND (\u0444\u0438\u043A\u0441\u0430\u0446\u0438\u044F) \u043D\u0430 ${score}`);
    } else if (score > 20) {
      lobby.log.push(`\u{1F916} \u0425\u0430\u0440\u043E\u043D \u0441\u043C\u0438\u0440\u0438\u043B\u0441\u044F \u0441 \u043F\u0435\u0440\u0435\u0431\u043E\u0440\u043E\u043C \u0432 ${score} \u043E\u0447\u043A\u043E\u0432.`);
    } else {
      lobby.log.push(`\u{1F916} \u0425\u0430\u0440\u043E\u043D \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B \u0445\u043E\u0434 \u043D\u0430 \u0441\u0447\u0435\u0442\u0435 ${score}`);
    }
    checkPazaakRoundEnd(lobby);
    if (lobby.status === "playing") {
      if (!lobby.playerAStand) {
        lobby.turn = lobby.creatorId;
        rollPazaakStep(lobby);
      } else if (!lobby.playerBStand) {
        rollPazaakStep(lobby);
      }
    }
    broadcastTavernGames();
  }, 900);
}
function checkPazaakRoundEnd(lobby) {
  const pAOver = lobby.playerAScore > 20;
  const pBOver = lobby.playerBScore > 20;
  const bothStood = lobby.playerAStand && lobby.playerBStand;
  const nineCardsA = lobby.playerABoard.filter((c) => c > 0).length >= 9;
  const nineCardsB = lobby.playerBBoard.filter((c) => c > 0).length >= 9;
  let roundWinner = null;
  if (pAOver && pBOver) {
    roundWinner = "TIE";
  } else if (pAOver) {
    roundWinner = "B";
  } else if (pBOver) {
    roundWinner = "A";
  } else if (nineCardsA) {
    roundWinner = "A";
  } else if (nineCardsB) {
    roundWinner = "B";
  } else if (bothStood) {
    if (lobby.playerAScore > lobby.playerBScore) {
      roundWinner = "A";
    } else if (lobby.playerAScore < lobby.playerBScore) {
      roundWinner = "B";
    } else {
      const playsATie = lobby.playerABoard.includes("T");
      const playsBTie = lobby.playerBBoard.includes("T");
      if (playsATie && !playsBTie) roundWinner = "A";
      else if (playsBTie && !playsATie) roundWinner = "B";
      else roundWinner = "TIE";
    }
  }
  if (roundWinner) {
    if (roundWinner === "A") {
      lobby.roundsWonA++;
      lobby.log.push(`\u{1F3C1} \u0420\u0430\u0443\u043D\u0434 \u0432\u044B\u0438\u0433\u0440\u0430\u043B ${lobby.creatorName} (${lobby.playerAScore} \u043F\u0440\u043E\u0442\u0438\u0432 ${lobby.playerBScore})!`);
    } else if (roundWinner === "B") {
      lobby.roundsWonB++;
      lobby.log.push(`\u{1F3C1} \u0420\u0430\u0443\u043D\u0434 \u0432\u044B\u0438\u0433\u0440\u0430\u043B ${lobby.opponentName} (${lobby.playerAScore} \u043F\u0440\u043E\u0442\u0438\u0432 ${lobby.playerBScore})!`);
    } else {
      lobby.log.push(`\u{1F3C1} \u0420\u0430\u0443\u043D\u0434 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u041C\u0418\u0420\u041D\u041E\u0419 \u041D\u0418\u0427\u042C\u0415\u0419 \u043D\u0430 \u0441\u0447\u0435\u0442\u0435 ${lobby.playerAScore}!`);
    }
    lobby.playerABoard = [];
    lobby.playerBBoard = [];
    lobby.playerAScore = 0;
    lobby.playerBScore = 0;
    lobby.playerAStand = false;
    lobby.playerBStand = false;
    if (lobby.roundsWonA >= 3) {
      lobby.status = "finished";
      lobby.winner = lobby.creatorId;
      lobby.statusMessage = `\u041F\u043E\u0431\u0435\u0434\u043D\u044B\u0439 \u0444\u0438\u043D\u0430\u043B! ${lobby.creatorName} \u0440\u0430\u0437\u0433\u0440\u043E\u043C\u0438\u043B \u043E\u043F\u043F\u043E\u043D\u0435\u043D\u0442\u0430 ${lobby.roundsWonA}:${lobby.roundsWonB}!`;
      lobby.log.push(`\u{1F3C6} ${lobby.creatorName} \u0437\u0430\u0431\u0438\u0440\u0430\u0435\u0442 \u0432\u0441\u0435! \u0412\u044B\u0438\u0433\u0440\u044B\u0448: +${lobby.bet} RU`);
      if (playerDb[lobby.creatorId]) {
        playerDb[lobby.creatorId].balance += lobby.bet;
      }
      if (lobby.opponentId !== "BOT_BAR" && playerDb[lobby.opponentId]) {
        playerDb[lobby.opponentId].balance -= lobby.bet;
      } else if (lobby.opponentId === "BOT_BAR") {
        playerDb[lobby.creatorId].balance += lobby.bet;
      }
      savePlayerDb();
    } else if (lobby.roundsWonB >= 3) {
      lobby.status = "finished";
      lobby.winner = lobby.opponentId;
      lobby.statusMessage = `\u041F\u043E\u0431\u0435\u0434\u043D\u044B\u0439 \u0444\u0438\u043D\u0430\u043B! ${lobby.opponentName} \u0440\u0430\u0437\u0433\u0440\u043E\u043C\u0438\u043B \u043E\u043F\u043F\u043E\u043D\u0435\u043D\u0442\u0430 ${lobby.roundsWonB}:${lobby.roundsWonA}!`;
      lobby.log.push(`\u{1F3C6} ${lobby.opponentName} \u043E\u0434\u0435\u0440\u0436\u0430\u043B \u043E\u043A\u043E\u043D\u0447\u0430\u0442\u0435\u043B\u044C\u043D\u0443\u044E \u043F\u043E\u0431\u0435\u0434\u0443!`);
      if (lobby.opponentId !== "BOT_BAR" && playerDb[lobby.opponentId]) {
        playerDb[lobby.opponentId].balance += lobby.bet * 2;
      } else if (lobby.opponentId === "BOT_BAR") {
        lobby.log.push(`\u{1F4B8} \u0421\u0442\u0430\u043B\u043A\u0435\u0440 ${lobby.creatorName} \u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 \u0441\u0442\u0430\u0432\u043A\u0443 ${lobby.bet} RU \u0443 \u0431\u0430\u0440\u043C\u0435\u043D\u0430.`);
      }
      savePlayerDb();
    } else {
      lobby.statusMessage = `\u0420\u0430\u0443\u043D\u0434 \u043F\u043E\u0437\u0430\u0434\u0438! \u0421\u0447\u0435\u0442 \u0432\u043E \u0432\u0441\u0442\u0440\u0435\u0447\u0430\u0445 ${lobby.roundsWonA}:${lobby.roundsWonB}. \u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0440\u0430\u0443\u043D\u0434 \u0443\u0436\u0435 \u0432 \u0440\u0430\u0437\u0434\u0430\u0447\u0435!`;
      lobby.turn = lobby.creatorId;
      rollPazaakStep(lobby);
    }
  }
}
function evaluateDiceHand(dice) {
  const counts = {};
  dice.forEach((d) => counts[d] = (counts[d] || 0) + 1);
  const values = Object.values(counts).sort((a, b) => b - a);
  const keys = Object.keys(counts).map(Number).sort((a, b) => b - a);
  const totalSum = dice.reduce((a, b) => a + b, 0);
  const uniqueCount = Object.keys(counts).length;
  const isStraight = uniqueCount === 5 && Math.max(...dice) - Math.min(...dice) === 4;
  if (values[0] === 5) return { rank: 8, name: "\u041F\u042F\u0422\u0415\u0420\u041A\u0410 (\u041F\u041E\u041A\u0415\u0420 \u0417\u041E\u041D\u042B) \u{1F30C}", score: 5e3 + keys[0] };
  if (values[0] === 4) return { rank: 7, name: "\u041A\u0410\u0420\u0415 (\u0427\u0435\u0442\u044B\u0440\u0435 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0445) \u26A1", score: 4e3 + keys[0] * 10 };
  if (values[0] === 3 && values[1] === 2) {
    const tripVal = Number(Object.keys(counts).find((k) => counts[Number(k)] === 3));
    return { rank: 6, name: "\u0424\u0423\u041B\u041B-\u0425\u0410\u0423\u0421 (\u0422\u0440\u0438 + \u041F\u0430\u0440\u0430) \u{1F3E0}", score: 3e3 + tripVal * 10 };
  }
  if (isStraight) return { rank: 5, name: "\u0421\u0422\u0420\u0418\u0422 (\u041F\u043E\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C) \u{1F4CF}", score: 2e3 + Math.max(...dice) };
  if (values[0] === 3) return { rank: 4, name: "\u0422\u0420\u041E\u0419\u041A\u0410 (\u0422\u0440\u0438 \u043A\u043E\u0441\u0442\u0438) \u{1F552}", score: 1e3 + keys[0] };
  if (values[0] === 2 && values[1] === 2) {
    const pairs = Object.keys(counts).filter((k) => counts[Number(k)] === 2).map(Number).sort((a, b) => b - a);
    return { rank: 3, name: "\u0414\u0412\u0415 \u041F\u0410\u0420\u042B \u{1F465}", score: 500 + pairs[0] * 10 + pairs[1] };
  }
  if (values[0] === 2) {
    const pairVal = Number(Object.keys(counts).find((k) => counts[Number(k)] === 2));
    return { rank: 2, name: "\u041F\u0410\u0420\u0410 (\u0414\u0432\u0435 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0445) \u{1F91D}", score: 200 + pairVal * 10 };
  }
  return { rank: 1, name: "\u0421\u0422\u0410\u0420\u0428\u0410\u042F \u041A\u041E\u0421\u0422\u042C \u{1F3B2}", score: totalSum };
}
wss.on("connection", (ws) => {
  console.log("\u041D\u043E\u0432\u043E\u0435 \u0441\u043E\u043A\u0435\u0442-\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435.");
  ws.on("message", (messageStr) => {
    try {
      const { type, payload } = JSON.parse(messageStr.toString());
      switch (type) {
        case "JOIN": {
          const { id, username, role } = payload;
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
          initPlayerProfile(id, username);
          clients.set(ws, { id, username, role });
          console.log(`\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C ${username} \u0432\u043E\u0448\u0435\u043B \u043A\u0430\u043A ${role}`);
          ws.send(JSON.stringify({
            type: "INIT_STATE",
            payload: {
              gameState,
              map,
              messages,
              stashLoot,
              artifactLoot,
              hasActiveGM: getActiveGMId() !== null,
              activeVotes,
              activePlayersCount: getActivePlayersCount(),
              playerDb,
              pazaakLobbies,
              activeRace
            }
          }));
          broadcastPlayersList();
          broadcastTavernGames();
          ws.send(JSON.stringify({ type: "VOTES_UPDATE", payload: { activeVotes, activePlayersCount: getActivePlayersCount() } }));
          break;
        }
        case "SYNC_APP_STATE": {
          const clientData = clients.get(ws);
          if (!clientData) return;
          if (payload.gameState !== void 0) gameState = payload.gameState;
          if (payload.map !== void 0) {
            map = payload.map;
            if (map && !map.playerPos) {
              map.playerPos = { x: map.entrance.x, y: map.entrance.y };
            }
          }
          if (payload.messages !== void 0) messages = payload.messages;
          if (payload.stashLoot !== void 0) stashLoot = payload.stashLoot;
          if (payload.artifactLoot !== void 0) artifactLoot = payload.artifactLoot;
          if (payload.gameState === "playing" || payload.gameState === "setup") {
            activeVotes = {};
            broadcast("VOTES_UPDATE", { activeVotes, activePlayersCount: getActivePlayersCount() });
          }
          broadcast("SYNC_APP_STATE", payload, ws);
          break;
        }
        case "FORCE_CLAIM_GM": {
          const { id, username } = payload;
          for (const [socket, player] of clients.entries()) {
            if (player.role === "gm" && player.id !== id) {
              player.role = "player";
              socket.send(JSON.stringify({
                type: "ROLE_KICKED",
                payload: { newRole: "player", message: "\u0412\u0430\u0448\u0438 \u043F\u043E\u043B\u043D\u043E\u043C\u043E\u0447\u0438\u044F GM \u0431\u044B\u043B\u0438 \u043F\u0435\u0440\u0435\u0445\u0432\u0430\u0447\u0435\u043D\u044B \u0434\u0440\u0443\u0433\u0438\u043C \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u043C." }
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
              hasActiveGM: getActiveGMId() !== null,
              activeVotes,
              activePlayersCount: getActivePlayersCount()
            }
          }));
          break;
        }
        case "SUBMIT_VOTE": {
          const player = clients.get(ws);
          if (!player) return;
          const { action } = payload;
          activeVotes[player.id] = { username: player.username, action };
          const activePlayersCount = getActivePlayersCount();
          const votesCastKeys = Object.keys(activeVotes);
          const totalVotesCast = votesCastKeys.length;
          const counts = {};
          Object.values(activeVotes).forEach((v) => {
            counts[v.action] = (counts[v.action] || 0) + 1;
          });
          let winningAction = null;
          for (const [act, cnt] of Object.entries(counts)) {
            if (cnt > activePlayersCount / 2) {
              winningAction = act;
              break;
            }
          }
          const allPlayersVoted = totalVotesCast >= activePlayersCount && activePlayersCount > 0;
          if (!winningAction && allPlayersVoted) {
            let maxVotes = -1;
            for (const [act, cnt] of Object.entries(counts)) {
              if (cnt > maxVotes) {
                maxVotes = cnt;
                winningAction = act;
              }
            }
          }
          if (winningAction) {
            executeGameAction(winningAction);
            activeVotes = {};
            broadcast("VOTES_UPDATE", { activeVotes, activePlayersCount });
            broadcast("SYNC_APP_STATE", { map, gameState, messages });
          } else {
            broadcast("VOTES_UPDATE", { activeVotes, activePlayersCount });
          }
          break;
        }
        case "RESET_VOTES": {
          activeVotes = {};
          broadcast("VOTES_UPDATE", { activeVotes, activePlayersCount: getActivePlayersCount() });
          break;
        }
        case "EXECUTE_IMMEDIATE_ACTION": {
          const player = clients.get(ws);
          if (!player || player.role !== "gm") return;
          const { action } = payload;
          executeGameAction(action);
          broadcast("SYNC_APP_STATE", { map, gameState, messages });
          break;
        }
        // ==========================================
        //         ТАВЕРНА И МИНИ-ИГРЫ КПК
        // ==========================================
        case "TAVERN_PREPARE": {
          ws.send(JSON.stringify({
            type: "SYNC_TAVERN_GAMES",
            payload: { pazaakLobbies, playerDb, activeRace, shopItems, tavernSettings }
          }));
          break;
        }
        case "PAZAAK_BUY_BOOSTER": {
          if (!tavernSettings.enabledGames.pazaak) {
            const player = clients.get(ws);
            if (!player || player.role !== "gm") {
              ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u0422\u043E\u0440\u0433\u043E\u0432\u043B\u044F \u043A\u0430\u0440\u0442\u0430\u043C\u0438 \u041F\u0430\u0430\u0437\u0430\u043A \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u0430 \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u043E\u043C!", type: "danger" } }));
              return;
            }
          }
          const { playerId, username } = payload;
          const profile = playerDb[playerId];
          if (!profile) return;
          if (profile.balance < 300) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0435 \u041A\u041F\u041A! \u0411\u0443\u0441\u0442\u0435\u0440 \u0441\u0442\u043E\u0438\u0442 300 RU.", type: "danger" } }));
            return;
          }
          profile.balance -= 300;
          const premiumPool = ["+/-1", "+/-2", "+/-3", "+/-4", "+/-5", "+/-6", "D", "T", "+/-1 or 2", "2&4", "3&6"];
          const pulled = [];
          for (let i = 0; i < 3; i++) {
            pulled.push(premiumPool[Math.floor(Math.random() * premiumPool.length)]);
          }
          profile.unlockedCards = [...profile.unlockedCards, ...pulled];
          savePlayerDb();
          ws.send(JSON.stringify({
            type: "BOOSTER_PULLED_SUCCESS",
            payload: { pulled, profile }
          }));
          appendSystemMessage(`\u{1F0CF} ${username} \u043F\u0440\u0438\u043E\u0431\u0440\u0435\u043B \u0431\u0443\u0441\u0442\u0435\u0440 \u041F\u0430\u0430\u0437\u0430\u043A\u0430 \u0437\u0430 300 RU \u0438 \u0432\u044B\u0442\u0430\u0449\u0438\u043B: [${pulled.join(", ")}]!`, "loot");
          broadcastTavernGames();
          break;
        }
        case "PAZAAK_SAVE_DECK": {
          const { playerId, deck } = payload;
          const profile = playerDb[playerId];
          if (!profile) return;
          if (deck.length === 8) {
            profile.pazaakDeck = deck;
            savePlayerDb();
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u2705 \u041A\u043E\u043B\u043E\u0434\u0430 \u041F\u0430\u0430\u0437\u0430\u043A\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430!", type: "success" } }));
            broadcastTavernGames();
          } else {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041E\u0448\u0438\u0431\u043A\u0430: \u043A\u043E\u043B\u043E\u0434\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u0440\u043E\u0432\u043D\u043E 8 \u043A\u0430\u0440\u0442!", type: "danger" } }));
          }
          break;
        }
        case "PAZAAK_CREATE_LOBBY": {
          if (!tavernSettings.enabledGames.pazaak) {
            const player = clients.get(ws);
            if (!player || player.role !== "gm") {
              ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u0414\u0443\u044D\u043B\u044C\u043D\u044B\u0439 \u0441\u0442\u043E\u043B \u041F\u0430\u0430\u0437\u0430\u043A\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u0437\u0430\u043A\u0440\u044B\u0442 \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u043E\u043C!", type: "danger" } }));
              return;
            }
          }
          const { creatorId, creatorName, opponentId, bet } = payload;
          const profile = playerDb[creatorId];
          if (!profile) return;
          const creatorDeck = [...profile.pazaakDeck || []];
          if (creatorDeck.length < 8) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041E\u0448\u0438\u0431\u043A\u0430: \u0423 \u0432\u0430\u0441 \u0432\u044B\u0431\u0440\u0430\u043D\u043E \u043C\u0435\u043D\u044C\u0448\u0435 8 \u043A\u0430\u0440\u0442! \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u043A\u043E\u043B\u043E\u0434\u0443.", type: "danger" } }));
            return;
          }
          if (profile.balance < bet) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u043D\u0430 \u041A\u041F\u041A \u0434\u043B\u044F \u0441\u043E\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F \u0441\u0442\u0430\u0432\u043A\u0438!", type: "danger" } }));
            return;
          }
          const lobbyId = "pz_" + Math.random().toString(36).substring(2, 9);
          profile.balance -= bet;
          savePlayerDb();
          const getRandomSubarray = (arr, size) => {
            const shuffled = [...arr].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, size);
          };
          const playerAHands = getRandomSubarray(creatorDeck, 4);
          const botDeckPool = ["+1", "-1", "+2", "-2", "+3", "-3", "+/-1", "+/-2", "D", "T"];
          const botDeck8 = getRandomSubarray(botDeckPool, 8);
          const playerBHands = opponentId === "BOT_BAR" ? getRandomSubarray(botDeck8, 4) : [];
          const newLobby = {
            id: lobbyId,
            creatorId,
            creatorName,
            creatorDeck,
            opponentId,
            opponentName: opponentId === "BOT_BAR" ? "\u0425\u0430\u0440\u043E\u043D (\u0411\u0430\u0440\u043C\u0435\u043D)" : null,
            opponentDeck: opponentId === "BOT_BAR" ? botDeck8 : [],
            bet,
            status: opponentId === "BOT_BAR" ? "playing" : "waiting",
            turn: creatorId,
            playerAScore: 0,
            playerBScore: 0,
            playerAHands,
            playerBHands,
            playerAStand: false,
            playerBStand: false,
            playerABoard: [],
            playerBBoard: [],
            roundsWonA: 0,
            roundsWonB: 0,
            log: [`\u041D\u0430\u0447\u0430\u0442\u0430 \u0432\u0441\u0442\u0440\u0435\u0447\u0430 \u041F\u0430\u0430\u0437\u0430\u043A \u043C\u0435\u0436\u0434\u0443 ${creatorName} \u0441\u043E \u0441\u0442\u0430\u0432\u043A\u043E\u0439 ${bet} RU.`],
            statusMessage: opponentId === "BOT_BAR" ? "\u0418\u0433\u0440\u0430 \u043D\u0430\u0447\u0430\u043B\u0430\u0441\u044C!" : "\u041E\u0436\u0438\u0434\u0430\u0435\u043C \u043E\u043F\u043F\u043E\u043D\u0435\u043D\u0442\u0430...",
            winner: null
          };
          pazaakLobbies[lobbyId] = newLobby;
          if (opponentId === "BOT_BAR") {
            rollPazaakStep(newLobby);
          }
          appendSystemMessage(`\u{1F3B2} \u0421\u0442\u0430\u043B\u043A\u0435\u0440 ${creatorName} \u043E\u0442\u043A\u0440\u044B\u043B \u0441\u0442\u043E\u043B \u041F\u0430\u0430\u0437\u0430\u043A \u0441\u043E \u0441\u0442\u0430\u0432\u043A\u043E\u0439 ${bet} RU.`, "info");
          broadcastTavernGames();
          break;
        }
        case "PAZAAK_JOIN_LOBBY": {
          if (!tavernSettings.enabledGames.pazaak) {
            const player = clients.get(ws);
            if (!player || player.role !== "gm") {
              ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u0414\u0443\u044D\u043B\u044C\u043D\u044B\u0439 \u0441\u0442\u043E\u043B \u041F\u0430\u0430\u0437\u0430\u043A\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u0437\u0430\u043A\u0440\u044B\u0442 \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u043E\u043C!", type: "danger" } }));
              return;
            }
          }
          const { lobbyId, opponentId, opponentName } = payload;
          const lobby = pazaakLobbies[lobbyId];
          if (!lobby || lobby.status !== "waiting") return;
          const profile = playerDb[opponentId];
          if (!profile) return;
          const oppDeck = [...profile.pazaakDeck || []];
          if (oppDeck.length < 8) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041E\u0448\u0438\u0431\u043A\u0430: \u0423 \u0432\u0430\u0441 \u0432\u044B\u0431\u0440\u0430\u043D\u043E \u043C\u0435\u043D\u044C\u0448\u0435 8 \u043A\u0430\u0440\u0442! \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u043A\u043E\u043B\u043E\u0434\u0443.", type: "danger" } }));
            return;
          }
          if (profile.balance < lobby.bet) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0435 \u041A\u041F\u041A!", type: "danger" } }));
            return;
          }
          profile.balance -= lobby.bet;
          savePlayerDb();
          const getRandomSubarray = (arr, size) => {
            const shuffled = [...arr].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, size);
          };
          lobby.opponentId = opponentId;
          lobby.opponentName = opponentName;
          lobby.opponentDeck = oppDeck;
          lobby.playerBHands = getRandomSubarray(oppDeck, 4);
          lobby.status = "playing";
          lobby.statusMessage = "\u041E\u043F\u043F\u043E\u043D\u0435\u043D\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u043B\u0441\u044F! \u0421\u0434\u0430\u0447\u0430 \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0440\u0430\u0443\u043D\u0434\u0430...";
          lobby.log.push(`${opponentName} \u0437\u0430\u0448\u0435\u043B \u0432\u043E \u0432\u0441\u0442\u0440\u0435\u0447\u0443. \u0421\u0442\u0430\u0432\u043A\u0438 \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u044B.`);
          appendSystemMessage(`\u2694\uFE0F \u0421\u0442\u0430\u043B\u043A\u0435\u0440 ${opponentName} \u043F\u0440\u0438\u043D\u044F\u043B \u0434\u0443\u044D\u043B\u044C \u0432 \u041F\u0430\u0430\u0437\u0430\u043A \u043E\u0442 ${lobby.creatorName} \u043D\u0430 ${lobby.bet} RU!`, "warning");
          rollPazaakStep(lobby);
          broadcastTavernGames();
          break;
        }
        case "PAZAAK_PLAY_CARD": {
          const { lobbyId, playerId, cardIndex } = payload;
          const lobby = pazaakLobbies[lobbyId];
          if (!lobby || lobby.status !== "playing") return;
          if (lobby.turn !== playerId) return;
          const isA = playerId === lobby.creatorId;
          const hand = isA ? lobby.playerAHands : lobby.playerBHands;
          const card = hand[cardIndex];
          if (!card) return;
          let val = 0;
          if (card.startsWith("+/-")) {
            val = parseInt(card.replace("+/-", ""), 10) * (payload.useNegative ? -1 : 1);
          } else if (card.startsWith("+")) {
            val = parseInt(card.replace("+", ""), 10);
          } else if (card.startsWith("-")) {
            val = -parseInt(card.replace("-", ""), 10);
          } else if (card === "D") {
            const board = isA ? lobby.playerABoard : lobby.playerBBoard;
            const last = board[board.length - 1] || 0;
            val = last;
          } else if (card === "T") {
            val = 0;
          }
          if (isA) {
            lobby.playerABoard.push(val);
            if (card === "T") lobby.playerABoard.push("T");
            lobby.playerAScore = lobby.playerABoard.filter((c) => typeof c === "number").reduce((sum, b) => sum + b, 0);
            lobby.playerAHands[cardIndex] = null;
            lobby.log.push(`${lobby.creatorName} \u0441\u044B\u0433\u0440\u0430\u043B \u043A\u0430\u0440\u0442\u0443 [${card}] (\u044D\u0444\u0444\u0435\u043A\u0442: ${val > 0 ? "+" : ""}${val}). \u0421\u0447\u0435\u0442: ${lobby.playerAScore}`);
          } else {
            lobby.playerBBoard.push(val);
            if (card === "T") lobby.playerBBoard.push("T");
            lobby.playerBScore = lobby.playerBBoard.filter((c) => typeof c === "number").reduce((sum, b) => sum + b, 0);
            lobby.playerBHands[cardIndex] = null;
            lobby.log.push(`${lobby.opponentName} \u0441\u044B\u0433\u0440\u0430\u043B \u043A\u0430\u0440\u0442\u0443 [${card}] (\u044D\u0444\u0444\u0435\u043A\u0442: ${val > 0 ? "+" : ""}${val}). \u0421\u0447\u0435\u0442: ${lobby.playerBScore}`);
          }
          broadcastTavernGames();
          break;
        }
        case "PAZAAK_END_TURN": {
          const { lobbyId, playerId } = payload;
          const lobby = pazaakLobbies[lobbyId];
          if (!lobby || lobby.status !== "playing") return;
          if (lobby.turn !== playerId) return;
          const isA = playerId === lobby.creatorId;
          const nextPlayerId = isA ? lobby.opponentId : lobby.creatorId;
          lobby.turn = nextPlayerId;
          lobby.log.push(`${isA ? lobby.creatorName : lobby.opponentName} \u0437\u0430\u0432\u0435\u0440\u0448\u0430\u0435\u0442 \u0445\u043E\u0434.`);
          checkPazaakRoundEnd(lobby);
          if (lobby.status === "playing") {
            rollPazaakStep(lobby);
          }
          broadcastTavernGames();
          break;
        }
        case "PAZAAK_STAND": {
          const { lobbyId, playerId } = payload;
          const lobby = pazaakLobbies[lobbyId];
          if (!lobby || lobby.status !== "playing") return;
          if (lobby.turn !== playerId) return;
          const isA = playerId === lobby.creatorId;
          if (isA) {
            lobby.playerAStand = true;
            lobby.log.push(`${lobby.creatorName} \u0437\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043B \u0441\u0447\u0435\u0442 \u043D\u0430 STAND (${lobby.playerAScore})`);
          } else {
            lobby.playerBStand = true;
            lobby.log.push(`${lobby.opponentName} \u0437\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043B \u0441\u0447\u0435\u0442 \u043D\u0430 STAND (${lobby.playerBScore})`);
          }
          checkPazaakRoundEnd(lobby);
          if (lobby.status === "playing") {
            lobby.turn = isA ? lobby.opponentId : lobby.creatorId;
            rollPazaakStep(lobby);
          }
          broadcastTavernGames();
          break;
        }
        case "PAZAAK_CONCEDE": {
          const { lobbyId, playerId } = payload;
          const lobby = pazaakLobbies[lobbyId];
          if (!lobby || lobby.status !== "playing") return;
          const isA = playerId === lobby.creatorId;
          lobby.status = "finished";
          lobby.winner = isA ? lobby.opponentId : lobby.creatorId;
          lobby.statusMessage = `${isA ? lobby.creatorName : lobby.opponentName} \u043F\u0440\u0438\u0437\u043D\u0430\u043B \u043F\u043E\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0441\u0434\u0430\u0447\u0435\u0439.`;
          lobby.log.push(`\u26A0\uFE0F ${isA ? lobby.creatorName : lobby.opponentName} \u043A\u0430\u043F\u0438\u0442\u0443\u043B\u0438\u0440\u043E\u0432\u0430\u043B.`);
          if (lobby.winner !== "BOT_BAR") {
            if (playerDb[lobby.winner]) {
              playerDb[lobby.winner].balance += lobby.bet * 2;
            }
          }
          savePlayerDb();
          broadcastTavernGames();
          break;
        }
        case "DICE_PLAY_BOT": {
          if (!tavernSettings.enabledGames.dice) {
            const player = clients.get(ws);
            if (!player || player.role !== "gm") {
              ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u0418\u0433\u0440\u0430 \u0432 \u043A\u043E\u0441\u0442\u0438 \u043D\u0430 \u041A\u041F\u041A \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u0437\u0430\u043A\u0440\u044B\u0442\u0430 \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u043E\u043C!", type: "danger" } }));
              return;
            }
          }
          const { playerId, username, bet } = payload;
          const profile = playerDb[playerId];
          if (!profile) return;
          if (profile.balance < bet) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0435 \u041A\u041F\u041A!", type: "danger" } }));
            return;
          }
          profile.balance -= bet;
          savePlayerDb();
          const botDice = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
          const playerDice = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
          const botHand = evaluateDiceHand(botDice);
          const playerHand = evaluateDiceHand(playerDice);
          ws.send(JSON.stringify({
            type: "DICE_STATE_SYNC",
            payload: {
              active: true,
              bet,
              botDice,
              playerDice,
              botHand,
              playerHand,
              rerollStep: 1,
              lockedIndexes: [false, false, false, false, false]
            }
          }));
          appendSystemMessage(`\u{1F3B2} \u0421\u0442\u0430\u043B\u043A\u0435\u0440 ${username} \u0431\u0440\u043E\u0441\u0430\u0435\u0442 \u043A\u043E\u0441\u0442\u0438 \u043F\u0440\u043E\u0442\u0438\u0432 \u0431\u0430\u0440\u043C\u0435\u043D\u0430 \u043D\u0430 ${bet} RU.`, "info");
          break;
        }
        case "DICE_REROLL": {
          const { playerId, username, bet, playerDice, lockedIndexes, botDice, rerollStep } = payload;
          const profile = playerDb[playerId];
          if (!profile) return;
          const finalPlayerDice = playerDice.map((val, i) => {
            return lockedIndexes[i] ? val : Math.floor(Math.random() * 6) + 1;
          });
          const botCounts = {};
          botDice.forEach((d) => botCounts[d] = (botCounts[d] || 0) + 1);
          const botMaxCount = Math.max(...Object.values(botCounts));
          const targetToLock = Number(Object.keys(botCounts).find((k) => botCounts[Number(k)] === botMaxCount));
          const finalBotDice = botDice.map((val) => {
            if (botMaxCount > 1 && val === targetToLock) return val;
            if (botMaxCount === 1 && val === Math.max(...botDice)) return val;
            return Math.floor(Math.random() * 6) + 1;
          });
          const currentStep = rerollStep || 1;
          if (currentStep === 1) {
            ws.send(JSON.stringify({
              type: "DICE_STATE_SYNC",
              payload: {
                active: true,
                bet,
                botDice: finalBotDice,
                playerDice: finalPlayerDice,
                botHand: evaluateDiceHand(finalBotDice),
                playerHand: evaluateDiceHand(finalPlayerDice),
                rerollStep: 2,
                lockedIndexes: [false, false, false, false, false]
              }
            }));
            appendSystemMessage(`\u{1F3B2} \u0421\u0442\u0430\u043B\u043A\u0435\u0440 ${username} \u0441\u043E\u0432\u0435\u0440\u0448\u0438\u043B \u043F\u0435\u0440\u0432\u044B\u0439 \u043F\u0435\u0440\u0435\u0431\u0440\u043E\u0441 \u043A\u043E\u0441\u0442\u0435\u0439. \u041E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \u0444\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u0445\u043E\u0434.`, "info");
          } else {
            const finalBotHand = evaluateDiceHand(finalBotDice);
            const finalPlayerHand = evaluateDiceHand(finalPlayerDice);
            let result = "lose";
            let prize = 0;
            let message = "";
            if (finalPlayerHand.rank > finalBotHand.rank) {
              result = "win";
            } else if (finalPlayerHand.rank < finalBotHand.rank) {
              result = "lose";
            } else {
              if (finalPlayerHand.score > finalBotHand.score) {
                result = "win";
              } else if (finalPlayerHand.score < finalBotHand.score) {
                result = "lose";
              } else {
                result = "tie";
              }
            }
            if (result === "win") {
              prize = bet * 2;
              profile.balance += prize;
              message = `\u{1F389} \u0412\u042B \u0412\u042B\u0418\u0413\u0420\u0410\u041B\u0418! \u0412\u0430\u0448\u0438 [${finalPlayerHand.name}] \u0443\u0434\u0435\u043B\u0430\u043B\u0438 \u043A\u043E\u0441\u0442\u0438 \u0431\u0430\u0440\u043C\u0435\u043D\u0430 [${finalBotHand.name}]! +${bet} RU!`;
              appendSystemMessage(`\u{1F389} \u0421\u0442\u0430\u043B\u043A\u0435\u0440 ${username} \u0432\u044B\u0438\u0433\u0440\u0430\u043B +${bet} RU \u0443 \u0431\u0430\u0440\u043C\u0435\u043D\u0430 \u0432 \u041A\u043E\u0441\u0442\u0438 \u0441\u043E \u0441\u0447\u0435\u0442\u043E\u043C [${finalPlayerHand.name}]!`, "success");
            } else if (result === "lose") {
              prize = 0;
              message = `\u{1F4B8} \u0423\u0432\u044B! \u0411\u0430\u0440\u043C\u0435\u043D \u043E\u0431\u044B\u0433\u0440\u0430\u043B \u0432\u0430\u0441 \u0441\u0432\u043E\u0435\u0439 \u0440\u0443\u043A\u043E\u0439 [${finalBotHand.name}] \u043F\u0440\u043E\u0442\u0438\u0432 \u0432\u0430\u0448\u0438\u0445 [${finalPlayerHand.name}].`;
              appendSystemMessage(`\u{1F4B8} \u0421\u0442\u0430\u043B\u043A\u0435\u0440 ${username} \u043F\u0440\u043E\u0438\u0433\u0440\u0430\u043B \u0441\u0442\u0430\u0432\u043A\u0443 \u0432 \u043A\u043E\u0441\u0442\u0438 \u0431\u0430\u0440\u043C\u0435\u043D\u0443 (\u043F\u0440\u043E\u0438\u0433\u0440\u0430\u043B \u0441 ${finalPlayerHand.name} \u043F\u0440\u043E\u0442\u0438\u0432 ${finalBotHand.name}).`, "info");
            } else {
              prize = bet;
              profile.balance += prize;
              message = `\u{1F91D} \u041D\u0438\u0447\u044C\u044F! \u041A\u043E\u0441\u0442\u0438 \u0441\u043E\u0448\u043B\u0438\u0441\u044C \u0432 \u043A\u043E\u043C\u0431\u0438\u043D\u0430\u0446\u0438\u0438 [${finalPlayerHand.name}]. \u0421\u0442\u0430\u0432\u043A\u0430 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u0430.`;
            }
            savePlayerDb();
            ws.send(JSON.stringify({
              type: "DICE_STATE_SYNC",
              payload: {
                active: true,
                bet,
                botDice: finalBotDice,
                playerDice: finalPlayerDice,
                botHand: finalBotHand,
                playerHand: finalPlayerHand,
                rerollStep: 3,
                result,
                message,
                lockedIndexes
              }
            }));
            broadcastTavernGames();
          }
          break;
        }
        case "RACE_PLACE_BET": {
          if (!tavernSettings.enabledGames.races) {
            const player = clients.get(ws);
            if (!player || player.role !== "gm") {
              ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u0422\u043E\u0442\u0430\u043B\u0438\u0437\u0430\u0442\u043E\u0440 \u0441\u043A\u0430\u0447\u0435\u043A \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u043E\u043C \u0431\u0430\u0440\u0430!", type: "danger" } }));
              return;
            }
          }
          const { playerId, username, contestantName, betAmount } = payload;
          const profile = playerDb[playerId];
          if (!profile) return;
          if (activeRace.status !== "betting" && activeRace.status !== "none") {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u0421\u0442\u0430\u0432\u043A\u0438 \u043D\u0430 \u044D\u0442\u043E\u0442 \u0437\u0430\u0435\u0437\u0434 \u0443\u0436\u0435 \u0437\u0430\u043A\u0440\u044B\u0442\u044B!", type: "danger" } }));
            return;
          }
          if (profile.balance < betAmount) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u043D\u0430 \u041A\u041F\u041A!", type: "danger" } }));
            return;
          }
          activeRace.status = "betting";
          profile.balance -= betAmount;
          savePlayerDb();
          activeRace.bets.push({ playerId, username, contestantName, betAmount });
          activeRace.log.push(`\u{1F4DD} \u0421\u0442\u0430\u0432\u043A\u0430: ${username} \u0437\u0430\u0440\u044F\u0434\u0438\u043B ${betAmount} RU \u043D\u0430 "${contestantName}"`);
          broadcastTavernGames();
          break;
        }
        case "RACE_SET_CONTESTANTS": {
          const player = clients.get(ws);
          if (!player || player.role !== "gm") return;
          const { names } = payload;
          if (Array.isArray(names) && names.length >= 2) {
            activeRace.contestants = names.map((name, i) => {
              const types = ["favorite", "balanced", "balanced", "underdog"];
              const muls = [1.8, 3.4, 4.8, 9.5];
              return {
                name,
                position: 0,
                odds: muls[i % muls.length],
                color: ["text-amber-500", "text-emerald-500", "text-yellow-500", "text-cyan-500"][i % 4],
                type: types[i % types.length]
              };
            });
            activeRace.log.push(`\u{1F6E0}\uFE0F \u041A\u0443\u0440\u0430\u0442\u043E\u0440 \u043E\u0431\u043D\u043E\u0432\u0438\u043B \u0441\u043F\u0438\u0441\u043E\u043A \u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432 \u0437\u0430\u0431\u0435\u0433\u043E\u0432!`);
            broadcastTavernGames();
          }
          break;
        }
        case "RACE_START_GM": {
          const player = clients.get(ws);
          if (!player || player.role !== "gm") return;
          if (activeRace.status !== "betting" || activeRace.bets.length === 0) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041D\u0435\u0442 \u043F\u0440\u0438\u043D\u044F\u0442\u044B\u0445 \u0441\u0442\u0430\u0432\u043E\u043A \u0434\u043B\u044F \u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0431\u0435\u0433\u0430!", type: "danger" } }));
            return;
          }
          activeRace.status = "running";
          activeRace.winner = null;
          activeRace.tickCount = 0;
          activeRace.contestants.forEach((c) => c.position = 0);
          activeRace.log = [`\u{1F3C1} \u041A\u0423\u0420\u0410\u0422\u041E\u0420 \u0414\u0410\u041B \u0421\u0422\u0410\u0420\u0422 \u0417\u0410\u0411\u0415\u0413\u0423! \u0417\u0432\u0435\u0440\u0438 \u0440\u0438\u043D\u0443\u043B\u0438\u0441\u044C \u0432\u043F\u0435\u0440\u0435\u0434!`];
          appendSystemMessage(`\u{1F3C1} \u041D\u0410\u0427\u0410\u041B\u0418\u0421\u042C \u041F\u041E\u0414\u041F\u041E\u041B\u042C\u041D\u042B\u0415 \u0421\u041A\u0410\u0427\u041A\u0418 \u0422\u0410\u0412\u0415\u0420\u041D\u042B! \u0422\u0432\u0430\u0440\u0438 \u043F\u0443\u0449\u0435\u043D\u044B!`, "warning");
          broadcastTavernGames();
          const raceInterval = setInterval(() => {
            activeRace.tickCount++;
            let finishReached = false;
            activeRace.contestants.forEach((c) => {
              let delta = 0;
              let eventMsg = "";
              if (c.type === "favorite") {
                delta = Math.floor(Math.random() * 3) + 2;
                if (Math.random() < 0.2) {
                  delta += 2;
                  if (Math.random() < 0.15) eventMsg = `\u{1F525} ${c.name} \u043F\u043E\u0447\u0443\u044F\u043B \u0430\u0437\u0430\u0440\u0442 \u0438 \u043F\u0440\u0438\u0431\u0430\u0432\u0438\u043B \u0445\u043E\u0434\u0443!`;
                }
                if (Math.random() < 0.15) {
                  delta -= 1;
                  if (Math.random() < 0.15) eventMsg = `\u{1F4A8} ${c.name} \u043F\u043E\u043F\u0430\u043B \u0432 \u043F\u044B\u043B\u0435\u0432\u043E\u0439 \u0432\u0438\u0445\u0440\u044C.`;
                }
              } else if (c.type === "balanced") {
                delta = Math.floor(Math.random() * 3) + 1;
                if (Math.random() < 0.35) {
                  delta += 3;
                  if (Math.random() < 0.2) eventMsg = `\u26A1 ${c.name} \u0441\u043E\u0432\u0435\u0440\u0448\u0430\u0435\u0442 \u043E\u0442\u043B\u0438\u0447\u043D\u044B\u0439 \u0440\u044B\u0432\u043E\u043A!`;
                }
                if (Math.random() < 0.15) {
                  delta -= 1;
                  if (Math.random() < 0.15) eventMsg = `\u26A0\uFE0F ${c.name} \u043F\u0440\u0438\u0442\u043E\u0440\u043C\u043E\u0437\u0438\u043B \u043F\u0435\u0440\u0435\u0434 \u0432\u043E\u0440\u043E\u043D\u043A\u043E\u0439.`;
                }
              } else if (c.type === "underdog") {
                delta = Math.floor(Math.random() * 2) + 1;
                if (Math.random() < 0.45) {
                  delta += 4;
                  if (Math.random() < 0.25) eventMsg = `\u{1F680} \u0410\u041D\u041E\u041C\u0410\u041B\u042C\u041D\u042B\u0419 \u0423\u0421\u041A\u041E\u0420\u0418\u0422\u0415\u041B\u042C! ${c.name} \u0431\u0443\u043A\u0432\u0430\u043B\u044C\u043D\u043E \u043B\u0435\u0442\u0438\u0442 \u0432\u043F\u0435\u0440\u0435\u0434!`;
                }
                if (Math.random() < 0.2) {
                  delta -= 2;
                  if (Math.random() < 0.2) eventMsg = `\u{1F43E} ${c.name} \u0441\u043F\u043E\u0442\u043A\u043D\u0443\u043B\u0441\u044F \u0438 \u0437\u0430\u043C\u0435\u0434\u043B\u0438\u043B\u0441\u044F.`;
                }
              }
              delta = Math.max(0, delta);
              c.position = Math.min(100, c.position + delta);
              if (eventMsg && activeRace.tickCount % 2 === 0) {
                activeRace.log.push(eventMsg);
              }
              if (c.position >= 100) {
                finishReached = true;
              }
            });
            const sorted = [...activeRace.contestants].sort((a, b) => b.position - a.position);
            if (activeRace.tickCount % 3 === 0) {
              activeRace.log.push(`\u{1F3C3} \u041B\u0438\u0434\u0435\u0440 \u0437\u0430\u0431\u0435\u0433\u0430: "${sorted[0].name}" (\u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E ${sorted[0].position}%)`);
            }
            if (finishReached) {
              clearInterval(raceInterval);
              const finalSorted = [...activeRace.contestants].sort((a, b) => b.position - a.position);
              const winner = finalSorted[0];
              activeRace.winner = winner.name;
              activeRace.status = "finished";
              activeRace.log.push(`\u{1F3C6} \u041F\u041E\u0411\u0415\u0414\u0418\u0422\u0415\u041B\u042C \u0417\u0410\u0411\u0415\u0413\u0410: "${winner.name}"!`);
              appendSystemMessage(`\u{1F3C1} \u0421\u043A\u0430\u0447\u043A\u0438: \u041F\u043E\u0431\u0435\u0434\u0438\u043B "${winner.name}"!`, "success");
              activeRace.bets.forEach((b) => {
                if (b.contestantName === winner.name) {
                  const winnings = Math.floor(b.betAmount * winner.odds);
                  if (playerDb[b.playerId]) {
                    playerDb[b.playerId].balance += winnings;
                    activeRace.log.push(`\u{1F4B0} ${b.username} \u0437\u0430\u0431\u0438\u0440\u0430\u0435\u0442 \u0432\u044B\u043F\u043B\u0430\u0442\u0443: +${winnings} RU (\u043A\u044D\u0444 ${winner.odds}x)!`);
                    appendSystemMessage(`\u{1F4B0} \u0421\u0442\u0430\u043B\u043A\u0435\u0440 ${b.username} \u0441\u043E\u0440\u0432\u0430\u043B \u043A\u0443\u0448 \u0432 ${winnings} RU \u043D\u0430 "${winner.name}"!`, "loot");
                  }
                } else {
                  activeRace.log.push(`\u{1F940} ${b.username} \u043F\u0440\u043E\u0438\u0433\u0440\u0430\u043B \u0441\u0432\u043E\u044E \u0441\u0442\u0430\u0432\u043A\u0443 \u043D\u0430 ${b.contestantName}`);
                }
              });
              savePlayerDb();
            }
            broadcastTavernGames();
          }, 700);
          break;
        }
        case "RACE_RESET_GM": {
          const player = clients.get(ws);
          if (!player || player.role !== "gm") return;
          activeRace.status = "none";
          activeRace.bets = [];
          activeRace.winner = null;
          activeRace.log = ["\u0417\u0430\u0435\u0437\u0434 \u043E\u0447\u0438\u0449\u0435\u043D \u0438 \u0433\u043E\u0442\u043E\u0432 \u043A \u043D\u043E\u0432\u044B\u043C \u0441\u0442\u0430\u0432\u043A\u0430\u043C."];
          activeRace.contestants.forEach((c) => c.position = 0);
          broadcastTavernGames();
          break;
        }
        case "BAR_SELL_ITEM": {
          if (!tavernSettings.enabledGames.trades) {
            const player = clients.get(ws);
            if (!player || player.role !== "gm") {
              ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u0422\u043E\u0440\u0433\u043E\u0432\u0430\u044F \u0441\u043A\u0443\u043F\u043A\u0430 \u0421\u0438\u0434\u043E\u0440\u043E\u0432\u0438\u0447\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u0437\u0430\u043A\u0440\u044B\u0442\u0430 \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u043E\u043C!", type: "danger" } }));
              return;
            }
          }
          const { playerId, username, itemIndex } = payload;
          const profile = playerDb[playerId];
          if (!profile) return;
          if (!map || !map.inventory || !map.inventory[itemIndex]) return;
          const itemName = map.inventory[itemIndex];
          let price = 200;
          const artifactNames = ["\u041A\u0430\u043F\u043B\u044F", "\u041A\u0440\u043E\u0432\u044C \u043A\u0430\u043C\u043D\u044F", "\u0421\u043B\u0438\u0437\u044C", "\u041A\u043E\u043B\u044E\u0447\u043A\u0430", "\u041C\u0435\u0434\u0443\u0437\u0430", "\u0412\u0441\u043F\u044B\u0448\u043A\u0430", "\u041A\u0440\u0438\u0441\u0442\u0430\u043B\u043B", "\u0411\u0435\u043D\u0433\u0430\u043B\u044C\u0441\u043A\u0438\u0439 \u043E\u0433\u043E\u043D\u044C", "\u041D\u043E\u0447\u043D\u043E\u0439 \u0421\u0432\u0435\u0442\u043E\u0447"];
          const isArtifact = artifactNames.some((art) => itemName.includes(art));
          if (isArtifact) {
            price = Math.floor(Math.random() * 400) + 600;
          } else {
            price = Math.floor(Math.random() * 100) + 150;
          }
          profile.balance += price;
          savePlayerDb();
          map.inventory.splice(itemIndex, 1);
          appendSystemMessage(`\u{1F91D} \u0421\u0442\u0430\u043B\u043A\u0435\u0440 ${username} \u0441\u0434\u0430\u043B \u0421\u0438\u0434\u043E\u0440\u043E\u0432\u0438\u0447\u0443 \u0445\u0430\u0431\u0430\u0440: "${itemName}" \u0437\u0430 ${price} RU!`, "loot");
          broadcast("SYNC_APP_STATE", { map, gameState, messages });
          broadcastTavernGames();
          break;
        }
        case "GM_MODIFY_BALANCE": {
          const player = clients.get(ws);
          if (!player || player.role !== "gm") return;
          const { targetPlayerId, delta } = payload;
          const profile = playerDb[targetPlayerId];
          if (profile) {
            profile.balance = Math.max(0, profile.balance + delta);
            savePlayerDb();
            appendSystemMessage(`\u2699\uFE0F \u0421\u0438\u0441\u0442\u0435\u043C\u0430: \u0411\u0430\u043B\u0430\u043D\u0441 \u0438\u0433\u0440\u043E\u043A\u0430 \u0431\u044B\u043B \u043E\u0442\u0440\u0435\u0433\u0443\u043B\u0438\u0440\u043E\u0432\u0430\u043D \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u043E\u043C \u043D\u0430 ${delta > 0 ? "+" : ""}${delta} RU.`, "info");
            broadcastTavernGames();
          }
          break;
        }
        case "GM_SET_PLAYER_BALANCE": {
          const player = clients.get(ws);
          if (!player || player.role !== "gm") return;
          const { targetPlayerId, balance } = payload;
          const profile = playerDb[targetPlayerId];
          if (profile) {
            profile.balance = Math.max(0, parseInt(balance, 10) || 0);
            savePlayerDb();
            appendSystemMessage(`\u{1F6E1}\uFE0F \u0411\u0430\u0437\u0430 \u0434\u0430\u043D\u043D\u044B\u0445: \u041A\u0443\u0440\u0430\u0442\u043E\u0440 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u043B \u0431\u0430\u043B\u0430\u043D\u0441 \u0443 \u0438\u0433\u0440\u043E\u043A\u0430 \u043D\u0430 ${profile.balance} RU.`, "info");
            broadcastTavernGames();
          }
          break;
        }
        case "GM_UNLOCK_PLAYER_CARDS": {
          const player = clients.get(ws);
          if (!player || player.role !== "gm") return;
          const { targetPlayerId, card } = payload;
          const profile = playerDb[targetPlayerId];
          if (profile && card) {
            if (!profile.unlockedCards.includes(card)) {
              profile.unlockedCards.push(card);
              savePlayerDb();
              appendSystemMessage(`\u{1F6E1}\uFE0F \u0411\u0430\u0437\u0430 \u0434\u0430\u043D\u043D\u044B\u0445: \u041A\u0443\u0440\u0430\u0442\u043E\u0440 \u043E\u0442\u043A\u0440\u044B\u043B \u043A\u0430\u0440\u0442\u0443 [${card}] \u0438\u0433\u0440\u043E\u043A\u0443.`, "info");
              broadcastTavernGames();
            }
          }
          break;
        }
        case "GM_RESET_PLAYER_PROFILE": {
          const player = clients.get(ws);
          if (!player || player.role !== "gm") return;
          const { targetPlayerId } = payload;
          if (playerDb[targetPlayerId]) {
            const oldName = playerDb[targetPlayerId]?.userName;
            playerDb[targetPlayerId] = {
              userName: oldName,
              balance: 1e3,
              unlockedCards: ["+1", "-1", "+2", "-2", "+3", "-3", "+4", "-4", "+5", "-5"],
              pazaakDeck: []
            };
            savePlayerDb();
            appendSystemMessage(`\u{1F6E1}\uFE0F \u0411\u0430\u0437\u0430 \u0434\u0430\u043D\u043D\u044B\u0445: \u041A\u0443\u0440\u0430\u0442\u043E\u0440 \u0441\u0431\u0440\u043E\u0441\u0438\u043B \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u0438\u0433\u0440\u043E\u043A\u0430 \u043A \u043D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u043C \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F\u043C!`, "info");
            broadcastTavernGames();
          }
          break;
        }
        case "GM_ADD_SHOP_ITEM": {
          const player = clients.get(ws);
          if (!player || player.role !== "gm") return;
          const { name, price, type: type2, description } = payload;
          const newItem = {
            id: "item_" + Math.random().toString(36).substring(2, 9),
            name,
            price: parseInt(price, 10) || 120,
            type: type2 || "misc",
            description: description || "\u0421\u043F\u0435\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u0437\u0430\u043A\u0430\u0437 \u041A\u041F\u041A"
          };
          shopItems.push(newItem);
          saveShopItems();
          appendSystemMessage(`\u{1F6D2} \u0422\u043E\u0440\u0433\u043E\u0432\u043B\u044F: \u041A\u0443\u0440\u0430\u0442\u043E\u0440 \u0434\u043E\u0431\u0430\u0432\u0438\u043B \u043D\u043E\u0432\u044B\u0439 \u0442\u043E\u0432\u0430\u0440 \u0443 \u0421\u0438\u0434\u043E\u0440\u043E\u0432\u0438\u0447\u0430: "${name}" \u0437\u0430 ${price} RU!`, "info");
          broadcastTavernGames();
          break;
        }
        case "GM_DELETE_SHOP_ITEM": {
          const player = clients.get(ws);
          if (!player || player.role !== "gm") return;
          const { itemId } = payload;
          const found = shopItems.find((i) => i.id === itemId);
          if (found) {
            shopItems = shopItems.filter((i) => i.id !== itemId);
            saveShopItems();
            appendSystemMessage(`\u{1F5D1}\uFE0F \u0422\u043E\u0440\u0433\u043E\u0432\u043B\u044F: \u041A\u0443\u0440\u0430\u0442\u043E\u0440 \u0443\u0431\u0440\u0430\u043B \u0442\u043E\u0432\u0430\u0440 "${found.name}" \u0441 \u043F\u0440\u0438\u043B\u0430\u0432\u043A\u0430 \u0421\u0438\u0434\u043E\u0440\u043E\u0432\u0438\u0447\u0430.`, "info");
            broadcastTavernGames();
          }
          break;
        }
        case "GM_UPDATE_TAVERN_SETTINGS": {
          const player = clients.get(ws);
          if (!player || player.role !== "gm") return;
          const { tavernName, enabledGames } = payload;
          if (tavernName !== void 0) {
            tavernSettings.tavernName = tavernName;
            appendSystemMessage(`\u2699\uFE0F \u0417\u0430\u0432\u0435\u0434\u0435\u043D\u0438\u0435: \u0411\u0430\u0440 \u043F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D \u0432 "${tavernName}"`, "warning");
          }
          if (enabledGames !== void 0) {
            tavernSettings.enabledGames = enabledGames;
            appendSystemMessage(`\u2699\uFE0F \u0417\u0430\u0432\u0435\u0434\u0435\u043D\u0438\u0435: \u041A\u0443\u0440\u0430\u0442\u043E\u0440 \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u043B \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0441\u0442\u0438 \u0438\u0433\u0440 \u0417\u043E\u043D\u044B.`, "info");
          }
          saveTavernSettings();
          broadcastTavernGames();
          break;
        }
        case "BUY_SHOP_ITEM": {
          if (!tavernSettings.enabledGames.trades) {
            const player = clients.get(ws);
            if (!player || player.role !== "gm") {
              ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u0422\u043E\u0440\u0433\u043E\u0432\u0430\u044F \u043B\u0430\u0432\u043A\u0430 \u0421\u0438\u0434\u043E\u0440\u043E\u0432\u0438\u0447\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u0437\u0430\u043A\u0440\u044B\u0442\u0430 \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u043E\u043C!", type: "danger" } }));
              return;
            }
          }
          const { playerId, username, itemId } = payload;
          const profile = playerDb[playerId];
          const item = shopItems.find((i) => i.id === itemId);
          if (!profile || !item) return;
          if (profile.balance < item.price) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u043D\u0430 \u0441\u0447\u0435\u0442\u0435 \u041A\u041F\u041A!", type: "danger" } }));
            return;
          }
          if (!map) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041E\u0448\u0438\u0431\u043A\u0430: \u042D\u043A\u0441\u043F\u0435\u0434\u0438\u0446\u0438\u044F \u0435\u0449\u0435 \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430! \u0412 \u0440\u044E\u043A\u0437\u0430\u043A \u043E\u0442\u0440\u044F\u0434\u0430 \u0441\u0435\u0439\u0447\u0430\u0441 \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F.", type: "danger" } }));
            return;
          }
          profile.balance -= item.price;
          savePlayerDb();
          if (!map.inventory) {
            map.inventory = [];
          }
          map.inventory.push(item.name);
          appendSystemMessage(`\u{1F6D2} \u0421\u0442\u0430\u043B\u043A\u0435\u0440 ${username} \u043A\u0443\u043F\u0438\u043B \u0443 \u0421\u0438\u0434\u043E\u0440\u043E\u0432\u0438\u0447\u0430: "${item.name}" \u0437\u0430 ${item.price} RU!`, "loot");
          broadcast("SYNC_APP_STATE", { map, gameState, messages });
          broadcastTavernGames();
          break;
        }
        case "GM_ADD_TO_INVENTORY": {
          const player = clients.get(ws);
          if (!player || player.role !== "gm") return;
          const { itemName } = payload;
          if (!map) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u042D\u043A\u0441\u043F\u0435\u0434\u0438\u0446\u0438\u044F \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430!", type: "danger" } }));
            return;
          }
          if (!map.inventory) {
            map.inventory = [];
          }
          map.inventory.push(itemName);
          appendSystemMessage(`\u{1F4E6} \u0420\u044E\u043A\u0437\u0430\u043A: \u041A\u0443\u0440\u0430\u0442\u043E\u0440 \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E \u0434\u043E\u0431\u0430\u0432\u0438\u043B "${itemName}" \u0432 \u0440\u044E\u043A\u0437\u0430\u043A \u043E\u0442\u0440\u044F\u0434\u0430!`, "loot");
          broadcast("SYNC_APP_STATE", { map, gameState, messages });
          break;
        }
        case "SLOTS_SPIN": {
          if (!tavernSettings.enabledGames.slots) {
            const player = clients.get(ws);
            if (!player || player.role !== "gm") {
              ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u0418\u0433\u0440\u043E\u0432\u043E\u0439 \u0430\u0432\u0442\u043E\u043C\u0430\u0442 '\u0420\u0435\u0430\u043A\u0442\u043E\u0440-\u0421\u043B\u043E\u0442' \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u043E\u043C!", type: "danger" } }));
              return;
            }
          }
          const { playerId, bet } = payload;
          const profile = playerDb[playerId];
          if (!profile) return;
          const activeClient = clients.get(ws);
          const activeUsername = activeClient ? activeClient.username : "\u0421\u0442\u0430\u043B\u043A\u0435\u0440";
          if (profile.balance < bet) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E RU \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0435!", type: "danger" } }));
            return;
          }
          profile.balance -= bet;
          const symbols = ["\u2699\uFE0F", "\u2699\uFE0F", "\u2699\uFE0F", "\u{1F96B}", "\u{1F96B}", "\u{1F37E}", "\u{1F37E}", "\u{1F48E}", "\u2622\uFE0F", "\u{1F480}"];
          const r1 = symbols[Math.floor(Math.random() * symbols.length)];
          const r2 = symbols[Math.floor(Math.random() * symbols.length)];
          const r3 = symbols[Math.floor(Math.random() * symbols.length)];
          const reels = [r1, r2, r3];
          let winMultiplier = 0;
          let combinationName = "\u0411\u0435\u0437 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0439";
          if (r1 === r2 && r2 === r3) {
            if (r1 === "\u2622\uFE0F") {
              winMultiplier = 15;
              combinationName = "\u0422\u0420\u0418 \u0420\u0410\u0414\u0418\u0410\u0426\u0418\u0418 (\u0413\u0435\u043D\u0435\u0440\u0430\u0442\u043E\u0440 \u0421\u0432\u0435\u0440\u0445\u043F\u0440\u043E\u0432\u043E\u0434\u043D\u0438\u043A\u043E\u0432!) \u2622\uFE0F\u2622\uFE0F\u2622\uFE0F";
            } else if (r1 === "\u{1F48E}") {
              winMultiplier = 10;
              combinationName = "\u0422\u0420\u0418 \u0417\u041E\u041B\u041E\u0422\u042B\u0425 \u0410\u0420\u0422\u0415\u0424\u0410\u041A\u0422\u0410! \u{1F48E}\u{1F48E}\u{1F48E}";
            } else if (r1 === "\u{1F37E}") {
              winMultiplier = 6;
              combinationName = "\u0411\u0410\u0422\u0410\u0420\u0415\u042F \u0412\u041E\u0414\u041A\u0418 \xAB\u041A\u0410\u0417\u0410\u041A\u0418\xBB \u{1F37E}\u{1F37E}\u{1F37E}";
            } else if (r1 === "\u{1F96B}") {
              winMultiplier = 4;
              combinationName = "\u0410\u0420\u041C\u0415\u0419\u0421\u041A\u0418\u0419 \u0417\u0410\u041F\u0410\u0421 \u0421\u0423\u0425\u041F\u0410\u0419\u041A\u0410 \u{1F96B}\u{1F96B}\u{1F96B}";
            } else if (r1 === "\u2699\uFE0F") {
              winMultiplier = 3;
              combinationName = "\u041D\u0410\u0411\u041E\u0420 \u041E\u041F\u041E\u0420\u041D\u042B\u0425 \u0411\u041E\u041B\u0422\u041E\u0412 \u2699\uFE0F\u2699\uFE0F\u2699\uFE0F";
            } else if (r1 === "\u{1F480}") {
              winMultiplier = 2.5;
              combinationName = "\u041C\u0415\u0420\u0422\u0412\u0410\u042F \u041F\u0415\u0422\u041B\u042F \u0425\u0410\u0420\u041E\u041D\u0410 \u{1F480}\u{1F480}\u{1F480}";
            }
          } else if (r1 === r2 || r2 === r3 || r1 === r3) {
            const pairSymbol = r1 === r2 || r1 === r3 ? r1 : r2;
            if (pairSymbol === "\u2622\uFE0F") {
              winMultiplier = 1.8;
              combinationName = "\u0414\u0432\u043E\u0439\u043D\u0430\u044F \u0420\u0430\u0434\u0438\u0430\u0446\u0438\u044F \u2622\uFE0F";
            } else if (pairSymbol === "\u{1F48E}") {
              winMultiplier = 1.5;
              combinationName = "\u0414\u0432\u0430 \u0410\u0440\u0442\u0435\u0444\u0430\u043A\u0442\u0430 \u{1F48E}";
            } else if (pairSymbol === "\u{1F37E}") {
              winMultiplier = 1.3;
              combinationName = "\u041F\u0430\u0440\u0430 \u0411\u0443\u0442\u044B\u043B\u043E\u043A \u0412\u043E\u0434\u043A\u0438";
            } else {
              winMultiplier = 1.1;
              combinationName = "\u0421\u043A\u0440\u043E\u043C\u043D\u0430\u044F \u041F\u0430\u0440\u0430";
            }
          }
          const winAmount = Math.floor(bet * winMultiplier);
          if (winAmount > 0) {
            profile.balance += winAmount;
          }
          savePlayerDb();
          ws.send(JSON.stringify({
            type: "SLOTS_RESULT",
            payload: {
              reels,
              winAmount,
              message: winAmount > 0 ? `\u{1F389} \u041F\u041E\u0411\u0415\u0414\u0410! \u0412\u044B \u0432\u044B\u0431\u0438\u043B\u0438 [${combinationName}] \u0438 \u0432\u044B\u0438\u0433\u0440\u0430\u043B\u0438 +${winAmount} RU!` : `\u{1F4B8} \u0423\u0432\u044B! \u0412\u044B\u043F\u0430\u043B\u043E: ${reels.join(" | ")}. \u041D\u0438 \u0435\u0434\u0438\u043D\u043E\u0439 \u0437\u0430\u0446\u0435\u043F\u043A\u0438. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437!`
            }
          }));
          if (winAmount >= bet * 5) {
            appendSystemMessage(`\u{1F3B0} \u0421\u043B\u043E\u0442-\u041C\u0430\u0448\u0438\u043D\u0430: \u0421\u0442\u0430\u043B\u043A\u0435\u0440 ${activeUsername} \u0441\u043E\u0440\u0432\u0430\u043B \u043A\u0443\u0448 \u0432 \u0440\u0430\u0437\u043C\u0435\u0440\u0435 ${winAmount} RU \u043D\u0430 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0435 (\xAB${combinationName}\xBB)!`, "success");
          }
          broadcastTavernGames();
          break;
        }
        case "ROULETTE_SPIN": {
          if (!tavernSettings.enabledGames.roulette) {
            const player = clients.get(ws);
            if (!player || player.role !== "gm") {
              ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u0412\u043E\u0435\u043D\u043D\u0430\u044F \u0440\u0430\u0434\u0430\u0440-\u0440\u0443\u043B\u0435\u0442\u043A\u0430 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u043E\u043C!", type: "danger" } }));
              return;
            }
          }
          const { playerId, betAmount, betType, betValue } = payload;
          const profile = playerDb[playerId];
          if (!profile) return;
          const activeClient = clients.get(ws);
          const activeUsername = activeClient ? activeClient.username : "\u0421\u0442\u0430\u043B\u043A\u0435\u0440";
          if (profile.balance < betAmount) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0435 \u041A\u041F\u041A!", type: "danger" } }));
            return;
          }
          profile.balance -= betAmount;
          const winningNumber = Math.floor(Math.random() * 37);
          const getReds = () => [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
          const color = winningNumber === 0 ? "green" : getReds().includes(winningNumber) ? "red" : "black";
          let isWin = false;
          let winMultiplier = 0;
          if (betType === "number") {
            if (winningNumber === parseInt(betValue)) {
              isWin = true;
              winMultiplier = 35;
            }
          } else if (betType === "color") {
            if (color === betValue) {
              isWin = true;
              winMultiplier = 2;
            }
          } else if (betType === "parity") {
            if (winningNumber !== 0) {
              const isEven = winningNumber % 2 === 0;
              if (betValue === "even" && isEven) {
                isWin = true;
                winMultiplier = 2;
              } else if (betValue === "odd" && !isEven) {
                isWin = true;
                winMultiplier = 2;
              }
            }
          }
          const winAmount = isWin ? Math.floor(betAmount * winMultiplier) : 0;
          if (winAmount > 0) {
            profile.balance += winAmount;
          }
          savePlayerDb();
          const colorLabel = winningNumber === 0 ? "\u{1F7E2} \u0417\u0415\u0420\u041E (0)" : color === "red" ? `\u{1F534} \u041A\u0420\u0410\u0421\u041D\u041E\u0415 (${winningNumber})` : `\u26AB \u0427\u0415\u0420\u041D\u041E\u0415 (${winningNumber})`;
          ws.send(JSON.stringify({
            type: "ROULETTE_RESULT",
            payload: {
              winningNumber,
              winningColor: color,
              winAmount,
              message: winAmount > 0 ? `\u{1F3AF} \u0412\u042B\u0418\u0413\u0420\u042B\u0428! \u0412\u044B\u043F\u0430\u043B\u043E ${colorLabel}. \u0412\u0430\u0448\u0430 \u0441\u0442\u0430\u0432\u043A\u0430 \u043F\u0440\u0438\u043D\u0435\u0441\u043B\u0430 \u0432\u0430\u043C +${winAmount} RU!` : `\u{1F4B8} \u041F\u0420\u041E\u0418\u0413\u0420\u042B\u0428! \u0412\u044B\u043F\u0430\u043B\u043E ${colorLabel}. \u0423\u0434\u0430\u0447\u0430 \u0443\u0441\u043A\u043E\u043B\u044C\u0437\u043D\u0443\u043B\u0430 \u0433\u043B\u0443\u0431\u043E\u043A\u043E \u043F\u043E\u0434 \u0440\u0430\u0434\u0430\u0440.`
            }
          }));
          if (winAmount >= betAmount * 5) {
            appendSystemMessage(`\u{1F3A1} \u0420\u0443\u043B\u0435\u0442\u043A\u0430: \u0421\u0442\u0430\u043B\u043A\u0435\u0440 ${activeUsername} \u043F\u043E\u0441\u0442\u0430\u0432\u0438\u043B \u043D\u0430 "${betValue}" \u0438 \u043F\u043E\u0434\u043D\u044F\u043B +${winAmount} RU \u043D\u0430 \u0440\u0430\u0434\u0430\u0440-\u0440\u0443\u043B\u0435\u0442\u043A\u0435! \u0412\u044B\u043F\u0430\u043B\u043E: ${colorLabel}`, "success");
          }
          broadcastTavernGames();
          break;
        }
        case "SHOOTING_RANGE_FINISH": {
          if (!tavernSettings.enabledGames.shooting) {
            const player = clients.get(ws);
            if (!player || player.role !== "gm") {
              ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u0421\u0442\u0440\u0435\u043B\u043A\u043E\u0432\u044B\u0439 \u0442\u0438\u0440 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043E\u043F\u0435\u0447\u0430\u0442\u0430\u043D \u043A\u0443\u0440\u0430\u0442\u043E\u0440\u043E\u043C!", type: "danger" } }));
              return;
            }
          }
          const { playerId, bet, score } = payload;
          const profile = playerDb[playerId];
          if (!profile) return;
          const activeClient = clients.get(ws);
          const activeUsername = activeClient ? activeClient.username : "\u0421\u0442\u0430\u043B\u043A\u0435\u0440";
          if (profile.balance < bet) {
            ws.send(JSON.stringify({ type: "NOTIFICATION", payload: { text: "\u274C \u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0435 \u041A\u041F\u041A!", type: "danger" } }));
            return;
          }
          profile.balance -= bet;
          let mult = 0;
          let rank = "\u041D\u043E\u0432\u0438\u0447\u043E\u043A";
          if (score >= 250) {
            mult = 1.8;
            rank = "\u{1F3C6} \u041B\u0435\u0433\u0435\u043D\u0434\u0430\u0440\u043D\u044B\u0439 \u0421\u0442\u0440\u0435\u043B\u043E\u043A";
          } else if (score >= 150) {
            mult = 1.2;
            rank = "\u{1F3AF} \u0421\u043D\u0430\u0439\u043F\u0435\u0440 \u0417\u043E\u043D\u044B";
          } else if (score >= 80) {
            mult = 0.8;
            rank = "\u{1F52B} \u041C\u0435\u0442\u043A\u0438\u0439 \u0421\u0442\u0440\u0435\u043B\u043E\u043A";
          } else {
            mult = 0;
            rank = "\u0421\u043B\u0435\u043F\u043E\u0439 \u041E\u043A\u043E\u0440\u043E\u043A (\u041F\u043E\u0442\u0440\u0435\u043D\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044C \u0435\u0449\u0451!)";
          }
          const winAmount = Math.floor(bet * mult);
          if (winAmount > 0) {
            profile.balance += winAmount;
          }
          savePlayerDb();
          ws.send(JSON.stringify({
            type: "SHOOTING_RANGE_RESULT",
            payload: {
              winAmount,
              message: winAmount > 0 ? `\u{1F396}\uFE0F \u0420\u0415\u0417\u0423\u041B\u042C\u0422\u0410\u0422: \u041D\u0430\u0431\u0440\u0430\u043D\u043E ${score} \u043E\u0447\u043A\u043E\u0432 (\u0417\u0432\u0430\u043D\u0438\u0435: ${rank}). \u0412\u044B \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u0438 \u0432\u044B\u043F\u043B\u0430\u0442\u0443 +${winAmount} RU!` : `\u274C \u0420\u0415\u0417\u0423\u041B\u042C\u0422\u0410\u0422: \u041D\u0430\u0431\u0440\u0430\u043D\u043E ${score} \u043E\u0447\u043A\u043E\u0432. \u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u043C\u0430\u0445\u043E\u0432 (\u0417\u0432\u0430\u043D\u0438\u0435: ${rank}). \u0421\u0442\u0430\u0432\u043A\u0430 \u0443\u0448\u043B\u0430 \u0431\u0430\u0440\u043C\u0435\u043D\u0443.`
            }
          }));
          if (winAmount >= bet * 1.5) {
            appendSystemMessage(`\u{1F3AF} \u0422\u0438\u0440: \u0421\u0442\u0430\u043B\u043A\u0435\u0440 ${activeUsername} \u043F\u0440\u043E\u0448\u0435\u043B \u0431\u043E\u0435\u0432\u0443\u044E \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0443 \u0432 \u0422\u0438\u0440\u0435 \u0441 \u0440\u0430\u043D\u0433\u043E\u043C [${rank}] \u0438 \u0432\u044B\u0438\u0433\u0440\u0430\u043B +${winAmount} RU!`, "success");
          }
          broadcastTavernGames();
          break;
        }
      }
    } catch (err) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0441\u043E\u043A\u0435\u0442\u0430:", err);
    }
  });
  ws.on("close", () => {
    const player = clients.get(ws);
    if (player) {
      console.log(`\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C ${player.username} \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u043B\u0441\u044F.`);
      clients.delete(ws);
      delete activeVotes[player.id];
      broadcast("VOTES_UPDATE", { activeVotes, activePlayersCount: getActivePlayersCount() });
      broadcastPlayersList();
    }
  });
});
function broadcastPlayersList() {
  const list = Array.from(clients.values());
  const hasActiveGM = getActiveGMId() !== null;
  broadcast("PLAYERS_UPDATE", { players: list, hasActiveGM });
}
async function startServer() {
  app.get("/api/profiles", (req, res) => {
    res.json(Object.keys(playerDb));
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`
======================================================`);
    console.log(`\u2B50 STANDALONE ANOMALY ZONE SERVER RUNNING PORT: ${PORT}`);
    console.log(`\u{1F449} Access locally inside development preview`);
    console.log(`\u{1F449} Access on local network at http://localhost:${PORT}`);
    console.log(`======================================================
`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
