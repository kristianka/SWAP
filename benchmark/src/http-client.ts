import http from "http";
import https from "https";
import type { HttpResponse } from "./types.js";

export function request(
  baseUrl: string,
  method: string,
  path: string,
  body?: any,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl);
    const isHttps = url.protocol === "https:";
    const httpModule = isHttps ? https : http;

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "x-session-id": "benchmark",
      },
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers = {
        ...options.headers,
        "Content-Length": Buffer.byteLength(bodyStr).toString(),
      };
    }

    const req = httpModule.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode || 500, data: json });
        } catch (e) {
          resolve({ status: res.statusCode || 500, data: data });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}
