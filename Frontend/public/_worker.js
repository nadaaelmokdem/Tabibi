export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Intercept /api/ and /hubs/ requests
    if (url.pathname.includes("/api/") || url.pathname.includes("/hubs/")) {
      const BACKEND_ORIGIN = "https://tabibi.tryasp.net";
      const targetUrl = new URL(url.pathname + url.search, BACKEND_ORIGIN);

      // --- FIX A: Handle CORS Preflight (OPTIONS) Requests immediately ---
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400",
            
          },
        });
      }

      // --- FIX B: Safe Request Setup ---
      const newHeaders = new Headers(request.headers);
      newHeaders.set("host", "tabibi.tryasp.net");

      // Build safe forward parameters
      const init = {
        method: request.method,
        headers: newHeaders,
        redirect: "manual",
      };

      // Only pass body for non-GET/HEAD methods to prevent empty stream errors
      if (request.method !== "GET" && request.method !== "HEAD") {
        // Clone the request body correctly to prevent locking issues
        init.body = request.clone().body;
      }

      const proxyRequest = new Request(targetUrl, init);

      try {
        const response = await fetch(proxyRequest);
        
        // Clone the response so we can modify the headers to include proper CORS
        const newResponseHeaders = new Headers(response.headers);
        newResponseHeaders.set("Access-Control-Allow-Origin", request.headers.get("Origin") || "*");
        newResponseHeaders.set("Access-Control-Allow-Credentials", "true");
        newResponseHeaders.set("X-Proxy-Debug", "worker-ran"); // temporary

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newResponseHeaders,
        });

      } catch (err) {
        return new Response(`Proxy Error: ${err.message}`, { status: 502 });
      }
    }

    // 2. Fallback: Serve static assets
    return env.ASSETS.fetch(request);
  }
};