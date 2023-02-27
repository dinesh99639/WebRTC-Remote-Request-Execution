let currentId = 0;
const peerName = '';
let dataChannel = undefined

function generateAnswer() {
  const id = currentId;

  console.log('generateAnswer');

  peerConnection = createPeerConnection(() => {
    console.log('last candidate');
    answer = peerConnection.localDescription;
  });

  peerConnection.ondatachannel = (event) => {
    console.log('ondatachannel');
    dataChannel = event.channel;
    connections[0].channels.data = dataChannel;
    dataChannel.onopen = () => console.log('Connection successful');
    dataChannel.onmessage = function (message) { datachannelmessage("host", id, message); }
  };

  offerText = null;
  offer = null;
  while (!offer) {
    try {
      offerText = prompt("Paste the connection message from host");
      offer = JSON.parse(offerText);
    }
    catch (e) {
      console.log(e)
    }
  }

  setRemotePromise = peerConnection.setRemoteDescription(offer);
  setRemotePromise.then(() => {
    console.log('setRemoteDescription success');

    createAnswerPromise = peerConnection.createAnswer();
    createAnswerPromise.then((answer) => {
      console.log('createAnswerDone');
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

        console.log('setLocalDescription success');

        await navigator.clipboard.writeText(JSON.stringify(answer));
        const isConfirmed = confirm(
          'Your connection data copied to your clipboard.\n' +
          'Click on OK button after your connection data pasted in host.'
        )
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
