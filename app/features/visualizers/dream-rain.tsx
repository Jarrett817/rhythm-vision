import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { VisualizerProps } from "~/features/visualizers/catalog";

export function DreamRainScene({
  onCanvasReady,
}: VisualizerProps) {
  // 在场景组件内部定义所有使用 R3F hooks 的组件
  // 确保它们只在 Canvas 上下文中被实例化
  const SceneContent = () => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
      if (meshRef.current) {
        meshRef.current.rotation.x = state.clock.elapsedTime * 0.5;
        meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      }
    });

    return (
      <mesh ref={meshRef}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#6366f1" />
      </mesh>
    );
  };

  return (
    <Canvas
      className="size-full"
      camera={{ position: [0, 0, 5], fov: 55 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        onCanvasReady?.(gl.domElement);
      }}
    >
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <SceneContent />
    </Canvas>
  );
}
