import { AxiosRequestConfig } from "axios";
import { RequestType, RequestMap, urlMap } from "../src/requests/requestRegistry";
import { axiosInstance } from "../src/requests/http-client";
import authService from "./AuthService";

// Non-hook authenticated request function for Electron
export async function makeAuthenticatedRequest<T extends RequestType>(
  requestType: T,
  data?: RequestMap[T]["request"],
  config: AxiosRequestConfig & { signal?: AbortSignal } = {},
  requireAuth: boolean = true
): Promise<RequestMap[T]["response"]> {
  const url = urlMap[requestType];
  let headers = { ...config.headers };

  if (requireAuth) {
    try {
      // Get token directly from AuthService
      await authService.refreshTokens();
      const token = authService.getAccessToken();
      if (token) {
        headers = { ...headers, Authorization: `Bearer ${token}` };
      }
    } catch (error) {
      console.error("Failed to get authentication token:", error);
      throw new Error("Authentication failed");
    }
  }

  try {
    const response = await axiosInstance<RequestMap[T]["response"]>(url, {
      ...config,
      headers,
      method: "POST",
      data,
      // Handle AbortSignal for fetch-style cancellation
      ...(config.signal && { signal: config.signal }),
    });
    return response.data;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("Request Error:", errorMessage);
    throw error;
  }
}

// Non-hook streaming request function
export async function makeAuthenticatedStreamingRequest<T extends RequestType>(
  requestType: T,
  data?: RequestMap[T]["request"],
  requireAuth: boolean = true
): Promise<ReadableStream<Uint8Array>> {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "";
  const path = urlMap[requestType];
  const url = `${baseURL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requireAuth) {
    try {
      //await authService.refreshTokens();
      const token = authService.getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Failed to get authentication token:", error);
      throw new Error("Authentication failed");
    }
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stream. Status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("ReadableStream not found in the response");
    }

    return response.body;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("Streaming Request Error:", errorMessage);
    throw error;
  }
}
