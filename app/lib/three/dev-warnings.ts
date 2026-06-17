import { setConsoleFunction } from "three";

if (import.meta.env.DEV) {
  setConsoleFunction((method, message, ...args) => {
    if (method === "warn" && typeof message === "string") {
      if (message.includes("Clock: This module has been deprecated")) {
        return;
      }
      if (
        message.includes("WebGLProgram: Program Info Log:") &&
        args.some(
          (a) => typeof a === "string" && a.includes("warning X4122"),
        )
      ) {
        return;
      }
    }

    (console[method] as (...params: unknown[]) => void)(message, ...args);
  });
}
