const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

mongoose.connect('mongodb://localhost:27017/ChatApp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const { Schema } = mongoose;

const userSchema = new Schema({
    username: String,
    profilePicture: Buffer
});

const roomSchema = new Schema({
    roomId: String,
    messages: [{
        sender: String,
        message: String,
        timestamp: String
    }]
});

const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);

const users = {};

app.use(express.static('client/build'));

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('getUsers', async () => {
        const usersList = await User.find();
        socket.emit('users', usersList);
    });

    socket.on('join', async (data) => {
        const { username, profilePicture } = data;
        users[socket.id] = { username, profilePicture };
        console.log(`User joined: ${username} with socket ID: ${socket.id}`);

        const user = await User.findOneAndUpdate(
            { username },
            { username, profilePicture },
            { upsert: true, new: true }
        );
        io.emit('users', await User.find());
    });

    socket.on('privateMessage', async (data) => {
        const { recipient, message, sender, timestamp, roomId } = data;
        console.log('Server received message:', data);

        const room = await Room.findOneAndUpdate(
            { roomId },
            { $push: { messages: { sender, message, timestamp } } },
            { upsert: true, new: true }
        );
        const recipientSocketId = Object.keys(users).find(key => users[key].username === recipient);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('receiveMessage', JSON.stringify({ sender, message, roomId, timestamp }));
        }
    });

    socket.on('fetchMessages', async (roomId) => {
        const room = await Room.findOne({ roomId });
        if (room) {
            const messages = room.messages.map(({ sender, message, timestamp }) => ({ sender, message, timestamp, roomId }));
            socket.emit('loadMessages', JSON.stringify(messages));
        } else {
            socket.emit('loadMessages', JSON.stringify([]));
        }
    });

    socket.on('disconnect', async () => {
        const user = users[socket.id];
        if (user) {
            delete users[socket.id];
            io.emit('users', await User.find());
            socket.broadcast.emit('userLeft', user.username);
        }
    });
});

server.listen(5000, () => console.log('Server is running on port 5000'));
