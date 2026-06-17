import { a, useSpring } from "@react-spring/three";
import { useEffect, type ReactNode } from "react";

/** 3D 场景入场：@react-spring/three 弹簧缩放 */
export function SceneSpringEntry({ children }: { children: ReactNode }) {
  const [springs, api] = useSpring(() => ({
    scale: 0.92,
    config: { tension: 170, friction: 24 },
  }));

  useEffect(() => {
    api.start({ scale: 1 });
  }, [api]);

  return <a.group scale={springs.scale}>{children}</a.group>;
}
