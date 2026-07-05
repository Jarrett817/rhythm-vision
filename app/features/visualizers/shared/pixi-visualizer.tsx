import { Application } from "pixi.js";
import { motion } from "motion/react";
import { useEffect, useRef, type RefObject } from "react";
import type { AudioFeatures } from "~/lib/audio/types";
import type { VisualizerProps } from "~/features/visualizers/catalog";

type PixiSetup = (
  app: Application,
  featuresRef: RefObject<AudioFeatures>,
  intensityRef: RefObject<number>,
) => void | (() => void);

function safeDestroyApp(app: Application) {
  try {
    app.ticker.stop();
    app.canvas?.remove();
    app.destroy(true);
  } catch {
    // init 未完成或 StrictMode 重复卸载时，插件可能未就绪
  }
}

export function PixiVisualizer({
  featuresRef,
  intensity,
  onCanvasReady,
  setup,
  bg = "#050508",
}: VisualizerProps & { setup: PixiSetup; bg?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const setupRef = useRef(setup);
  const onCanvasReadyRef = useRef(onCanvasReady);
  const intensityRef = useRef(intensity);

  setupRef.current = setup;
  onCanvasReadyRef.current = onCanvasReady;
  intensityRef.current = intensity;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let app: Application | null = null;
    let teardown: (() => void) | undefined;
    let resizeObserver: ResizeObserver | undefined;

    const initPromise = (async () => {
      const application = new Application();
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      await application.init({
        width,
        height,
        background: bg,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
      });

      if (disposed) {
        safeDestroyApp(application);
        return;
      }

      app = application;
      application.canvas.style.display = "block";
      application.canvas.style.width = "100%";
      application.canvas.style.height = "100%";
      container.appendChild(application.canvas);
      onCanvasReadyRef.current?.(application.canvas as HTMLCanvasElement);

      resizeObserver = new ResizeObserver(() => {
        if (!app || disposed) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) app.renderer.resize(w, h);
      });
      resizeObserver.observe(container);

      const setupCleanup = setupRef.current(
        application,
        featuresRef,
        intensityRef,
      );
      teardown = () => {
        setupCleanup?.();
        resizeObserver?.disconnect();
      };
    })();

    return () => {
      disposed = true;
      void initPromise.finally(() => {
        teardown?.();
        if (app) {
          safeDestroyApp(app);
          app = null;
        }
        container.replaceChildren();
      });
    };
  }, [bg, featuresRef]);

  return (
    <motion.div
      ref={containerRef}
      className="absolute inset-0 size-full min-h-0 min-w-0"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
