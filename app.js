const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let users = {};

app.use(express.static('client/build'));

const getUsersList = () => {
    return Object.values(users);
};

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('getUsers', () => {
        const usersList = getUsersList(); 
        socket.emit('users', usersList);
    });

    socket.on('join', (data) => {
        const { username, profilePicture } = data;
        users[socket.id] = { username, profilePicture };
        io.emit('users', getUsersList());
    });

    socket.on('privateMessage', (data) => {
        const { recipient, message, sender, timestamp } = data;
        const recipientSocketId = Object.keys(users).find(key => users[key].username === recipient);
        if (recipientSocketId) {
            const roomId = [sender, recipient].sort().join('-');
            io.to(recipientSocketId).emit('receiveMessage', { message, sender, roomId, timestamp });
        }
    });

    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            delete users[socket.id];
            io.emit('users', getUsersList());
            socket.broadcast.emit('userLeft', user.username);
        }
    });
});

server.listen(5000, () => console.log('Server is running on port 5000'));