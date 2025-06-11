import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div id="canvas-container" className="w-100vw h-100vh">
      <Canvas>
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshPhongMaterial />
        </mesh>
        <ambientLight intensity={0.1} />
        <directionalLight position={[0, 0, 5]} color="red" />
      </Canvas>
    </div>
  );
}

export default App;
