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
        this.audios = document.getElementById("players");
    }
    peers = []
    servers = {
        "iceServers": [
            {
                url: "stun:stun.l.google.com:19302"
            },
            {
                url: 'turn:80.82.77.124:3478?transport=udp',
                credential: 'koorosh',
                username: '123456'
            }
        ]
    }
    localMedia = null ;
    getMedia = async ()=>{
        this.localMedia = await navigator.mediaDevices.getUserMedia({ audio: {
                autoGainControl: false,
                channelCount: 2,
                echoCancellation: true,
                latency: 0,
                noiseSuppression: true,
                sampleRate: 48000,
                sampleSize: 16,
                volume: 0.9
            }
        });
        window.stream = this.localMedia;
    }
    onRemovedPeers = (id)=>{
        let audioEl = document.getElementById(id)
        if (audioEl) {

            const tracks = audioEl.srcObject.getTracks();

            tracks.forEach(function (track) {
                track.stop();
            })

            audioEl.srcObject = null;
            audioEl.parentNode.removeChild(audioEl);
        }
        if (this.peers[id])
            this.peers[id].destroy();
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
            stream : this.localMedia,
            iceTransportPolicy: 'relay',
            sdpTransform : (sdp)=>{
                console.log(`SDP IS : ${sdp}`);
                return sdp;
            }
        });
        this.peers[id].on('signal',data => {
            socket.emit('signal', {
                signal: data,
                socket_id: id
            });
        });

        this.peers[id].on('stream', stream => {
            let audioEl = document.createElement('audio')
            audioEl.srcObject = stream
            audioEl.id = id
            audioEl.className = "aud"
            this.audios.appendChild(audioEl)
            audioEl.play();
        });
        this.peers[id].on('connect', () => {
            console.log(`Peer ${id} Connected`);
            this.peers[id].send(`Hello Friend : ${id}`);
        });
        this.peers[id].on('data',(data)=>{
            console.info(">>>>>>>>>>>>>>>"  + data);
        });
        this.peers[id].on('close', () => {
           this.onRemovedPeers(id);
        });
        this.peers[id].on('error', (err) => {
            console.error(err);
        })
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