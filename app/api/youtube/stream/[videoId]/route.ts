/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

const cookies = process.env.YOUTUBE_COOKIES 
  ? JSON.parse(process.env.YOUTUBE_COOKIES)
  : [];

const agent = ytdl.createAgent(cookies);

export async function GET(
  request: Request, 
  { params }: { params: { videoId: string } }
) {
  const { videoId } = await params;
  console.log('Streaming videoId:', videoId);

  try {
    const info = await ytdl.getInfo(videoId, { agent });
    const format = ytdl.chooseFormat(info.formats, { 
      quality: 'highestaudio',
      filter: 'audioonly' 
    });

    const stream = ytdl.downloadFromInfo(info, {
      format,
      agent
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