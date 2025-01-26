import { NextRequest, NextResponse } from 'next/server';

function copyHeader(headerName: string, to: Headers, from: Headers) {
  const value = from.get(headerName);
  if (value) {
    to.set(headerName, value);
  }
}

async function handleRequest(request: NextRequest) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  const actualUrl = url.searchParams.get('actualUrl');
  
  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  try {
    const finalUrl = targetUrl === '[object Request]' ? actualUrl : targetUrl;

    if (!finalUrl) {
      throw new Error('No valid URL found');
    }

    const parsedUrl = new URL(finalUrl);
    const isPlayerScript = parsedUrl.pathname.includes('/player/');
    const isYouTubeApi = parsedUrl.pathname.includes('/youtubei/');
    
    const headers = new Headers({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': isPlayerScript ? '*/*' : 'application/json',
      'Accept-Language': 'en-US,en;q=0.5',
    });

    const headersToCopy = [
      'content-type',
      'range',
      'x-goog-visitor-id',
      'x-youtube-client-version',
      'x-youtube-client-name'
    ];

    for (const header of headersToCopy) {
      copyHeader(header, headers, request.headers);
    }

    if (isYouTubeApi) {
      headers.set('Content-Type', 'application/json');
    }
    
    const response = await fetch(parsedUrl, {
      method: request.method,
      headers,
      body: request.method === 'POST' ? await request.text() : undefined
    });

    if (!response.ok) {
      throw new Error(`YouTube request failed: ${response.status}`);
    }

    if (isPlayerScript) {
      const text = await response.text();
      return new NextResponse(text, {
        headers: {
          'Content-Type': 'application/javascript',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const responseHeaders = new Headers();
    const contentHeaders = [
      'content-length',
      'content-type',
      'content-disposition',
      'accept-ranges',
      'content-range'
    ];

    for (const header of contentHeaders) {
      copyHeader(header, responseHeaders, response.headers);
    }

    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const OPTIONS = () => new NextResponse(null, {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
  }
}); 