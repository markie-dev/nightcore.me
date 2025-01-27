/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

const cookies = process.env.YOUTUBE_COOKIES 
  ? JSON.parse(process.env.YOUTUBE_COOKIES)
  : [];

const requestOptions = {
  agent: ytdl.createAgent(cookies),
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cookie': cookies.map((cookie: any) => `${cookie.name}=${cookie.value}`).join('; '),
    'Referer': 'https://www.youtube.com/',
    'Origin': 'https://www.youtube.com'
  }
};

console.log('Number of cookies loaded:', cookies.length);
console.log('Cookie names loaded:', cookies.map((c: { name: string }) => c.name));

export async function GET(req: Request, context: any) {
  const { videoId } = await context.params;
  console.log('Streaming videoId:', videoId);
  console.log('Cookies loaded:', cookies.length);

  try {
    const info = await ytdl.getInfo(videoId, {
      ...requestOptions,
      playerClients: ['ANDROID']  // try to avoid 403 errors
    });

    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    const response = await fetch(format.url, {
      headers: {
        ...requestOptions.headers,
        'Range': 'bytes=0-',
      },
    });

    if (!response.ok) {
      throw new Error(`Proxy fetch failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'audio/webm';
    const contentLength = response.headers.get('content-length');

    const headers = new Headers({
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });

    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(response.body, {
      headers,
      status: 200,
    });

  } catch (error) {
    console.error('Detailed stream error:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      // Add any additional properties that might exist on the error
      console.error('Additional error details:', JSON.stringify(error, null, 2));
    }
    return NextResponse.json(
      { 
        error: 'Failed to stream audio', 
        details: (error as Error).message,
        stack: (error as Error).stack,
        cookiesLoaded: cookies.length,
        videoId
      },
      { status: 500 }
    );
  }
}