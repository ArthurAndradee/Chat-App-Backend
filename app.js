const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let users = {};

app.use(express.static('client/build'));

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('join', (username) => {
        users[socket.id] = username;
        socket.emit('users', Object.values(users));
        socket.broadcast.emit('userJoined', username);
    });

    socket.on('privateMessage', (data) => {
        const { recipient, message, sender } = data;
        const recipientSocketId = Object.keys(users).find(key => users[key] === recipient);
        if (recipientSocketId) {
            const roomId = [socket.id, recipientSocketId].sort().join('-');
            socket.join(roomId);
            io.to(recipientSocketId).emit('receiveMessage', { message, sender, roomId });
            io.to(socket.id).emit('receiveMessage', { message, sender: 'You', roomId });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        const username = users[socket.id];
        delete users[socket.id];
        socket.broadcast.emit('userLeft', username);
    });
});

server.listen(5000, () => console.log('Server is running on port 5000'));