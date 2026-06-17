import { AudioLayeredResponse } from "~/features/visualizers/shared/audio-response";
import type { AudioFeatures } from "~/lib/audio/types";
import type { RefObject } from "react";

/** Pixi / 非 R3F 场景里复用的音频响应器 */
export function createAudioResponse(featuresRef: RefObject<AudioFeatures>) {
  return new AudioLayeredResponse(featuresRef);
}

export { AudioLayeredResponse };
