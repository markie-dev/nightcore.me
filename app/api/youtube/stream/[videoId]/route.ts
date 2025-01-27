/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import { Readable } from 'stream';

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

// Helper function to convert Node.js readable stream to Web Stream
function nodeStreamToWebStream(nodeStream: Readable) {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        controller.enqueue(chunk);
      });
      nodeStream.on('end', () => {
        controller.close();
      });
      nodeStream.on('error', (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    }
  });
}

export async function GET(req: Request, context: any) {
  const { videoId } = await context.params;
  console.log('Streaming videoId:', videoId);

  try {
    console.log('Getting video info...');
    const info = await ytdl.getInfo(videoId, {
      ...requestOptions,
      playerClients: ['ANDROID'],  // Just use ANDROID for faster response
      lang: 'en'
    });

    console.log('Choosing format...');
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    console.log('Creating stream...');
    const stream = ytdl.downloadFromInfo(info, {
      ...requestOptions,
      format,
      dlChunkSize: 1024 * 1024 * 10, // 10MB chunks
      highWaterMark: 1024 * 1024 * 5, // 5MB buffer
      playerClients: ['ANDROID']
    });

    // Add progress logging
    let downloadedBytes = 0;
    const totalBytes = parseInt(format.contentLength);
    
    stream.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      const progress = (downloadedBytes / totalBytes * 100).toFixed(2);
      console.log(`Download progress: ${progress}% (${downloadedBytes}/${totalBytes} bytes)`);
    });

    const webStream = nodeStreamToWebStream(stream);

    const headers = new Headers({
      'Content-Type': 'audio/webm',
      'Accept-Ranges': 'bytes',
      'Content-Length': format.contentLength,
    });

    return new NextResponse(webStream, {
      headers,
      status: 200,
    });

  } catch (error) {
    console.error('Detailed stream error:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { 
        error: 'Failed to stream audio', 
        details: (error as Error).message,
        cookiesLoaded: cookies.length,
        videoId
      },
      { status: 500 }
    );
  }
}