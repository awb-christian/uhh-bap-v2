
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let odooResponseHeaders: Record<string, string> = {};

  try {
    const { targetUrl, payload } = await request.json();

    if (!targetUrl || !payload) {
      return NextResponse.json({ error: 'Missing targetUrl or payload for proxy' }, { status: 400 });
    }

    // Validate targetUrl format (basic check)
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        return NextResponse.json({ error: 'Invalid targetUrl format. Must start with http:// or https://' }, { status: 400 });
    }
    
    const odooResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any other headers Odoo might expect, if necessary
      },
      body: JSON.stringify(payload),
      // Consider adding a timeout if Odoo server might be slow to respond
      // signal: AbortSignal.timeout(15000) // 15 seconds timeout
    });

    // Capture Odoo's response headers
    odooResponse.headers.forEach((value, key) => {
      odooResponseHeaders[key] = value;
    });

    // Attempt to parse JSON, but handle cases where Odoo might not send JSON (e.g. 502 Bad Gateway HTML page)
    let responseData;
    const contentType = odooResponse.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
        responseData = await odooResponse.json();
        // Add debug_headers to the successfully parsed JSON response
        if (typeof responseData === 'object' && responseData !== null) {
            responseData.debug_headers = odooResponseHeaders;
        } else {
            // If responseData is not an object (e.g. Odoo returned a string literal "null" as JSON)
            // Create an object to hold the debug headers
            responseData = { original_response: responseData, debug_headers: odooResponseHeaders };
        }
    } else {
        // If not JSON, it's likely an HTML error page from Odoo or an intermediary proxy
        const textResponse = await odooResponse.text();
        // Return a structured error if Odoo didn't respond with JSON
        // Use Odoo's status, but provide a clearer error message for non-JSON responses
        return NextResponse.json(
            { 
                error: `Odoo server responded with non-JSON content. Status: ${odooResponse.status} ${odooResponse.statusText}.`,
                details: textResponse.substring(0, 500), // Send a snippet of the non-JSON response
                debug_headers: odooResponseHeaders // Also include headers here
            }, 
            { status: odooResponse.status } // Forward Odoo's status
        );
    }
    
    // Forward Odoo's JSON response and status code
    return NextResponse.json(responseData, { status: odooResponse.status });

  } catch (error) {
    console.error('UHH Proxy API error:', error);
    let errorMessage = 'Proxy error occurred during request to Odoo.';
    let errorDetails = "";

    if (error instanceof Error) {
        errorMessage = error.message;
        if (error.name === 'AbortError') {
            errorMessage = 'Request to Odoo server timed out.';
        } else if (error.message.includes('ECONNREFUSED')) {
            // Attempt to parse targetUrl from request if available, otherwise use a generic message
            let reqBody;
            try {
                reqBody = await request.clone().json(); // Clone request to read body
            } catch (parseError) {
                // Ignore if body can't be parsed or isn't JSON
            }
            const targetUrlFromReq = reqBody?.targetUrl;
            if (targetUrlFromReq) {
                errorMessage = `Connection refused by Odoo server at ${targetUrlFromReq}. Ensure the server is running and the URL is correct.`;
            } else {
                 errorMessage = `Connection refused by Odoo server. Ensure the server is running and the URL is correct.`;
            }
        }
    }
    
    // It's important to let the client know if the proxy itself failed or failed to reach Odoo
    return NextResponse.json({ error: 'Proxy request failed', details: errorMessage, debug_headers: odooResponseHeaders }, { status: 500 });
  }
}
