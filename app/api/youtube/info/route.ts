import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');
  
  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(videoId);
    
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    if (audioFormats.length === 0) {
      throw new Error('No audio formats found');
    }

    const bestFormat = audioFormats[0];
    
    const thumbnails = info.videoDetails.thumbnails;
    const thumbnail = thumbnails[thumbnails.length - 1]?.url || null;
    
    const response = {
      title: info.videoDetails.title,
      thumbnail,
      formats: [{
        mimeType: bestFormat.mimeType,
        bitrate: bestFormat.bitrate,
        contentLength: bestFormat.contentLength,
        approxDurationMs: bestFormat.approxDurationMs
      }]
    };
    return NextResponse.json(response);

  } catch (error) {
    console.error('YouTube info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video info', details: (error as Error).message },
      { status: 500 }
    );
  }
} 