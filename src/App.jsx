import { useEffect, useState, useRef } from "react";
import AudioContext, { autoCorrelate } from "./contexts/AudioContext";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment, Stars, useTexture } from "@react-three/drei";

const LOW_FREQUENCY = 160;
const HIGH_FREQUENCY = 425;
const INTERPOLATION_FACTOR = 0.07;
const NUM_ASTEROIDS = 10;

const audioContext = AudioContext.getAudioContext();
const analyser = audioContext.createAnalyser();

var frequency = 0;
var playerY = 0;
var score = 0;

var volume = 0;

function Player() {
  const ref = useRef();
  useFrame(() => {
    if (frequency >= LOW_FREQUENCY && frequency <= HIGH_FREQUENCY) {
      const target = (-frequency + 260) * 2.4;
      ref.current.position.x = -400;
      if (volume > 20) {
        ref.current.position.y +=
          (target - ref.current.position.y) * INTERPOLATION_FACTOR;
      }
      ref.current.position.z = -600;
      playerY = ref.current.position.y;
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

function Asteroid() {
  const ref = useRef();

  const randomY = () => Math.random() * 200 - 50;

  let reserved = true;
  const initialY = randomY();

  const reset = (ref) => {
    ref.current.position.x = 700;
    ref.current.position.y = randomY();
    reserved = true;
  };

  useFrame(({ clock }) => {
    const a = clock.getElapsedTime();
    if (!reserved) {
      ref.current.position.x -= 6;
    }
    ref.current.position.y -= Math.sin(a + initialY);
    ref.current.position.z = -600;

    if (Math.random() < 0.01) {
      reserved = false;
    }

    if (ref.current.position.x < -700) {
      reset(ref);
    }

    const distance = Math.abs(playerY - ref.current.position.y);

    if (
      ref.current.position.x >= -600 &&
      ref.current.position.x <= -400 &&
      distance < 50
    ) {
      score--;
      reset(ref);
    }
  });

  return (
    <mesh ref={ref} position={[700, initialY, 0]}>
      <sphereGeometry args={[25, 25, 25]} />
      <meshStandardMaterial map={useTexture("/asteroid.png")} />
    </mesh>
  );
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
        {[...Array(NUM_ASTEROIDS).keys()].map((i) => (
          <Asteroid key={i} />
        ))}
      </Canvas>
    </>
  );
}

export default App;
