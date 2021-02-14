const fs = require('fs');
const express = require("express");
const app = express();
const privateKey  = fs.readFileSync('sslcerts/server.key', 'utf8');
const certificate = fs.readFileSync('sslcerts/server.crt', 'utf8');
const credentials = {key: privateKey, cert: certificate};
const listen_port = process.env.PORT || 2096;
const server = require('https').createServer(credentials,app);
const io = require('socket.io')(server);

//region STRUCTURES
/*
User = { Socket, Name , Room : UUID }
Room = { Viewers : List<User> , Broadcasters : List<User>, Owner : User , Name : String , ID : UUID}
Message = { User : User , Message : String }

*/
//endregion
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname+ '/node_modules'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
const rooms = [
    {
        "ID" : "4c56eeda-6d4d-11eb-9439-0242ac130002",
        "Name" : "Sooskiato",
        "Owner" : null ,
        "Broadcasters" : [] ,
        "Viewers" : []
    },
    {
        "ID" : "94ee1a14-6d4e-11eb-9439-0242ac130002",
        "Name" : "General",
        "Owner" : null ,
        "Broadcasters" : [] ,
        "Viewers" : []
    }
] ;
io.on('connection',(socket) => {
    const User = {
        Socket : socket.id ,
        Name  : Math.random().toString(36).substr(2),
        Room : null

    };
    function removeUserFromRoomLists(){
        let pRoomIndex = rooms.findIndex(r => r.ID === User.Room);
        let vIndex = rooms[pRoomIndex].Viewers.findIndex(u => u.Socket === socket.id);
        if(vIndex>=0) {
            rooms[pRoomIndex].Viewers.splice(vIndex, 1);
            console.log(`Viewer Removed : ${User.Name}`);
        }
        let bIndex = rooms[pRoomIndex].Broadcasters.findIndex(u => u.Socket === socket.id);
        if(bIndex>=0) {
            rooms[pRoomIndex].Broadcasters.splice(bIndex, 1);
            console.log(`Broadcaster Removed : ${User.Name}`);
        }
    }
    socket.on('disconnect',() => {
        if (User.Room == null )
            return;
        socket.to(User.Room).emit('removePeer', socket.id)
        removeUserFromRoomLists()
        sendServerBroadcast(User.Room,`${User.Name} left the channel`);

    });
    socket.on('hello', (info)=>{
        User.Name = info.Name;
    });
    socket.on('change-room',(id) => {
        let roomIndex = rooms.findIndex(r => r.ID === id);
        if(User.Room === rooms[roomIndex].ID)
            return;
        if(User.Room != null ) {
            sendServerBroadcast(User.Room, `${User.Name} left the room`);
            removeUserFromRoomLists()
            socket.leave(User.Room);
        }
        User.Room = rooms[roomIndex].ID ;
        socket.join(User.Room);
        rooms[roomIndex].Viewers.push(User);
        if(rooms[roomIndex].Broadcasters.length > 0 ){
            rooms[roomIndex].Broadcasters.forEach((user) =>{
                io.to(socket.id).emit('initReceive',user.Socket);
            });
        }
        sendServerBroadcast(User.Room,`${User.Name} joined the room`);
    });
    socket.on('message',(message) => {
        if(User.Room == null )
            return;
        let roomIndex = rooms.findIndex(r => r.ID === User.Room);
        if(message === "+owner") {
            rooms[roomIndex].Owner = User.Socket;
            sendServerBroadcast(User.Room,`${User.Name} is now the owner of the ${rooms[roomIndex].Name}`);
            return;
        }
        if(message === "whoami"){
            sendServerBroadcast(socket.id,`${User.Name} === ${User.Room} === ${User.Socket}`)
            return;
        }
        if(message === "+show"){
            let msg = "\n========= Viewers =========\n";
            rooms[roomIndex].Viewers.forEach((el=>{
                msg += `${el.Socket} ~> ${el.Name}\n`;
            }));
            msg += "========= Broadcasters =========\n";
            rooms[roomIndex].Broadcasters.forEach((el=>{
                msg += `${el.Socket} ~> ${el.Name}\n`;
            }));
            msg += "========= Owner =========\n";
            msg += `${ rooms[roomIndex].Owner } `
            sendServerBroadcast(socket.id,msg);
            return;
        }
        if(message.startsWith("+broadcaster")){
            if(rooms[roomIndex].Owner !== User.Socket)
                return;
            let parts = message.split(" ");
            parts.shift()
            let request_id = parts.join(' ');
            let bIndex = rooms[roomIndex].Broadcasters.findIndex(u => u.Socket === request_id);
            if(bIndex >0 )
                return;
            let vIndex = rooms[roomIndex].Viewers.findIndex(u => u.Socket === request_id);
            let viewer = null ;
            if(vIndex>=0) {
                viewer = rooms[roomIndex].Viewers[vIndex];
                rooms[roomIndex].Viewers.splice(vIndex, 1);
                console.log(`Viewer Removed ${User.Name}`);
                rooms[roomIndex].Broadcasters.push(viewer);
                sendServerBroadcast(rooms[roomIndex].ID,`${viewer.Name} is now broadcaster`);

                //ASKING ALL CLIENTS TO SETUP THEIR RECEIVERS
                sendCustomRoomBroadcast(rooms[roomIndex].ID,viewer.Socket,'initReceive',viewer.Socket);
            }else{
                sendServerBroadcast(socket.id,"Viewer Not found");
            }
            return;
        }
        io.to(User.Room).emit('message',{User: User,  Message : message});
    });
    socket.on('signal', data => {
        console.log('sending signal from ' + socket.id + ' to ', data)
        io.to(data.socket_id).emit('signal', {
            socket_id: socket.id,
            signal: data.signal
        })
    })
    socket.on('initSend', init_socket_id => {
        console.log('INIT SEND by ' + socket.id + ' for ' + init_socket_id)
        io.to(init_socket_id).emit('initSend', socket.id)
    })

    function sendCustomRoomBroadcast(roomId,userId,event,payload){
        let room = rooms.find(r => r.ID === roomId);
        room.Viewers.forEach((user) => {
            if(user.Socket === userId) return;
            io.to(user.Socket).emit(event,payload);
        });
        room.Broadcasters.forEach((user) => {
            if(user.Socket === userId ) return;
            io.to(user.Socket).emit(event,payload);
        });
    }
    function sendServerBroadcast(to,msg){
        io.to(to).emit("broadcast", msg)
    }
});
server.listen(listen_port, () => {
    console.log(`listening on *:${listen_port}`);
});