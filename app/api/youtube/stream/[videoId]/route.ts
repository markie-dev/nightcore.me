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
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cookie': cookies.map((cookie: any) => `${cookie.name}=${cookie.value}`).join('; '),
    'Referer': 'https://www.youtube.com/',
    'Origin': 'https://www.youtube.com',
    'Sec-Fetch-Dest': 'audio',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site'
  }
};

console.log('Number of cookies loaded:', cookies.length);
console.log('Cookie names loaded:', cookies.map((c: { name: string }) => c.name));

export async function GET(req: Request, context: any) {
  const { videoId } = await context.params;
  console.log('Streaming videoId:', videoId);

  try {
    console.log('Getting video info...');
    const info = await ytdl.getInfo(videoId, {
      ...requestOptions,
      playerClients: ['WEB_EMBEDDED'],
      lang: 'en'
    });

    console.log('Video info received:', {
      title: info.videoDetails.title,
      length: info.videoDetails.lengthSeconds,
      formats: info.formats.length
    });

    console.log('Choosing format...');
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    console.log('Format selected:', {
      itag: format.itag,
      mimeType: format.mimeType,
      contentLength: format.contentLength,
      url: format.url.substring(0, 100) + '...' // Log partial URL for debugging
    });

    console.log('Fetching audio stream...');
    const response = await fetch(format.url, {
      headers: {
        ...requestOptions.headers,
        'Range': 'bytes=0-',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Client-Name': 'ANDROID'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
    }

    console.log('Stream fetched successfully, returning response...');
    const headers = new Headers({
      'Content-Type': format.mimeType || 'audio/webm',
      'Content-Length': format.contentLength,
      'Accept-Ranges': 'bytes'
    });

    return new NextResponse(response.body, { headers });

  } catch (error) {
    console.error('=== Detailed Stream Error ===');
    console.error('Error object:', error);
    console.error('Error name:', (error as any)?.name);
    console.error('Error message:', (error as any)?.message);
    console.error('Error stack:', (error as any)?.stack);
    console.error('Error cause:', (error as any)?.cause);
    if (error instanceof Error) {
      console.error('Is Error instance: true');
      console.error('Error properties:', Object.getOwnPropertyNames(error));
    }
    console.error('Full error stringify:', JSON.stringify(error, null, 2));
    console.error('=== End Error Details ===');

    return NextResponse.json(
      { 
        error: 'Failed to stream audio', 
        details: error instanceof Error ? error.message : 'Unknown error',
        cookiesLoaded: cookies.length,
        videoId
      },
      { status: 500 }
    );
  }
}