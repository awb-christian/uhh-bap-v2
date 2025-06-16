
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Next.js API route handler for proxying requests to an Odoo server.
 * This helps bypass CORS issues when the frontend calls Odoo directly from the browser.
 * It also allows capturing and forwarding Odoo's response headers, especially 'Set-Cookie'.
 *
 * IMPORTANT: For production, ensure this proxy is secured. Consider:
 * - Restricting targetUrl patterns.
 * - Authentication/authorization for accessing this proxy endpoint itself if needed.
 * - Rate limiting.
 */
export async function POST(request: NextRequest) {
  let odooResponseHeaders: Record<string, string> = {};

  try {
    const { targetUrl, payload } = await request.json();

    if (!targetUrl || !payload) {
      return NextResponse.json({ error: 'Missing targetUrl or payload for proxy' }, { status: 400 });
    }

    // Basic validation for targetUrl to prevent open proxy vulnerabilities.
    // TODO: [Electron Main Process] Enhance this validation for production if needed (e.g., allowlist specific Odoo domains).
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        return NextResponse.json({ error: 'Invalid targetUrl format. Must start with http:// or https://' }, { status: 400 });
    }
    
    // Prepare headers for the Odoo request.
    // Forward 'Cookie' header from the original client request if it exists.
    // This is crucial if the client (e.g., browser after login) has a session_id cookie.
    const forwardedHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const requestCookie = request.headers.get('cookie');
    if (requestCookie) {
      forwardedHeaders['Cookie'] = requestCookie;
    }

    const odooResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: forwardedHeaders,
      body: JSON.stringify(payload),
      // TODO: [Electron Main Process] Consider adding a configurable timeout (e.g., 15-30 seconds)
      // signal: AbortSignal.timeout(15000) 
    });

    // Capture Odoo's response headers to forward them back to the client.
    // This is important for `Set-Cookie` (session_id).
    odooResponse.headers.forEach((value, key) => {
      odooResponseHeaders[key] = value;
    });

    let responseData;
    const contentType = odooResponse.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
        responseData = await odooResponse.json();
        // Add debug_headers to the successfully parsed JSON response
        if (typeof responseData === 'object' && responseData !== null) {
            responseData.debug_headers = odooResponseHeaders;
        } else {
            // If responseData is not an object (e.g. just `true` or a number), wrap it
            responseData = { original_response: responseData, debug_headers: odooResponseHeaders };
        }
    } else {
        const textResponse = await odooResponse.text();
        // Log this unexpected response format
        console.error(`UHH Proxy: Odoo server responded with non-JSON content. Status: ${odooResponse.status} ${odooResponse.statusText}. Content-Type: ${contentType}. Response snippet: ${textResponse.substring(0, 500)}`);
        return NextResponse.json(
            { 
                error: `Odoo server responded with non-JSON content. Status: ${odooResponse.status} ${odooResponse.statusText}.`,
                details: textResponse.substring(0, 500), // Snippet of the non-JSON response
                debug_headers: odooResponseHeaders 
            }, 
            { status: odooResponse.status } 
        );
    }
    
    // Forward Odoo's JSON response, status code, and captured headers.
    // NextResponse.json automatically stringifies the body.
    // We need to manually set the headers from odooResponseHeaders.
    const response = NextResponse.json(responseData, { status: odooResponse.status });
    Object.entries(odooResponseHeaders).forEach(([key, value]) => {
        // Do not attempt to set 'transfer-encoding' or 'content-encoding' as Next.js/Vercel handles this.
        if (key.toLowerCase() !== 'transfer-encoding' && key.toLowerCase() !== 'content-encoding') {
            response.headers.set(key, value);
        }
    });
    return response;

  } catch (error) {
    console.error('UHH Proxy API error:', error);
    let errorMessage = 'Proxy error occurred during request to Odoo.';
    // let errorDetails = ""; // Keep details minimal for client unless debugging

    if (error instanceof Error) {
        errorMessage = error.message; // General error message
        if (error.name === 'AbortError') { // Timeout
            errorMessage = 'Request to Odoo server timed out.';
        } else if (error.message.includes('ECONNREFUSED')) { // Connection refused
            // Potentially parse targetUrl from request if needed for detailed error, but avoid if sensitive
            errorMessage = `Connection refused by Odoo server. Ensure the server is running and the URL is correct.`;
        }
        // errorDetails = error.stack || ""; // Stack trace for server logs, not for client
    }
    
    // Return a generic error to the client for security.
    return NextResponse.json(
        { 
            error: 'Proxy request failed', 
            details: errorMessage, // Provide some detail for debugging on client if safe
            debug_headers: odooResponseHeaders // Include any headers captured before the error
        }, 
        { status: 500 } // Internal Server Error or Bad Gateway if Odoo is down
    );
  }
}
