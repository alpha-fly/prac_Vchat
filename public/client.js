// DOM elements.
const roomSelectionContainer = document.getElementById('room-selection-container')
const roomInput = document.getElementById('room-input') 
const connectButton = document.getElementById('connect-button')

const videoChatContainer = document.getElementById('video-chat-container')
const localVideoComponent = document.getElementById('local-video')
const remoteVideoComponent = document.getElementById('remote-video')

// Variables.
const socket = io()
const mediaConstraints = {
  audio: true,
  video: { width: 1280, height: 720 },
}
let localStream
let remoteStream
let isRoomCreator
let rtcPeerConnection // Connection between the local device and the remote peer.
let roomId

// Free public STUN servers provided by Google.
const iceServers = {
  'iceServers': [
    { 'urls' : 'stun:stun.l.google.com:19302' },
    { 'urls' : 'stun:stun1.l.google.com:19302' },
    { 'urls' : 'stun:stun2.l.google.com:19302' },
    { 'urls' : 'stun:stun3.l.google.com:19302' },
    { 'urls' : 'stun:stun4.l.google.com:19302' },
  ],
}

// BUTTON LISTENER ============================================================
connectButton.addEventListener('click', () => {
  joinRoom(roomInput.value) 
})

// SOCKET EVENT CALLBACKS =====================================================
socket.on('room_created', async () => {
  console.log('Socket event callback: room_created')

  await setLocalStream(mediaConstraints)
  isRoomCreator = true
})

socket.on('room_joined', async () => {
  console.log('Socket event callback: room_joined')

  await setLocalStream(mediaConstraints)
  socket.emit('start_call', roomId)
})

socket.on('full_room', () => {
  console.log('Socket event callback: full_room')

  alert('The room is full, please try another one')
})


socket.on('start_call', async () => {
    console.log('Socket event callback: start_call')
  
    if (isRoomCreator) {
      rtcPeerConnection = new RTCPeerConnection(iceServers)

      console.log(rtcPeerConnection) // 여기서 값 제대로 안들어있음.


      try {
      addLocalTracks(rtcPeerConnection)
      rtcPeerConnection.ontrack = setRemoteStream
      rtcPeerConnection.onicecandidate = sendIceCandidate
      await createOffer(rtcPeerConnection)
    } catch (error) {
      console.error(error)
    }
    }



  })
  
  socket.on('webrtc_offer', async (event) => {
    console.log('Socket event callback: webrtc_offer')
  
    if (!isRoomCreator) {
      rtcPeerConnection = new RTCPeerConnection(iceServers)

      console.log(rtcPeerConnection)

      addLocalTracks(rtcPeerConnection)
      rtcPeerConnection.ontrack = setRemoteStream
      rtcPeerConnection.onicecandidate = sendIceCandidate
      rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))

      console.log(rtcPeerConnection)
      await createAnswer(rtcPeerConnection)
    }
  })
  
  socket.on('webrtc_answer', (event) => {
    console.log('Socket event callback: webrtc_answer')
  
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
  })
  
  socket.on('webrtc_ice_candidate', (event) => {
    console.log('Socket event callback: webrtc_ice_candidate')
  
    // ICE candidate configuration.
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: event.label,
      candidate: event.candidate,

    })    
    console.log(rtcPeerConnection) // 얘가 undefined

    rtcPeerConnection.addIceCandidate(candidate)    
  })

// FUNCTIONS ==================================================================
function joinRoom(room) {
  // 아래 InterviewCodes는, 나중에 DB에서 가져오는 것으로 변경한다. 
  const InterviewCodes = ["132132", "258013", "488256", "132456"]

  if (room === '') {
    alert('인터뷰 코드를 입력해주세요.')

  } else if (!InterviewCodes.includes(room)) {
    alert('올바른 인터뷰 코드가 아닙니다.')    

  } else {
    roomId = room 
    socket.emit('join', room)
    showVideoConference()
  }
}

function showVideoConference() {
  roomSelectionContainer.style = 'display: none'
  videoChatContainer.style = 'display: block'
}

async function setLocalStream(mediaConstraints) {
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
  } catch (error) {
    console.error('Could not get user media', error)
  }

  localStream = stream
  localVideoComponent.srcObject = stream
}

function addLocalTracks(rtcPeerConnection) {
    localStream.getTracks().forEach((track) => {
      rtcPeerConnection.addTrack(track, localStream)

      console.log(rtcPeerConnection)
    })
  }
  
  async function createOffer(rtcPeerConnection) {
    let sessionDescription
    try {
      sessionDescription = await rtcPeerConnection.createOffer()
      rtcPeerConnection.setLocalDescription(sessionDescription)
    } catch (error) {
      console.error(error)
    }
  
    socket.emit('webrtc_offer', {
      type: 'webrtc_offer',
      sdp: sessionDescription,
      roomId,
    })
  }
  
  async function createAnswer(rtcPeerConnection) {
    let sessionDescription
    try {
      sessionDescription = await rtcPeerConnection.createAnswer()
      rtcPeerConnection.setLocalDescription(sessionDescription)
    } catch (error) {
      console.error(error)
    }
  
    socket.emit('webrtc_answer', {
      type: 'webrtc_answer',
      sdp: sessionDescription,
      roomId,
    })
  }
  
  function setRemoteStream(event) {
    remoteVideoComponent.srcObject = event.streams[0]
    remoteStream = event.stream
  }
  
  function sendIceCandidate(event) {
    if (event.candidate) {
      socket.emit('webrtc_ice_candidate', {
        roomId,
        label: event.candidate.sdpMLineIndex,
        candidate: event.candidate.candidate,
      })
    }
  }
