//const SimplePeer = require('simple-peer')
class transport {
    constructor(io, user) {
        this.socket = io;
        this.username = user;
        this.socket.emit('hello', {Name: this.username})
        this.socket.on('broadcast', this.onBroadcast);
        this.socket.on('message', this.onMessage);
        this.socket.on('removePeer',this.onRemovedPeers);
        this.socket.on('initReceive', this.onInitReceive);
        this.socket.on('initSend', this.onInitSend);
        this.socket.on('signal', data => {
            console.log(`Received Signal from ${data.socket_id} \n${JSON.stringify(data.signal)}`);
            this.peers[data.socket_id].signal(data.signal)
        })
        this.videos = document.getElementById("players");
    }
    peers = []
    servers = {
        "iceServers": [
            {
                "urls": "stun:stun.l.google.com:19302"
            },
            {
                url: 'turn:192.158.29.39:3478?transport=udp',
                credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
                username: '28224511:1379330808'
            }
        ]
    }
    localMedia = null ;
    getMedia = async ()=>{
        this.localMedia = await navigator.mediaDevices.getUserMedia({audio: true});
        debugger;
    }
    onRemovedPeers = (id)=>{
        let videoEl = document.getElementById(id)
        if (videoEl) {

            const tracks = videoEl.srcObject.getTracks();

            tracks.forEach(function (track) {
                track.stop();
            })

            videoEl.srcObject = null;
            videoEl.parentNode.removeChild(videoEl);
        }
        if (this.peers[id]) this.peers[id].destroy();
        delete this.peers[id];
    }
    onInitSend = async (id)=>{
        await this.getMedia();
        console.log("Ready to send connection to " , id);
        this.addPeer(id,true);
    }
    onInitReceive = (id)=>{
        console.log("Ready to receive connection from " , id);
        this.addPeer(id,false);
        this.socket.emit('initSend',id);
    }
    addPeer = (id , isInit) => {
        this.peers[id] = new SimplePeer({
            initiator : isInit,
            config : this.servers,
            stream : this.localMedia
        });
        this.peers[id].on('signal',data => {
            socket.emit('signal', {
                signal: data,
                socket_id: id
            });
        });

        this.peers[id].on('stream', stream => {
            let newVid = document.createElement('video')
            newVid.srcObject = stream
            newVid.id = id
            newVid.playsinline = false
            newVid.autoplay = true
            newVid.className = "vid"
            this.videos.appendChild(newVid)
        });
        this.peers[id].on('connect', () => {
            console.log(`Peer ${id} Connected`);
            this.peers[id].send(`Hello Friend : ${id}`);
        });
        this.peers[id].on('data',(data)=>{
            console.log(" "  + data);
        });
    }
    onBroadcast = (msg) => {
        this.appendMessage({msg: msg, sender: "Broadcast"});
    }
    changeRoom = (id) => {
        this.socket.emit('change-room', id);
    }
    appendMessage = (msg) => {
        const item = document.createElement('li');
        item.innerText = "[" + msg.sender + "] : " + msg.msg;
        document.getElementById("messages").appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    }
    sendMessage = (msg) => {
        this.socket.emit('message', msg);
    }
    onMessage = (payload) => {
        this.appendMessage({msg: payload.Message, sender: payload.User.Name});
    }
}