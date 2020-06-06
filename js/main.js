// 'use strict';

// streaming video only: "video: true"
const constraints = {
    video: true,
    audio: false
};

let stream = undefined;
let remoteStream = undefined;
let pc = undefined;
let remotePc = undefined;

const videoDOM = document.getElementById('video');
const remoteVideoDOM = document.getElementById('remoteVideo');


// // DOM Video Event Listeners
videoDOM.addEventListener('loadedmetadata', e => console.log(`${e.target.id} Width: ${e.target.videoWidth}px, Height: ${e.target.videoHeight}px.`));
remoteVideoDOM.addEventListener('loadedmetadata', e => console.log(`${e.target.id} Width: ${e.target.videoWidth}px, Height: ${e.target.videoHeight}px.`));
remoteVideoDOM.addEventListener('onresize', e => console.log(`${e.target.id} Width: ${e.target.videoWidth}px, Height: ${e.target.videoHeight}px.`));

// Action buttons.
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
// Set up initial action buttons status: disable call and hangup.
callButton.disabled = true;
hangupButton.disabled = true;

//Action Buttons Event Listeners
startButton.addEventListener('click', (e) => {
    // Initializes media stream.
    navigator.mediaDevices.getUserMedia(constraints)
        .then((mediaStream) => {
            stream = mediaStream;

            attachVideo(stream, videoDOM);

            callButton.disabled = false;
        })
        .catch((error) => {
            console.error(`navigator.getUserMedia error: ${error.toString()}.`);
        });
});

callButton.addEventListener('click', () => {
    callButton.disabled = true;
    hangupButton.disabled = false;

    // Get local media stream tracks.
    if (stream.getVideoTracks().length > 0) {
        console.warn(`Using video device: ${stream.getVideoTracks()[0].label}.`);
    }

    // Create peer connections
    pc = new RTCPeerConnection();

    // PeerConnection event listeners
    pc.onnegotiationneeded = () => {
        // Create offer to connect
        pc.createOffer()
            .then(offer => {
                return pc.setLocalDescription(offer);
            })
            .catch(error => {
                console.error(`Failed to create local session description (pc): ${error.toString()}.`)
                throw error;
            })
            .then((e) => {
                // send pc.localDescription to the peer
                // sendSignalingMessage({
                //     type: "offer",
                //     sdp: pc.localDescription
                // });

                // if (JSON.parse(e.data).sdp) {
                if (pc.localDescription) {
                    remotePc.setRemoteDescription(new RTCSessionDescription(pc.localDescription))
                        .then(() => {
                            console.log("remotePc.setRemoteDescription")
                            if (remotePc.remoteDescription.type === "offer") {
                                remotePc.createAnswer()
                                    .then(description => {
                                        remotePc.setLocalDescription(description)
                                            .then(() => console.log("remotePc.setLocalDescription"))
                                            .catch(error => console.error(`Failed to create local session description (remotePc): ${error.toString()}.`));

                                        // send remotePC.localDescription to the peer
                                        // sendSignalingMessage({
                                        //     type: "answer",
                                        //     sdp: remotePc.localDescription
                                        // });

                                        pc.setRemoteDescription(description)
                                            .then(() => console.log("pc.setRemoteDescription"))
                                            .catch(error => console.error(`Failed to create remote session description (pc): ${error.toString()}.`));
                                    })
                                    .catch(error => console.error(`Failed to create answer: ${error.toString()}.`));
                            }
                        })
                        .catch(error => console.error(`Failed to create remote session description (remotePc): ${error.toString()}.`));
                } else {
                    pc.addIceCandidate(new RTCIceCandidate(e.candidate))
                        .then(() => console.log("pc.addIceCandidate"))
                        .catch(e => console.error("Failure during addIceCandidate(): ", e.name));
                }

            })
            .catch(error => console.error(`Failed to create offer: ${error.toString()}.`));
    };

    pc.onicecandidate = e => {
        if (e.candidate) {
            // Send the candidate to the remote peer
            remotePc.addIceCandidate(new RTCIceCandidate(e.candidate))
                .then(() => console.log("remotePc.addIceCandidate"))
                .catch(e => console.error("Failure during addIceCandidate(): ", e.name));
        }
    }
    pc.oniceconnectionstatechange = e => console.warn(`pc ICE state: ${e.target.iceConnectionState}.`);

    // Create remote peer connections
    remotePc = new RTCPeerConnection();

    // // PeerConnection event listeners
    remotePc.onicecandidate = e => {
        if (e.candidate) {
            // Send the candidate to the remote peer            
        }
    }
    remotePc.oniceconnectionstatechange = e => console.warn(`remotePc ICE state: ${e.target.iceConnectionState}.`);
    remotePc.ontrack = e => {
        if (e.streams && e.streams[0]) {
            remoteStream = e.streams[0]

            if ('srcObject' in remoteVideoDOM) {
                remoteVideoDOM.srcObject = e.streams[0];
            } else {
                remoteVideoDOM.src = URL.createObjectURL(e.streams[0]);
            }
        } else {
            if (!remoteStream) {
                remoteStream = new MediaStream();
                attachVideo(remoteStream, remoteVideoDOM);
                remoteStream.addTrack(e.track);
            }
        }
    }

    // Add local stream to connection
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
});

hangupButton.addEventListener('click', () => {
    pc.close();
    remotePc.close();
    hangupButton.disabled = true;
    callButton.disabled = false;
    pc.onnegotiationneeded = undefined;
    pc.onicecandidate = undefined;
    pc.oniceconnectionstatechange = undefined;
    remotePc.onicecandidate = undefined;
    remotePc.oniceconnectionstatechange = undefined;
    remotePc.ontrack = undefined;
    pc = undefined;
    remotePc = undefined;
});


function attachVideo(stream, domElement) {
    if ('srcObject' in domElement) {
        domElement.srcObject = stream;
    } else {
        domElement.src = URL.createObjectURL(stream);
    }
}