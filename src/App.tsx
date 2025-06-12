import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  MeshReflectorMaterial,
  Shadow,
  BakeShadows,
  Trail,
} from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

interface AudioPillarProps {
  scale: number;
  position: [number, number, number];
  color: string;
}

// 音柱组件
function AudioPillar({ scale, position, color }: AudioPillarProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (mesh.current) {
      mesh.current.scale.y = scale;
    }
    if (trailRef.current) {
      trailRef.current.position.y = scale * 1.5;
    }
  });

  return (
    <group position={position}>
      <mesh ref={mesh}>
        <cylinderGeometry args={[0.2, 0.2, 3]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          transparent
          opacity={0.9}
        />
      </mesh>
      <Trail
        ref={trailRef}
        width={0.8}
        length={6}
        color={new THREE.Color(color)}
        attenuation={t => t * t}
      >
        <mesh>
          <sphereGeometry args={[0.15]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      </Trail>
    </group>
  );
}

interface SceneProps {
  audioData: () => Uint8Array;
}

// 音柱环
function Scene({ audioData }: SceneProps) {
  const [pillars, setPillars] = useState<
    Array<{
      key: number;
      scale: number;
      position: [number, number, number];
      color: string;
    }>
  >([]);

  useEffect(() => {
    const numPillars = 64;
    const pillars = [];
    for (let i = 0; i < numPillars; i++) {
      const angle = (i * Math.PI * 2) / numPillars;
      const position: [number, number, number] = [
        Math.cos(angle) * 5,
        0,
        Math.sin(angle) * 5,
      ];
      // 创建渐变色
      const hue = (i / numPillars) * 0.3 + 0.6; // 从紫色到蓝色的渐变
      const color = new THREE.Color().setHSL(hue, 1, 0.7).getStyle();
      pillars.push({
        key: i,
        scale: 1,
        position,
        color,
      });
    }
    setPillars(pillars);
  }, []);

  useFrame(() => {
    const data = audioData();
    setPillars(prevPillars =>
      prevPillars.map((pillar, i) => {
        const index = Math.floor((i * data.length) / prevPillars.length);
        const scale = 1 + (data[index] / 256) * 2;
        return { ...pillar, scale };
      })
    );
  });

  return (
    <group>
      {pillars.map(pillar => (
        <AudioPillar
          key={pillar.key}
          scale={pillar.scale}
          position={pillar.position}
          color={pillar.color}
        />
      ))}
    </group>
  );
}

// 湖面效果
function LakeSurface() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[30, 30]} />
      <MeshReflectorMaterial
        resolution={1024}
        mirror={0.5}
        blur={[1000, 1000]}
        mixBlur={1}
        mixStrength={0.5}
        color="#050505"
        metalness={0.8}
        roughness={0.2}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

// 粒子效果
function ParticleSystem() {
  const particles = useMemo(() => {
    const count = 100;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      arr[i] = (Math.random() - 0.5) * 2;
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          itemSize={3}
          args={[particles, particles.length / 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="hotpink" transparent />
    </points>
  );
}

// 星空背景
function StarField() {
  const stars = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // 在球体范围内随机分布星星
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      sizes[i] = Math.random() * 2;
    }

    return { positions, sizes };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          itemSize={3}
          args={[stars.positions, stars.positions.length / 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          itemSize={1}
          args={[stars.sizes, stars.sizes.length]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function App() {
  const audioContext = useRef<AudioContext | null>(null);
  const analyzer = useRef<AnalyserNode | null>(null);
  const audioData = useRef(new Uint8Array(256));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(stream => {
          audioContext.current = new AudioContext();
          const source = audioContext.current.createMediaStreamSource(stream);
          analyzer.current = audioContext.current.createAnalyser();
          source.connect(analyzer.current);
          analyzer.current.fftSize = 512;
        })
        .catch(err => {
          console.error('无法获取音频输入:', err);
        });
    }
  }, []);

  const getAudioData = useCallback(() => {
    if (analyzer.current) {
      analyzer.current.getByteFrequencyData(audioData.current);
      return audioData.current;
    }
    return new Uint8Array(256).fill(0);
  }, []);

  return (
    <div id="canvas-container" className="w-100vw h-100vh">
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 10, 50]} />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.4} />
        <StarField />
        <LakeSurface />
        <Scene audioData={getAudioData} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          enableRotate={true}
          maxPolarAngle={Math.PI}
          minPolarAngle={Math.PI / 3}
          minDistance={5}
          maxDistance={20}
          zoomSpeed={0.5}
        />
        <Shadow color="black" colorStop={0} opacity={0.5} fog />
        <BakeShadows />
      </Canvas>
    </div>
  );
}

export default App;
