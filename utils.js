var connections = {};
var requests = {};

function createPeerConnection(lasticecandidate) {
  configuration = { iceServers: [{ urls: "stun:stun.voipbuster.com" }] };

  try {
    peerConnection = new RTCPeerConnection(configuration);
  } catch (err) {
    addMessageToChat("", undefined, 'error: ' + err);
  }
  peerConnection.onicecandidate = (event) => {
    console.log("event", event)
    if (event.candidate != null) {
      console.log('new ice candidate');
    } else {
      console.log('all ice candidates');
      lasticecandidate();
    }
  };
  peerConnection.onconnectionstatechange = (event) => {
    console.log('handleconnectionstatechange', event);
  };
  peerConnection.oniceconnectionstatechange = (event) => {
    console.log('ice connection state: ' + event.target.iceConnectionState);
  };

  return peerConnection;
}

function datachannelopen() {
  console.log('datachannelopen');
  addMessageToChat("", undefined, 'Connection successful');
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
    console.log(chatMessage, data);

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
    console.log(chatMessage, data)
  }
}

function datachannelmessage(fromType, idx, message) {
  console.log('datachannelmessage', fromType, idx, message);
  text = message.data;
  addMessageToChat(fromType, idx, text);
}

const copyInputText = (id) => {
  var copyText = document.getElementById(id);

  copyText.select();
  copyText.setSelectionRange(0, 99999);

  navigator.clipboard.writeText(copyText.value);
}
