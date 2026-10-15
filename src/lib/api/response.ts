type NativeJson = Awaited<ReturnType<Response["json"]>>;

export class ApiResponseError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiResponseError";
  }
}

/**
 * Parses an API response without leaking the browser's opaque JSON parser
 * errors into the UI. Vercel/network failures can legitimately produce an
 * empty or HTML response, even when an endpoint normally returns JSON.
 */
export async function readJson<T = NativeJson>(response: Response): Promise<T> {
  const text = await response.text();
  const status = response.status || 500;

  if (!text.trim()) {
    throw new ApiResponseError(
      response.ok
        ? "The server returned an empty response. Please try again."
        : `The request failed without a response (HTTP ${status}). Please try again.`,
      status,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiResponseError(
      response.ok
        ? "The server returned an invalid response. Please try again."
        : `The request failed with an invalid response (HTTP ${status}). Please try again.`,
      status,
    );
  }
}

