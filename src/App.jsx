import { useEffect, useState, useRef } from "react";
import AudioContext, { autoCorrelate } from "./contexts/AudioContext";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  useGLTF,
  Environment,
  Stars,
  useTexture,
  Text,
  Sparkles,
} from "@react-three/drei";

const LOW_FREQUENCY = 160;
const HIGH_FREQUENCY = 425;
const INTERPOLATION_FACTOR = 0.2;
const NUM_ASTEROIDS = 5;
const NUM_STARS = 30;
const timings = [1, 2, 3, 5, 8, 9, 10, 12, 14, 17, 18, 20, 23, 24, 25, 26, 28, 30, 31, 32, 33, 43, 44, 45, 46, 47, 48, 49, 50, 51];
const pitches = [246.94, 261.63, 261.63, 261.63, 261.63, 246.94, 261.63, 293.66, 261.63, 246.94, 261.63, 261.63, 261.63, 261.63, 246.94, 261.63, 293.66, 261.63, 246.94, 261.63, 220];
const y_values = pitches.map((x) => (-x + 260) * 2.4);

const audioContext = AudioContext.getAudioContext();
const analyser = audioContext.createAnalyser();

var frequency = 0;
var playerY = 0;
var score = 0;

var volume = 0;

function Player() {
  const ref = useRef();
  useFrame(({ clock }) => {
    const a = clock.getElapsedTime();
    if (frequency >= LOW_FREQUENCY && frequency <= HIGH_FREQUENCY) {
      const target = (-frequency + 260) * 2.4;
      ref.current.position.x = -400;
      if (volume > 20) {
        ref.current.position.y +=
          (target - ref.current.position.y) * INTERPOLATION_FACTOR;
      }
      ref.current.position.z = -600;
      playerY = ref.current.position.y;

      ref.current.rotation.x = Math.sin(a);
      ref.current.rotation.y = Math.cos(a);
      ref.current.rotation.z = Math.cos(a);
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

    if (Math.random() < 0.005) {
      reserved = false;
    }

    if (ref.current.position.x < -700) {
      reset(ref);
    }

    const distance = Math.abs(playerY - ref.current.position.y);

    if (
      ref.current.position.x >= -450 &&
      ref.current.position.x <= -350 &&
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

function Star({ id }) {
  const ref = useRef();

  const randomY = () => Math.random() * 200 - 50;

  let unused = true;
  const initialY = randomY();

  const reset = (ref) => {
    ref.current.position.x = 700;
    ref.current.position.y = randomY();
    unused = false;
  };

  useFrame(({ clock }) => {
    const a = clock.getElapsedTime();
    if (a > timings[id] / 3 && unused == true) {
      ref.current.position.x -= 20;
    }
    ref.current.position.y = y_values[id];
    ref.current.position.z = -600;

    if (ref.current.position.x < -700) {
      reset(ref);
    }

    const distance = Math.abs(playerY - ref.current.position.y);

    if (
      ref.current.position.x >= -440 &&
      ref.current.position.x <= -360 &&
      distance < 50
    ) {
      score++;
      reset(ref);
    }
  });

  return (
    <mesh ref={ref} position={[700, initialY, 0]}>
      <sphereGeometry args={[25, 25, 25]} />
      <meshStandardMaterial map={useTexture("/star.jpeg")} />
    </mesh>
  );
}

function ScoreText() {
  const mesh = useRef();
  const ref = useRef();
  useFrame(() => {
    ref.current.text = `Score: ${score}`;
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh}>
      <Text
        ref={ref}
        color="white"
        fontSize={0.5}
        position={[-5, 5, -15]}
      ></Text>
    </instancedMesh>
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
          console.log(frequency);
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
        {/* {[...Array(NUM_ASTEROIDS).keys()].map((i) => (
          <Asteroid key={i} />
        ))} */}
        {[...Array(NUM_STARS).keys()].map((i) => (
          <Star key={i} id={i}/>
        ))}
        <Sparkles opacity={0.4} color="cyan" />
        <ScoreText />
      </Canvas>
    </>
  );
}

export default App;
