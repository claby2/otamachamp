import { useEffect, useState, useRef } from "react";
import AudioContext, { autoCorrelate } from "./contexts/AudioContext";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment, Stars } from "@react-three/drei";

const LOW_FREQUENCY = 100;
const HIGH_FREQUENCY = 500;
const INTERPOLATION_FACTOR = 0.07;

const audioContext = AudioContext.getAudioContext();
const analyser = audioContext.createAnalyser();

var frequency = 0;
var volume = 0;

function Player() {
  const ref = useRef();
  useFrame(() => {
    if (frequency >= LOW_FREQUENCY && frequency <= HIGH_FREQUENCY) {
      const target = (-frequency + 200) * 1.5;
      ref.current.position.x = -400;
      if (volume > 160) {
        ref.current.position.y +=
          (target - ref.current.position.y) * INTERPOLATION_FACTOR;
      }
      ref.current.position.z = -600;
    }
  });

  const { scene } = useGLTF("/otamatone.glb");
  scene.traverse((child) => {
    if (child.isMesh) {
      child.material.color.set("cyan");
    }
  });

  return <primitive ref={ref} object={scene} />;
}

function App() {
  const [source, setSource] = useState(null);

  useEffect(() => {
    if (source) {
      source.connect(analyser);
    }
  }, [source]);

  setInterval(() => {
    const pollFrequency = () => {
      var array = new Float32Array(2048);
      analyser.getFloatTimeDomainData(array);
      const ac = autoCorrelate(array, audioContext.sampleRate);
      if (ac > -1) {
        let f = parseFloat(ac);
        if (f >= LOW_FREQUENCY && f <= HIGH_FREQUENCY) {
          frequency = f;
        }
      }
    };

    var array = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);
    const arraySum = array.reduce((a, b) => a + b, 0);
    volume = arraySum / array.length;

    pollFrequency();
  }, 10);

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
        <Player />
        <Stars />
      </Canvas>
    </>
  );
}

export default App;
