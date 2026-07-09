import { useMemo } from "react";
import * as THREE from "three";
import { BackSide } from "three";

/**
 * 舞台渐变天幕：一个从内部观察的大球，顶点着色做垂直渐变。
 * 比纯 <color> 背景更有空间纵深，替代"漂在虚空"的纯黑感。
 */
export function GradientBackdrop({
  top = "#05040f",
  bottom = "#1a1230",
  horizon,
  radius = 60,
}: {
  top?: string;
  bottom?: string;
  /** 可选：地平线附近的强调色（介于 top 与 bottom 之间） */
  horizon?: string;
  radius?: number;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, 32, 24);
    const topColor = new THREE.Color(top);
    const bottomColor = new THREE.Color(bottom);
    const horizonColor = horizon ? new THREE.Color(horizon) : null;

    const pos = geo.attributes.position!;
    const colors = new Float32Array(pos.count * 3);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      // 归一化高度 0(底)~1(顶)
      const h = (pos.getY(i) / radius + 1) / 2;
      if (horizonColor) {
        // 底 → 地平线 → 顶 三段渐变
        if (h < 0.5) {
          tmp.copy(bottomColor).lerp(horizonColor, h / 0.5);
        } else {
          tmp.copy(horizonColor).lerp(topColor, (h - 0.5) / 0.5);
        }
      } else {
        tmp.copy(bottomColor).lerp(topColor, h);
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [top, bottom, horizon, radius]);

  return (
    <mesh geometry={geometry} scale={[1, 1, 1]}>
      <meshBasicMaterial
        vertexColors
        side={BackSide}
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  );
}
