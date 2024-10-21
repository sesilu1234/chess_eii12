const WebSocket = require("ws");
const mysql = require("mysql2");

// Create a connection pool
const pool = mysql.createPool({
  host: "database-1.cnw6moiseb92.eu-north-1.rds.amazonaws.com",
  user: "sesilu1234",
  password: "Emilborel1234",
  database: "chess_game_1",
  waitForConnections: true,
  connectionLimit: 10, // Limit number of connections in the pool
  queueLimit: 0,
});

// Promisify the pool for async/await support
const promisePool = pool.promise();

const wss = new WebSocket.Server({ port: 8085 });

let games = []; // Store ongoing games
let clients = []; // Store all connected clients

wss.on("connection", (ws) => {
  clients.push(ws);
  console.log("Client connected. Total clients:", clients.length);

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data);
      const payload = message.payload;

      switch (message.type) {
        case "create_game":
          const now = new Date();
          const isoString = now.toISOString();
          const time = isoString.replace("T", " ").substring(0, 19);

          const sql =
            "INSERT INTO created_games (id, player1, color1, player2, color2, date_of_connection) VALUES (?, ?, ?, ?, ?, ?)";

          try {
            const [rows] = await promisePool.query(sql, [
              payload.id,
              payload.player1,
              payload.color1,
              payload.player2,
              payload.color2,
              time,
            ]);
            console.log("Game inserted successfully with ID:", payload.id);
          } catch (error) {
            console.error("Error inserting game:", error);
          }

          games.push({
            id: payload.id,
            player1: payload.player1,
            color1: payload.color1,
            player2: payload.player2,
            color2: payload.color2,
          });
          clients.push({ id: payload.id, player1: ws, player2: undefined });
          break;

        case "join_game":
          const game = games.find((g) => g.id == payload.id);
          console.log("aweiiasd");
          if (game) {
            const client = clients.find((c) => c.id == payload.id);
            client.player2 = ws;

            const sendJSON1 = {
              id: game.id,
              player1: game.player1,
              color1: game.color1,
              player2: game.player2,
              color2: game.color2,
              round: 1,
            };
            const sendJSON2 = {
              id: game.id,
              player1: game.player2,
              color1: game.color2,
              player2: game.player1,
              color2: game.color1,
              round: 2,
            };

            client.player1.send(
              JSON.stringify({ type: "start_game", payload: sendJSON1 })
            );
            client.player2.send(
              JSON.stringify({ type: "start_game", payload: sendJSON2 })
            );
            console.log("inf sent");
          } else {
            ws.send(
              JSON.stringify({
                type: "message",
                message: "No such game found.",
              })
            );
          }
          break;

        case "move":
          const client = clients.find((client) => client.id == payload.id);

          const sendJSON = {
            id: payload.id,
            moveA: payload.moveA,
            moveB: payload.moveB,
            turn: payload.turn,
            pawn_promotion: payload.pawn_promotion,
            castling: payload.castle,
          };
          


          if (client.player1 === ws) {
            client.player2.send(
              JSON.stringify({ type: "move", payload: sendJSON })
            );
          } else {
            client.player1.send(
              JSON.stringify({ type: "move", payload: sendJSON })
            );
          }
          console.log("adadsasd");
          break;

        default:
          console.log("Unknown action:", message.type);
          break;
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  /* ws.on("close", () => {
    const game = games.find((g) => g.player1.includes(ws) || g.player2.includes(ws));
    if (game) {
      const otherPlayer = game.players.find((player) => player !== ws);
      if (otherPlayer) {
        otherPlayer.send(
          JSON.stringify({
            type: "message",
            message: "Your opponent has disconnected. I guess that's a win for you!",
          })
        );
      }
      games = games.filter((g) => g !== game);
    }

    clients = clients.filter((client) => client !== ws);
    console.log("Client disconnected. Total clients:", clients.length);

    if (waitingPlayer === ws) {
      waitingPlayer = null;
    }
  }); */
});

console.log("WebSocket server is running on ws://localhost:8085");