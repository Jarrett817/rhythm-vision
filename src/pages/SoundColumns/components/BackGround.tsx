import { BufferAttribute } from 'three';

const particlesCount = 2000;
const positions = new Float32Array(particlesCount * 3);

for (let i = 0; i < particlesCount * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 100;
}

export default function BackGround() {
  return (
    <points>
      <bufferGeometry
        attributes={{
          position: new BufferAttribute(positions, 3),
        }}
      />
      <pointsMaterial color={0xffffff} size={0.1} />
    </points>
  );
}
