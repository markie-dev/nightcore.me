/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  
  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
  }

  try {
    console.log('Attempting to fetch video info with cookies...');
    const info = await ytdl.getInfo(videoId, {
      ...requestOptions,
      playerClients: ['ANDROID'],  // use ANDROID client like in stream route
      lang: 'en'
    });
    
    console.log('Successfully fetched video info');
    console.log('Video is age restricted:', info.videoDetails.age_restricted);
    console.log('Video length:', info.videoDetails.lengthSeconds, 'seconds');
    
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
      { 
        error: 'Failed to fetch video info', 
        details: (error as Error).message,
        cookiesLoaded: cookies.length,
        videoId 
      },
      { status: 500 }
    );
  }
} 