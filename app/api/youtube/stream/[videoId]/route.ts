/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import { ProxyAgent } from 'undici';

export async function GET(request: Request, context: any) {
  try {
    const { videoId } = await context.params;
    
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    const proxyUrl = `${baseUrl}/api/yt-proxy`;
    
    console.log('Using proxy URL:', proxyUrl);
    const agent = new ProxyAgent({
      uri: `http://localhost:3128`,
      auth: baseUrl.startsWith('https') ? 'https' : 'http'
    });
    
    console.log('Streaming videoId:', videoId);
    const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
      filter: 'audioonly',
      quality: 'highestaudio',
      requestOptions: { dispatcher: agent }
    });

    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'audio/mp4',
        'Transfer-Encoding': 'chunked'
      }
    });

  } catch (error) {
    console.error('Stream error:', error);
    return NextResponse.json(
      { error: 'Failed to stream audio', details: (error as Error).message },
      { status: 500 }
    );
  }
}