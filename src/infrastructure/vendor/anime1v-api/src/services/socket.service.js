const { Server } = require("socket.io");

// In-memory room state storage
const rooms = {};

// Helper to get all users in a room
function getRoomUsers(roomId) {
  return rooms[roomId] ? rooms[roomId].users : [];
}

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    let currentRoomId = null;
    let currentUsername = null;

    console.log(`[SOCKET] User connected: ${socket.id}`);

    // Join room
    socket.on("join-room", ({ roomId, username, avatar }) => {
      currentRoomId = roomId;
      currentUsername = username || `Usuario-${socket.id.substring(0, 4)}`;
      const userAvatar = avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(currentUsername)}`;

      socket.join(roomId);

      // Create room if it doesn't exist
      if (!rooms[roomId]) {
        rooms[roomId] = {
          id: roomId,
          users: [],
          videoState: {
            playing: false,
            time: 0,
            episodeUrl: "",
            episodeNumber: null,
            animeTitle: "",
            mediaType: "hls",
            streamUrl: ""
          },
          tictactoe: {
            board: Array(9).fill(null),
            turn: "X",
            players: { X: null, O: null },
            status: "waiting"
          },
          drawHistory: []
        };
      }

      const room = rooms[roomId];
      const isHost = room.users.length === 0; // First user is host

      const newUser = {
        socketId: socket.id,
        username: currentUsername,
        avatar: userAvatar,
        isHost,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false
      };

      room.users.push(newUser);

      console.log(`[SOCKET] ${currentUsername} (${socket.id}) joined room: ${roomId} (Host: ${isHost})`);

      // Notify everyone in the room
      io.to(roomId).emit("room-users-updated", room.users);
      
      // Send the current room state to the newly joined user
      socket.emit("room-state", {
        videoState: room.videoState,
        tictactoe: room.tictactoe,
        drawHistory: room.drawHistory
      });

      // System message
      io.to(roomId).emit("receive-message", {
        id: `sys-${Date.now()}`,
        username: "Sistema",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=system",
        text: `${currentUsername} se ha unido al grupo.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        system: true
      });
    });

    // Chat Message
    socket.on("send-message", ({ text, channel }) => {
      if (!currentRoomId) return;

      const user = rooms[currentRoomId]?.users.find(u => u.socketId === socket.id);
      if (!user) return;

      const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username: user.username,
        avatar: user.avatar,
        text,
        channel: channel || "general",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      io.to(currentRoomId).emit("receive-message", message);
    });

    // Typing Status
    socket.on("typing-status", ({ isTyping }) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit("user-typing", {
        socketId: socket.id,
        username: currentUsername,
        isTyping
      });
    });

    // Video Playback Synchronization
    socket.on("video-state-change", (state) => {
      if (!currentRoomId || !rooms[currentRoomId]) return;

      const room = rooms[currentRoomId];
      room.videoState = {
        ...room.videoState,
        ...state
      };

      // Broadcast changes to others in the room
      socket.to(currentRoomId).emit("video-sync-state", room.videoState);
    });

    // Request full video sync from host
    socket.on("request-sync", () => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      const room = rooms[currentRoomId];
      const host = room.users.find(u => u.isHost);
      
      if (host && host.socketId !== socket.id) {
        // Send request to host
        io.to(host.socketId).emit("request-host-playback-time", { requesterId: socket.id });
      }
    });

    // Host responds with current time
    socket.on("respond-sync", ({ requesterId, time, playing }) => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      const room = rooms[currentRoomId];
      room.videoState.time = time;
      room.videoState.playing = playing;

      io.to(requesterId).emit("video-sync-state", room.videoState);
    });

    // Collaborative Drawing Board
    socket.on("draw-line", (drawData) => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      rooms[currentRoomId].drawHistory.push(drawData);
      // Keep canvas history size bounded
      if (rooms[currentRoomId].drawHistory.length > 500) {
        rooms[currentRoomId].drawHistory.shift();
      }
      socket.to(currentRoomId).emit("draw-line-broadcast", drawData);
    });

    socket.on("clear-canvas", () => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      rooms[currentRoomId].drawHistory = [];
      io.to(currentRoomId).emit("clear-canvas-broadcast");
    });

    // Discord-like Voice State (Simulation for interface)
    socket.on("toggle-voice-state", ({ type, value }) => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      const room = rooms[currentRoomId];
      const user = room.users.find(u => u.socketId === socket.id);
      
      if (user) {
        if (type === "mute") user.isMuted = value;
        if (type === "deafen") user.isDeafened = value;
        if (type === "speaking") user.isSpeaking = value;

        io.to(currentRoomId).emit("room-users-updated", room.users);
      }
    });

    // Multiplayer Game: Tic Tac Toe
    socket.on("tictactoe-join", () => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      const room = rooms[currentRoomId];
      const ttt = room.tictactoe;

      if (!ttt.players.X) {
        ttt.players.X = socket.id;
        socket.emit("tictactoe-assigned", "X");
      } else if (!ttt.players.O && ttt.players.X !== socket.id) {
        ttt.players.O = socket.id;
        socket.emit("tictactoe-assigned", "O");
        ttt.status = "playing";
      } else {
        socket.emit("tictactoe-assigned", "spectator");
      }

      io.to(currentRoomId).emit("tictactoe-state", ttt);
    });

    socket.on("tictactoe-move", ({ index }) => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      const room = rooms[currentRoomId];
      const ttt = room.tictactoe;

      // Validate turn
      const symbol = ttt.players.X === socket.id ? "X" : ttt.players.O === socket.id ? "O" : null;
      if (!symbol || ttt.turn !== symbol || ttt.status !== "playing" || ttt.board[index] !== null) {
        return;
      }

      ttt.board[index] = symbol;
      
      // Check winner
      const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
      ];

      let won = false;
      for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (ttt.board[a] && ttt.board[a] === ttt.board[b] && ttt.board[a] === ttt.board[c]) {
          won = true;
          break;
        }
      }

      if (won) {
        ttt.status = "won";
      } else if (ttt.board.every(cell => cell !== null)) {
        ttt.status = "draw";
      } else {
        ttt.turn = ttt.turn === "X" ? "O" : "X";
      }

      io.to(currentRoomId).emit("tictactoe-state", ttt);
    });

    socket.on("tictactoe-reset", () => {
      if (!currentRoomId || !rooms[currentRoomId]) return;
      const room = rooms[currentRoomId];
      room.tictactoe = {
        board: Array(9).fill(null),
        turn: "X",
        players: { X: null, O: null },
        status: "waiting"
      };
      io.to(currentRoomId).emit("tictactoe-state", room.tictactoe);
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`[SOCKET] User disconnected: ${socket.id}`);
      if (currentRoomId && rooms[currentRoomId]) {
        const room = rooms[currentRoomId];
        const userIndex = room.users.findIndex(u => u.socketId === socket.id);
        
        if (userIndex !== -1) {
          const leavingUser = room.users[userIndex];
          room.users.splice(userIndex, 1);

          // If host left, assign new host
          if (leavingUser.isHost && room.users.length > 0) {
            room.users[0].isHost = true;
          }

          // If Tic-Tac-Toe player left, reset game
          if (room.tictactoe.players.X === socket.id || room.tictactoe.players.O === socket.id) {
            room.tictactoe = {
              board: Array(9).fill(null),
              turn: "X",
              players: { X: null, O: null },
              status: "waiting"
            };
            io.to(currentRoomId).emit("tictactoe-state", room.tictactoe);
          }

          // Send updated users list
          io.to(currentRoomId).emit("room-users-updated", room.users);

          // System message
          io.to(currentRoomId).emit("receive-message", {
            id: `sys-${Date.now()}`,
            username: "Sistema",
            avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=system",
            text: `${currentUsername} ha abandonado el grupo.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            system: true
          });

          // Clean up room memory if empty
          if (room.users.length === 0) {
            delete rooms[currentRoomId];
            console.log(`[SOCKET] Room ${currentRoomId} is empty. Deleted room state.`);
          }
        }
      }
    });
  });
}

module.exports = { initSocket };
