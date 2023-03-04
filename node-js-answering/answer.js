const http = require('http');
const { RTCPeerConnection } = require('wrtc');

const serverPort = 8080;

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});
function readLineAsync(message) {
  return new Promise((resolve, reject) => {
    readline.question(message, (answer) => {
      resolve(answer);
    });
  });
}

var peerConnection;
var connections = {};
var requests = {};

function createPeerConnection(lasticecandidate) {
  let peerConnection = null;
  configuration = { iceServers: [{ urls: "stun:stun.voipbuster.com" }] };

  peerConnection = new RTCPeerConnection(configuration);
  try {
  } catch (err) {
    addMessageToChat("", undefined, 'error: ' + err);
  }
  peerConnection.onicecandidate = (event) => {
    if (event.candidate != null) {
    } else {
      lasticecandidate();
    }
  };
  peerConnection.onconnectionstatechange = (event) => {
  };
  peerConnection.oniceconnectionstatechange = (event) => {
  };

  return peerConnection;
}

function getSenderName(fromType, id) {
  if (fromType === "host") return "Host";
  else if (fromType === "self") return "You"
  else if (fromType === "peer") return connections?.[id]?.name ?? '';
  else return "";
}

async function addMessageToChat(fromType, id, msg) {
  let chatMessage = '';

  if (fromType === "peer") {
    const request = JSON.parse(msg);

    const options = {
      cache: "no-cache",
      method: request.method,
    }
    const body = request?.data ?? request?.body;
    if (!!body) request.body = body;

    let status = null;
    const data = await fetch(request.url, options).then((res) => {
      try {
        status = res.status;
        return res.json();
      }
      catch (e) {
        return res.text();
      }
    });
    chatMessage = `${request.method.toUpperCase()} ${status} ${request.url}`;

    connections[id].channels.data.send(JSON.stringify({
      requestId: request.requestId,
      request: request,
      status: status,
      data: data
    }));

    const senderName = getSenderName(fromType, id);

    chatelement = document.getElementById('chatHistory');
    newchatentry = document.createElement("p");

    newchatentry.textContent = `${senderName}: ${!!chatMessage ? chatMessage : msg}`
    chatelement.appendChild(newchatentry);
    chatelement.scrollTop = chatelement.scrollHeight
  }
  else if (fromType === "host") {
    const response = JSON.parse(msg);
    const { requestId, request, status, data } = response;
    requests[requestId].resolve({
      ...response,
      json: () => response,
      text: () => JSON.stringify(response),
    })
    delete requests[requestId]

    chatMessage = `${request.method.toUpperCase()} ${status} ${request.url}`;
  }
}

function datachannelmessage(fromType, idx, message) {
  text = message.data;
  addMessageToChat(fromType, idx, text);
}

let currentId = 0;
const peerName = '';
let dataChannel = undefined

async function generateAnswer() {
  const id = currentId;

  peerConnection = createPeerConnection(() => {
    answer = peerConnection.localDescription;
  });

  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    connections[0].channels.data = dataChannel;
    dataChannel.onopen = () => {
      console.log('\nConnection successful\n');
    };
    dataChannel.onmessage = function (message) { datachannelmessage("host", id, message); }
  };

  offerText = null;
  offer = null;
  while (!offer) {
    try {
      offerText = await readLineAsync("Paste the connection message from host:");
      offer = JSON.parse(offerText);
      // readline.close();
    }
    catch (e) {
      console.log(e)
    }
  }

  setRemotePromise = peerConnection.setRemoteDescription(offer);
  setRemotePromise.then(() => {

    createAnswerPromise = peerConnection.createAnswer();
    createAnswerPromise.then((answer) => {
      setLocalPromise = peerConnection.setLocalDescription(answer);
      setLocalPromise.then(async () => {
        connections[currentId++] = {
          name: peerName,
          answer: offerText,
          connection: peerConnection,
          channels: {
            data: dataChannel
          }
        }

        console.clear();
        console.log("\nWebRTC Connection");
        console.log("\nOffer:", JSON.stringify(offerText));
        console.log("\nAnswer:", JSON.stringify(answer));
        // await readLineAsync("Press enter after your connection data pasted in host:");
      }, (reason) => {
        console.log('setLocalDescription failed', reason);
      });
    }, (reason) => {
      console.log('createAnswerFailed', reason);
    });
  }, (reason) => {
    console.log('setRemoteDescription failed', reason);
  });
}

const customWebSocketRequestSender = (url, options) => {
  const requestId = new Date().getTime();

  connections[0].channels.data.send(JSON.stringify({
    requestId: requestId,
    url: url,
    ...options
  }));

  return new Promise((resolve, reject) => {
    requests[requestId] = { resolve, reject };
  })
}

fetch = customWebSocketRequestSender;

generateAnswer()

http.createServer((req, res) => {
  let body = "";

  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  if (req.method === 'POST') {
    req.on('data', chunk => {
      body += chunk.toString()
    });
    req.on('end', async () => {
      console.log(body);
      const response = JSON.parse(body);
      res.end(JSON.stringify(await fetch(response.url, {
        ...response
      })));
    });
  }
}).listen(serverPort);

// If in case you are using browser, use this function to redirect the requests to the server
const initBrowser = () => {
  const port = 8080;
  const serverURL = `http://localhost:8080/${port}`;

  var fetchOriginal = fetch;

  fetch = (url, options) => {
    return fetchOriginal(serverURL, {
      method: "post",
      body: JSON.stringify({
        url: url,
        ...options
      })
    })
  }
}