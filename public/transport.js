class transport {
    constructor(io, user) {
        this.socket = io;
        this.username = user;
        this.socket.on('room-changed', this.roomChanged);
        this.socket.on('message', this.onMessage);
        this.socket.on('rr', this.onRR);

    }

    onRR() {
        if (this.hasUserMedia()) {
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
                || navigator.mozGetUserMedia || navigator.msGetUserMedia;

            //get both video and audio streams from user's camera
            navigator.getUserMedia(
                {video: false, audio: true},
                function (stream) {
                const mediaStream = new MediaStream(stream);
                window.mediaStream = mediaStream;
                },
                function (err) {
            });

        }
    }

    onMessage(msg) {
        var item = document.createElement('li');
        item.textContent = "[" + msg.sender + "] : " + msg.msg;
        document.getElementById("messages").appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    }

    roomChanged() {
        document.getElementById("messages").innerHTML = "";
    }

    send(message) {
        this.socket.emit('message', {
            msg: message,
            sender: this.username,
        });
    }

    changeRoom(roomName) {
        console.log("Changing to " + roomName);
        this.socket.emit('control', {
            'room': roomName,
            'sender': username
        });
    }

    hasUserMedia() {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
            || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        return !!navigator.getUserMedia;
    }
}