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
    username: { type: String, unique: true },
    profilePicture: Buffer 
});

const messageSchema = new Schema({
    sender: String,
    message: String,
    timestamp: String
});

const roomSchema = new Schema({
    roomId: String,
    messages: [messageSchema]
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

    socket.on('join', async ({ username, profilePicture }) => {
        if (users[socket.id] && users[socket.id].username === username) {
            return;
        }
        
        users[socket.id] = { username, profilePicture };
        console.log(`User joined: ${username} with socket ID: ${socket.id}`);

        const existingUser = await User.findOne({ username });
        if (!existingUser) {
            const user = new User({ username, profilePicture });
            await user.save();
        } else {
            existingUser.profilePicture = profilePicture;
            await existingUser.save();
        }
        io.emit('users', await User.find());
    });

    socket.on('privateMessage', async (data) => {
        const { recipient, message, sender, timestamp } = data;
        console.log('Server received message:', data);
        
        const roomId = [sender, recipient].sort().join('-');
        const messageData = { sender, message, timestamp };
        
        let room = await Room.findOne({ roomId });
        if (!room) {
            room = new Room({ roomId, messages: [messageData] });
        } else {
            room.messages.push(messageData);
        }
        await room.save();

        const recipientSocketId = Object.keys(users).find(key => users[key].username === recipient);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('receiveMessage', { sender, message, roomId, timestamp });
        }
    });

    socket.on('fetchMessages', async (roomId) => {
        try {
            const room = await Room.findOne({ roomId });
            const messages = room ? room.messages : [];
            console.log("Loading messages: " + messages)
            console.log("Loading messages: " + JSON.stringify(messages))
            socket.emit('loadMessages', messages);
        } catch (error) {
            console.error('Error fetching messages:', error);
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