import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const { videoId } = await Promise.resolve(params);
    
    const stream = ytdl(videoId, {
      filter: 'audioonly',
      quality: 'highestaudio'
    });

    return new NextResponse(stream as any, {
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