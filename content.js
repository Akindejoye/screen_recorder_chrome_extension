console.log('Hi, I have been injected');

let recorder = null;
const chunks = [];
let recordingId = null;

function onAccessApproved(stream) {
  recorder = new MediaRecorder(stream);

  recorder.start(1000);

  recorder.onstop = function (event) {
    console.log(event, 'Recording Stopped');
    stream.getTracks().forEach(function (track) {
      if (track.readyState === "live") {
        track.stop();
      }
    });

    // After stopping, send all the chunks to the backend
    sendChunksToBackend();
  };

  const backendEndpoint = 'https://movie-upload-hngx.onrender.com/recordings/upload'; // Replace with your backend endpoint

  recorder.ondataavailable = function(event) {
    if (event.data.size > 0) {
      chunks.push(event.data);
      let index = Math.floor(event.timeStamp);
      console.log(event, index);

      // Call the function to save the chunk locally
    // saveChunkLocally(event.data);
    sendChunksToBackend(event.data, index, 'true');
    }
  };

  function saveChunkLocally(chunk) {
    // Save the chunk as a file
    const blob = new Blob([chunk], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chunk-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function sendChunksToBackend(data, index, recording) {

    if (recordingId === null) {
      return;
    }
    const formData = new FormData();
  
    formData.append('recordingId', recordingId);  // Update recordingId
    formData.append('hasNextChunk', recording);  // Update hasNextChunk
    formData.append('index', index); 
    formData.append('data', data); // Update index
  
    // for (let i = 0; i < chunks.length; i++) {
    //   formData.append('data', chunks[i]);
    // }
  
    try {
      const response = await fetch(backendEndpoint, {
        method: 'POST',
        body: formData,
      });
  
      if (response.ok) {
        console.log('All chunks successfully sent to the backend.');
      } else {
        console.error('Failed to send chunks to the backend.');
      }
    } catch (error) {
      console.error('Error sending chunks to the backend:', error);
    }
  }  
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "request_recording") {
    console.log("requesting recording");

    sendResponse(`processed: ${message.action}`);

    navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: {
        width: 9999999999,
        height: 9999999999
      }
    }).then((stream) => {
      // Generate a unique recording ID for this session
      recordingId = Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      onAccessApproved(stream);
    })
  }

  if (message.action === "stopvideo") {
    console.log("stopping video");
    sendResponse(`processed: ${message.action}`);
    if (!recorder) return console.log("no recorder");

    recorder.stop();
  }
});