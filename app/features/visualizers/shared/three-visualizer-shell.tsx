import type { ReactNode } from "react";

/** 3D Canvas 外层：确保 R3F 获得明确的全屏尺寸 */
export function ThreeVisualizerShell({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 size-full">{children}</div>;
}
