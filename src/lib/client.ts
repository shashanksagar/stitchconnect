export async function api<T>(url: string, method = "GET", data?: unknown): Promise<T> {
  const response = await fetch(url, {
    method, headers: data instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : data instanceof FormData ? data : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}
export function errorText(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please retry."; }
export async function uploadImage(file: File) {
  if (file.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choose a JPEG, PNG, or WebP image up to 5 MB.");
  const form = new FormData();
  form.set("file", file);
  return api<{ id: string; url: string }>("/api/uploads", "POST", form);
}
