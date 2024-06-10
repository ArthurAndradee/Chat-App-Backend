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

const messageSchema = new Schema({
    sender: String,
    recipient: String,
    message: String,
    timestamp: String,
    roomId: String
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

let users = {};

app.use(express.static('client/build'));

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('getUsers', async () => {
        const usersList = await User.find();
        socket.emit('users', usersList);
    });

    socket.on('join', async (data) => {
        const { username, profilePicture } = data;
        const user = new User({ username, profilePicture });
        await user.save();
        io.emit('users', await User.find());
    });

    socket.on('privateMessage', async (data) => {
        const { recipient, message, sender, timestamp } = data;
        const roomId = [sender, recipient].sort().join('-');
        const messageData = new Message({ sender, recipient, message, timestamp, roomId });
        await messageData.save();
        const recipientSocketId = Object.keys(users).find(key => users[key].username === recipient);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('receiveMessage', { message, sender, roomId, timestamp });
        }
    });

    socket.on('fetchMessages', async (roomId) => {
        const messages = await Message.find({ roomId });
        socket.emit('loadMessages', messages);
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