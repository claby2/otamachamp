import { useEffect, useState } from "react";
import AudioContext, { autoCorrelate } from "./contexts/AudioContext";
import { Canvas, useFrame } from "@react-three/fiber";
import {useGLTF, Environment } from "@react-three/drei";

const audioContext = AudioContext.getAudioContext();
const analyser = audioContext.createAnalyser();

var array = new Float32Array(2048);

function Player({x}) {
  return (
    <mesh position={[x, 0, -150]}>
      <sphereGeometry args={[5, 64, 64]}/>
      <meshStandardMaterial color="red" />
    </mesh>
  );
}

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

  useEffect(() => {
    const start = async () => {
      const input = await getMicInput();
  
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
  
      const source = audioContext.createMediaStreamSource(input);
      setSource(source);
    };
    start();
  }, []);

  

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
      <Canvas shadows camera={{ fov: 60, position: [0, 0, 0]}}>
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.1} />
        <Environment preset="warehouse" />
        <Player x={frequency / 10}/>
      </Canvas>
    </>
  );
}

export default App;
