import { errorResponseSchema } from "@veriqa/contracts";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Validate successful JSON and display the backend's useful validation errors.
export async function api<T>(path: string, schema: { parse(value: unknown): T }, options?: RequestInit) {
  const response = await fetch(`/api/demo${path}`, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(body);
    throw new ApiError(response.status, parsed.success ? parsed.data.error : "Request failed.");
  }
  return schema.parse(body);
}
