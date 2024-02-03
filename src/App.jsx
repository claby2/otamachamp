import { useEffect, useState } from "react";
import AudioContext, { autoCorrelate } from "./contexts/AudioContext";
import { Canvas } from "@react-three/fiber";
import { useGLTF, Environment, Stars, Sparkles } from "@react-three/drei";

const LOW_FREQUENCY = 100;
const HIGH_FREQUENCY = 500;
const INTERPOLATION_FACTOR = 0.07;

const audioContext = AudioContext.getAudioContext();
const analyser = audioContext.createAnalyser();

var array = new Float32Array(2048);

function Player({ position, setPosition, target }) {
  const { scene } = useGLTF("/otamatone.glb");
  scene.traverse((child) => {
    if (child.isMesh) {
      child.material.color.set("cyan");
    }
  });
  setPosition(position + (target - position) * INTERPOLATION_FACTOR);

  return <primitive position={[-400, position, -600]} object={scene} />;
}

function App() {
  const [source, setSource] = useState(null);
  const [frequency, setFrequency] = useState(0);
  const [playerPosition, setPlayerPosition] = useState(0);

  useEffect(() => {
    if (source) {
      source.connect(analyser);
    }
  }, [source]);

  const pollPitch = () => {
    analyser.getFloatTimeDomainData(array);

    const ac = autoCorrelate(array, audioContext.sampleRate);
    if (ac > -1) {
      const frequency = parseFloat(ac);
      if (frequency >= LOW_FREQUENCY && frequency <= HIGH_FREQUENCY) {
        setFrequency(frequency);
      }
    }
  };

  setInterval(pollPitch, 1000);

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
      <Canvas shadows camera={{ fov: 60, position: [0, 0, 0] }}>
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.1} />
        <Environment preset="warehouse" />
        <Player
          position={playerPosition}
          setPosition={setPlayerPosition}
          target={(-frequency + 200) * 1.5}
        />
        <Stars />
        <Sparkles />
      </Canvas>
    </>
  );
}

export default App;
