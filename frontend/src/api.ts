import type { Session } from "./types";
export async function api<T>(
  path: string,
  options: RequestInit = {},
  session?: Session,
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(session ? { Authorization: "Bearer " + session.token } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    let detail = "Request failed. Please retry.";
    try {
      const body = await response.json();
      detail =
        typeof body.detail === "string"
          ? body.detail
          : "Please check the entered information.";
    } catch {
      /* no raw server output */
    }
    throw new Error(detail);
  }
  return response.json();
}
export function download(text: string, name: string) {
  const u = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  URL.revokeObjectURL(u);
}
