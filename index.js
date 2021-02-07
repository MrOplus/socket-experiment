const express = require("express");
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
app.use(express.static(__dirname + "/public"));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
const rooms = [
    {
        "name" : "#general",
        "owner" : null ,
        "broadcasters" : new Map() ,
        "viewers" : new Map()
    },
    {
        "name" : "#sooskiato",
        "owner" : null ,
        "broadcasters" : new Map() ,
        "viewers" : new Map()
    },
    {
        "name" : "#auxiato",
        "owner" : null ,
        "broadcasters" : new Map() ,
        "viewers" : new Map()
    },
] ;
io.on('connection',(socket) => {
    var room = "";
    var name = "" ;
    socket.join('#general');
    socket.on('disconnect',() => {
        sendServerMessage(room,`${name} left the channel`);
    });
    socket.on('message',(msg) => {
        if(msg.msg === "+owner"){
            rooms.forEach((v)=>{
                if(v.name === room){
                    v.owner = msg.sender;
                    sendServerMessage(room,`${msg.sender} is now the owner of ${v.name}`);
                }
            });
            return;
        }
        if(msg.msg.startsWith("+broadcaster")){
            let parts = msg.msg.split(" ");
            parts.shift()
            let requested_username = parts.join(' ');
            rooms.forEach((v) => {
                if(v.name === room){
                    let socket_id = null ;
                    if(v.viewers.has(requested_username))
                    {
                        socket_id = v.viewers.get(requested_username);
                        v.viewers.delete(requested_username);
                    }
                    v.broadcasters.set(requested_username,socket_id);
                    sendServerMessage(socket_id,`${requested_username} please allow the mic permission`)
                    io.to(socket_id).emit('rr',{});
                    sendServerMessage(room,requested_username + " is now broadcaster");

                }
            });
            return;
        }
        io.to(room).emit("message",{msg : msg.msg ,sender: msg.sender});
    });
    socket.on('control',(msg)=>{
        socket.rooms.forEach((v,k,m)=>{
            if(v.startsWith("#"))
                socket.leave(v);
        });
        socket.join(msg.room);
        io.to(socket.id).emit('room-changed',{});
        addViewer(msg.room,msg.sender);
    });
    function addViewer(roomName,username){
        name = username;
        rooms.forEach((v) => {
            if(v.name === roomName){
                v.viewers.set(username,socket.id)
                room = roomName;
                sendServerMessage(socket.id,"You are talking in " + roomName);
                sendServerMessage(room,`${username} has joined the room`,"Broadcast");
            }
        });
    }
    function sendServerMessage(to,msg,type = "Server"){
        io.to(to).emit("message", {msg : msg , sender : type})
    }
});
http.listen(3000, () => {
    console.log('listening on *:3000');
});