import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = true;
env.allowRemoteModels = true;
env.localModelPath = `${import.meta.env.BASE_URL}models/`;

type WorkerMessage =
  | { type: "init" }
  | { type: "transcribe"; chunkId: number; samples: Float32Array; language?: string };

type WorkerReply =
  | { type: "progress"; status: string; progress?: number }
  | { type: "ready" }
  | { type: "transcript"; chunkId: number; text: string }
  | { type: "error"; message: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: any = null;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const data = event.data;

  try {
    if (data.type === "init") {
      self.postMessage({ type: "progress", status: "loading-model" } satisfies WorkerReply);
      // v4.2 的 q8 量化 Whisper 与 ONNX Runtime 存在兼容问题，fp32 稳定可用
      transcriber = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny",
        {
          dtype: "fp32",
          device: "wasm",
        },
      );
      self.postMessage({ type: "ready" } satisfies WorkerReply);
      return;
    }

    if (data.type === "transcribe" && transcriber) {
      const result = await transcriber(data.samples, {
        language: data.language ?? "chinese",
        task: "transcribe",
      });
      self.postMessage({
        type: "transcript",
        chunkId: data.chunkId,
        text: (result?.text as string | undefined)?.trim() ?? "",
      } satisfies WorkerReply);
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "识别失败",
    } satisfies WorkerReply);
  }
};

export type { WorkerMessage, WorkerReply };
