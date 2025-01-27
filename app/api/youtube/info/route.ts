import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

const cookies = process.env.YOUTUBE_COOKIES 
  ? JSON.parse(process.env.YOUTUBE_COOKIES)
  : [];

// log cookies
console.log('Number of cookies loaded:', cookies.length);
console.log('Cookie names loaded:', cookies.map((c: { name: string }) => c.name));

const agent = ytdl.createAgent(cookies);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  
  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
  }

  try {
    console.log('Attempting to fetch video info with cookies...');
    const info = await ytdl.getInfo(videoId, { agent });
    
    console.log('Successfully fetched video info');
    console.log('Video is age restricted:', info.videoDetails.age_restricted);
    console.log('Video length:', info.videoDetails.lengthSeconds, 'seconds');

    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    const proxyUrl = `${baseUrl}/api/yt-proxy`;
    
    console.log('Using proxy URL:', proxyUrl);
    
    console.log('Fetching info for videoId:', videoId);
    const videoInfo = await ytdl.getInfo(videoId, { agent });
    
    const audioFormats = ytdl.filterFormats(videoInfo.formats, 'audioonly');
    if (audioFormats.length === 0) {
      throw new Error('No audio formats found');
    }

    const bestFormat = audioFormats[0];
    
    const thumbnails = videoInfo.videoDetails.thumbnails;
    const thumbnail = thumbnails[thumbnails.length - 1]?.url || null;
    
    const response = {
      title: videoInfo.videoDetails.title,
      thumbnail,
      formats: [{
        url: bestFormat.url,
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