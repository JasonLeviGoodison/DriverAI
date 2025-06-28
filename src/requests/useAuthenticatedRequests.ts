import { AxiosRequestConfig } from "axios";
import { RequestType, RequestMap, urlMap } from "./requestRegistry";
import { useQuery, UseMutationResult, useMutation, UseQueryResult } from "@tanstack/react-query";
import { AuthContext } from "../contexts/AuthContext";
import { useContext } from "react";
import { axiosInstance } from "./http-client";
import env from "../../env.json";

export type QueryKeyFn<T> = (data: T) => string[];

// The HTTP agents and axios instance configuration has been moved to lib/http-client.ts
// The EventEmitter configuration has been moved to lib/event-emitter-config.ts

function useRequest(requireAuth: boolean = true) {
  const { getToken } = useContext(AuthContext);
  // const { toast } = useToast();

  const makeRequest = async <T extends RequestType>(
    requestType: T,
    data?: RequestMap[T]["request"],
    config: AxiosRequestConfig = {
      baseURL: process.env.NEXT_PUBLIC_API_URL,
    }
  ): Promise<RequestMap[T]["response"]> => {
    const url = urlMap[requestType];
    let headers = { ...config.headers };

    if (requireAuth) {
      const token = await getToken();
      headers = { ...headers, Authorization: `Bearer ${token}` };
    }

    try {
      const response = await axiosInstance<RequestMap[T]["response"]>(url, {
        ...config,
        headers,
        method: "POST",
        data,
      });
      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      // toast({
      //   title: "Request Error",
      //   description: errorMessage || "An error occurred while making the request.",
      //   variant: "destructive",
      //   duration: 5000,
      // });
      throw error;
    }
  };

  return makeRequest;
}

export function useQueryRequest<T extends RequestType>({
  requestType,
  data,
  config,
  queryKeyFn,
  options,
  requireAuth = true,
}: {
  requestType: T;
  queryKeyFn: QueryKeyFn<RequestMap[T]["request"]>;
  data: RequestMap[T]["request"];
  config?: AxiosRequestConfig;
  options?: {
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
    refetchInterval?: number;
    enabled?: boolean;
  };
  requireAuth?: boolean;
}): UseQueryResult<RequestMap[T]["response"], Error> {
  const makeRequest = useRequest(requireAuth);
  const queryKey = queryKeyFn(data);
  return useQuery<RequestMap[T]["response"], Error>({
    queryKey,
    queryFn: async () => {
      const response = await makeRequest(requestType, data, config);
      return response;
    },
    staleTime: options?.staleTime ?? 60 * 1000,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
    refetchInterval: options?.refetchInterval ?? 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useMutationRequest<T extends RequestType>({
  requestType,
  config,
  requireAuth = true,
}: {
  requestType: T;
  config?: AxiosRequestConfig;
  requireAuth?: boolean;
}): UseMutationResult<RequestMap[T]["response"], Error, RequestMap[T]["request"]> {
  const makeRequest = useRequest(requireAuth);

  return useMutation<RequestMap[T]["response"], Error, RequestMap[T]["request"]>({
    mutationFn: (data) => makeRequest(requestType, data, config),
  });
}

export function useStreamingRequest(requireAuth: boolean = true) {
  const { getToken } = useContext(AuthContext);
  // const { toast } = useToast();

  const makeStreamingRequest = async <T extends RequestType>(
    requestType: T,
    data?: RequestMap[T]["request"]
  ): Promise<ReadableStream<Uint8Array>> => {
    const baseURL = env.API_URL || "";
    const path = urlMap[requestType];
    const url = `${baseURL}${path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (requireAuth) {
      const token = await getToken();
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      // Fetch is better for streaming
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
      // toast({
      //   title: "Request Error",
      //   description: errorMessage || "An error occurred while making the request.",
      //   variant: "destructive",
      //   duration: 5000,
      // });
      throw error;
    }
  };

  return makeStreamingRequest;
}

export { useRequest };
