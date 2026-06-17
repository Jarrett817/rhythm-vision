import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { VisualizerId } from "~/features/visualizers/catalog";

export function VisualizerSceneHost({
  visualizerId,
  children,
}: {
  visualizerId: VisualizerId;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={visualizerId}
        className="visualizer-viewport"
        initial={{ opacity: 0, scale: 1.015 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.985 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
