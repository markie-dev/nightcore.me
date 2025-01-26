import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

type Params = {
  params: {
    videoId: string;
  };
};

export async function GET(
  request: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const { videoId } = await Promise.resolve(params);
    
    const stream = ytdl(videoId, {
      filter: 'audioonly',
      quality: 'highestaudio'
    });

    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        stream.on('end', () => {
          controller.close();
        });
        stream.on('error', (err) => {
          controller.error(err);
        });
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