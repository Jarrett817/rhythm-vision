import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  AudioLoader,
  AudioListener,
  Audio,
  AudioAnalyser,
  BoxGeometry,
} from 'three';
import { useEffect, useRef } from 'react';
import music from '@/assets/test-music.mp3';
import { getRandomColor } from '@/utils';
import { OrbitControls } from '@react-three/drei';

const size = 64;

const angleStep = (Math.PI * 2) / size; // 64个音柱

function ColumnGroups() {
  const columns = [];
  for (let i = 0; i < size / 2; i++) {
    const angle = angleStep * i;
    const x = Math.cos(angle);
    const z = Math.sin(angle);
    columns.push({ x, z, angle });
  }
  return (
    <group>
      {columns.map(({ x, z, angle }, index) => {
        return (
          <mesh
            key={index}
            position={[x, 0, z]}
            scale={[0.5, 0.3, 0.5]}
            rotateY={-angle}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshPhongMaterial
              color={getRandomColor()}
              emissive={0x444444}
              shininess={100}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Scene() {
  const audioRef = useRef<Audio>(null);
  const audioListenerRef = useRef<AudioListener>(null);
  const { camera } = useThree();
  const audioAnalyserRef = useRef<AudioAnalyser>(null);
  useEffect(() => {
    const audioLoader = new AudioLoader();
    audioLoader.load(music, audioBuffer => {
      audioListenerRef.current = new AudioListener();

      const audio = new Audio(audioListenerRef.current);
      audio.setBuffer(audioBuffer);
      audio.setVolume(1);
      audio.setLoop(true);
      camera.add(audioListenerRef.current);

      audioAnalyserRef.current = new AudioAnalyser(audio);

      audioRef.current = audio;
    });
  }, [camera]);
  useFrame(() => {
    if (!audioAnalyserRef.current) return;
    const data = audioAnalyserRef.current.getFrequencyData();
    const average = audioAnalyserRef.current.getAverageFrequency();

    // 根据音频数据调整相机位置
    camera.position.z = 5 + (average / 255) * 2;
    camera.position.y = Math.sin(Date.now() * 0.001) * (average / 255);
    camera.lookAt(0, 0, 0);
    console.log(average);
  });

  return (
    <>
      {/* 环境光 */}
      <ambientLight color={0x404040} />
      {/* 方向光 */}
      <directionalLight
        color={0xffffff}
        intensity={1}
        position={[10, 10, 10]}
      />
      <ColumnGroups />
    </>
  );
}

export default function SoundColumns() {
  return (
    <Canvas>
      <OrbitControls />
      <Scene />
    </Canvas>
  );
}
