class transport {
    constructor(io, user) {
        this.socket = io;
        this.username = user;
        this.socket.emit('hello',{Name : this.username})
        this.socket.on('broadcast',this.onBroadcast);
        this.socket.on('message',this.onMessage);
    }
    onBroadcast = (msg) => {
        this.appendMessage({msg : msg , sender: "Broadcast"});
    }
    changeRoom = (id) => {
        this.socket.emit('change-room',id);
    }
    appendMessage = (msg)=>{
        const item = document.createElement('li');
        item.innerText = "[" + msg.sender + "] : " + msg.msg;
        document.getElementById("messages").appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    }
    sendMessage = (msg) => {
        this.socket.emit('message',msg);
    }
    onMessage = (payload) => {
        this.appendMessage({msg : payload.Message, sender : payload.User.Name});
    }
}