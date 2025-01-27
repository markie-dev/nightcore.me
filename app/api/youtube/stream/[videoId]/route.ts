/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

// Parse cookies from environment variable
const cookies = process.env.YOUTUBE_COOKIES 
  ? JSON.parse(process.env.YOUTUBE_COOKIES)
  : [];

const agent = ytdl.createAgent(cookies);

export async function GET(req: Request, context: any) {
  const { videoId } = await context.params;
  console.log('Streaming videoId:', videoId);
  console.log('Cookies loaded:', cookies.length);

  try {
    console.log('Fetching video info...');
    const info = await ytdl.getInfo(videoId, { agent });
    console.log('Video info fetched successfully');
    
    console.log('Choosing format...');
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });
    console.log('Selected format:', format.itag);

    console.log('Creating stream...');
    const stream = ytdl.downloadFromInfo(info, { 
      format,
      agent,
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