let ua = null;
let session = null;

const agentExtension = "caller2";   // ← CHANGE THIS
const domain = "callme.edialogue.cc"; // ← CHANGE THIS

const statusBox = document.getElementById("status");
const remoteAudio = document.getElementById("remoteAudio");
const callBtn = document.getElementById("callBtn");
const hangupBtn = document.getElementById("hangupBtn");

function updateStatus(msg) {
    statusBox.textContent = "Status: " + msg;
}

/* --------------------------
    SETUP USER AGENT
--------------------------- */
function createUA() {
    const socket = new JsSIP.WebSocketInterface(`wss://${domain}:7443`);

    const config = {
        sockets: [socket],
        uri: `sip:webrtc-${Date.now()}@${domain}`,  // temp identity
        password: "dummy", // FusionPBX will ignore PASSWORD because we won't REGISTER
        register: false,
        session_timers: false,
        hackIpInContact: true
    };

    ua = new JsSIP.UA(config);

    ua.on("connected", () => updateStatus("Ready"));
    ua.on("disconnected", () => updateStatus("Disconnected"));

    ua.on("newRTCSession", (e) => {
        session = e.session;

        session.on("accepted", () => updateStatus("In call"));
        session.on("ended", () => {
            updateStatus("Call Ended");
            hangupBtn.style.display = "none";
            callBtn.style.display = "inline-block";
        });
        session.on("failed", () => {
            updateStatus("Call Failed");
            hangupBtn.style.display = "none";
            callBtn.style.display = "inline-block";
        });

        // Handle remote audio
        session.connection.addEventListener("track", (ev) => {
            remoteAudio.srcObject = ev.streams[0];
        });
    });

    ua.start();
}

createUA();

/* --------------------------
      START CALL
--------------------------- */
callBtn.onclick = () => {
    const options = {
        mediaConstraints: { audio: true, video: false },
        pcConfig: {
            iceServers: [
                { urls: ["stun:stun.l.google.com:19302"] }
            ]
        }
    };

    updateStatus("Calling...");

    currentSession = ua.call(`sip:${agentExtension}@${domain}`, options);

    callBtn.style.display = "none";
    hangupBtn.style.display = "inline-block";
};

/* --------------------------
      HANGUP
--------------------------- */
hangupBtn.onclick = () => {
    if (session) session.terminate();
};


window.addEventListener("beforeunload", function () {
    if (session && !session.isEnded()) {
        try {
            session.terminate();
        } catch (e) {
            console.log("Terminate failed on unload");
        }
    }
});

window.addEventListener("unload", function () {
    if (session && !session.isEnded()) {
        try {
            session.terminate();
        } catch (e) {}
    }
});

