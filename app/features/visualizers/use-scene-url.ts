import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import {
  getDefaultVisualizer,
  type VisualizerId,
  VISUALIZERS,
} from "~/features/visualizers/catalog";

export const SCENE_PARAM = "scene";

export function parseVisualizerId(value: string | null): VisualizerId | null {
  if (!value) return null;
  return VISUALIZERS.some((v) => v.id === value) ? (value as VisualizerId) : null;
}

/** 场景 id 与 URL search param 双向同步 */
export function useSceneUrl() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(SCENE_PARAM);
  const visualizerId = parseVisualizerId(raw) ?? getDefaultVisualizer();

  // 无效或缺失 param 时写回合法 id
  useEffect(() => {
    if (raw !== visualizerId) {
      setSearchParams({ [SCENE_PARAM]: visualizerId }, { replace: true });
    }
  }, [raw, visualizerId, setSearchParams]);

  const setVisualizerId = useCallback(
    (id: VisualizerId) => {
      setSearchParams({ [SCENE_PARAM]: id }, { replace: true });
    },
    [setSearchParams],
  );

  return { visualizerId, setVisualizerId };
}
