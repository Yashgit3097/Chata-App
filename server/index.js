const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  socket.on('join_room', (room, username) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);

    // Send system message to room
    const joinMessage = {
      username: 'System',
      text: `${username} joined the chat. You can now interact.`,
      time: new Date().toLocaleTimeString()
    };
    io.to(room).emit('receive_message', joinMessage);
  });

  socket.on('send_message', (data) => {
    console.log(data);
    const { room, ...msg } = data;
    io.to(room).emit('receive_message', msg);
  });

  socket.on('typing', (username) => {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    rooms.forEach((room) => {
      socket.to(room).emit('typing', username);
    });
  });

  socket.on('stop_typing', () => {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    rooms.forEach((room) => {
      socket.to(room).emit('stop_typing');
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(5000, () => {
  console.log('Server running on port 5000');
});
