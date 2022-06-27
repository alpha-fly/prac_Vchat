const express = require ('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)

app.use('/', express.static('public'))

io.on('connection', (socket) => {
    socket.on('join', (roomId) => {
        // const roomClients = io.sockets.adapter.rooms[roomId] || {length:0}
        // const numberofClients = roomClients.length
        console.log(io.sockets.adapter.rooms)
        console.log(io.sockets.adapter.rooms[roomId])
        var clientsInRoom = io.sockets.adapter.rooms[roomId];
        var numberofClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
        // console.log(clientsInRoom, numberofClients)

        // these events are emitted only to the sender socket. 
        if (numberofClients === 0) {
            console.log (`Creating room ${roomId} and emitting room_created socket event`)
            socket.join(roomId)
            socket.emit('room_created', roomId)
        } else if (numberofClients === 1) {
            console.log(`Joining room ${roomId} and emitting room_joined socket event`)
            socket.join(roomId)
            socket.emit('room_joined', roomId)            
        } else {
            console.log(`Cant join room ${roomId}, emitting full_room socket event`)
            socket.emit ('full_room', roomId)            
        }
    })

    // these events are emitted to all the sockets to the same room EXCEPT the sender.
    socket.on ('start_call', (roomId) => {
        console.log (`Broadcasting start_call event to peers in room ${roomId}`)
        socket.broadcast.to(roomId).emit('start_call')
    })

    socket.on ('webrtc_offer', (event) => {
        console.log(`Broadcasting webrtc_offer event to peers in room ${event.roomId}`)    
    })

    socket.on('webrtc_answer', (event) => {
        console.log(`Broadcasting webrtc_answer event to peers in room ${event.roomId}`)
        socket.broadcast.to(event.roomId).emit('webrtc_answer', event.sdp)
    })

    socket.on('webrtc_ice_candidate', (event) => {
        console.log(`Broadcasting webrtc_ice_candidate event to peers in room ${event.roomId}`)
        socket.broadcast.to(event.roomId).emit('webrtc_ice_candidate',event) 
    })
})

server.listen(3000, () => {
    console.log('3000번 포트로 express 서버가 켜졌습니다.')
});