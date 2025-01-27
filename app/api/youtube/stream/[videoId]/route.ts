/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

// Parse cookies from environment variable
const cookies = process.env.YOUTUBE_COOKIES 
  ? JSON.parse(process.env.YOUTUBE_COOKIES)
  : [];

// Add more request headers to appear more like a browser
const agent = ytdl.createAgent(cookies);
const requestOptions = {
  agent,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Cookie': cookies.map((cookie: any) => `${cookie.name}=${cookie.value}`).join('; ')
  }
};

export async function GET(req: Request, context: any) {
  const { videoId } = await context.params;
  console.log('Streaming videoId:', videoId);
  console.log('Cookies loaded:', cookies.length);

  try {
    console.log('Fetching video info...');
    const info = await ytdl.getInfo(videoId, requestOptions);
    console.log('Video info fetched successfully');
    
    console.log('Choosing format...');
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });
    console.log('Selected format:', format.itag);

    console.log('Creating stream...');
    const stream = ytdl.downloadFromInfo(info, { 
      ...requestOptions,
      format,
      highWaterMark: 1 << 25 // Increase buffer size
    });

    const webStream = new ReadableStream({
      start(controller) {
        console.log('Starting stream controller...');
        stream.on('data', (chunk) => {
          try {
            controller.enqueue(chunk);
          } catch (err) {
            console.error('Error enqueueing chunk:', err);
          }
        });
        stream.on('end', () => {
          console.log('Stream ended successfully');
          controller.close();
        });
        stream.on('error', (err) => {
          console.error('Stream error:', err);
          controller.error(err);
        });
      },
    });

    console.log('Returning response...');
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'audio/mp4',
        'Transfer-Encoding': 'chunked'
      },
    });
  } catch (error) {
    console.error('Detailed stream error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { 
        error: 'Failed to stream audio', 
        details: (error as Error).message,
        stack: (error as Error).stack
      },
      { status: 500 }
    );
  }
}