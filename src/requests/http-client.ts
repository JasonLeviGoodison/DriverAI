import axios from "axios";
import http from "http";
import https from "https";

/**
 * Configure HTTP and HTTPS agents with keepAlive to reuse connections
 * This helps prevent socket connection leaks and MaxListenersExceededWarning
 */
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000, // 60 seconds
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000, // 60 seconds
});

/**
 * Create a single axios instance for the entire application
 * This ensures consistent connection pool management
 */
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  httpAgent,
  httpsAgent,
  maxRedirects: 5,
  timeout: 30000, // 30 seconds
});

export { axiosInstance };
