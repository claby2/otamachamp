import { useEffect, useState } from "react";
import AudioContext, { autoCorrelate } from "./contexts/AudioContext";

const audioContext = AudioContext.getAudioContext();
const analyser = audioContext.createAnalyser();

var array = new Float32Array(2048);

function App() {
  const [source, setSource] = useState(null);
  const [frequency, setFrequency] = useState(0);

  useEffect(() => {
    if (source) {
      source.connect(analyser);
    }
  }, [source]);

  const pollPitch = () => {
    analyser.getFloatTimeDomainData(array);

    const ac = autoCorrelate(array, audioContext.sampleRate);
    if (ac > -1) {
      setFrequency(parseFloat(ac.toFixed(2)));
    }
  };

  setInterval(pollPitch, 1);
  console.log(frequency);

  const start = async () => {
    const input = await getMicInput();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(input);
    setSource(source);
  };

  const getMicInput = () => {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
        latency: 0,
      },
    });
  };

  return (
    <>
      <button onClick={start}>Start</button>
    </>
  );
}

export default App;
