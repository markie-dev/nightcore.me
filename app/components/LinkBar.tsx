'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import * as Tone from 'tone';

export default function LinkBar({ onAudioBuffer }: { 
  onAudioBuffer: (buffer: AudioBuffer, title?: string, thumbnail?: string) => void 
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleYouTubeLink() {
    if (!url) return;
    
    try {
      setIsLoading(true);
      setError(null);

      console.log('Starting YouTube link process...');

      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      console.log('Video ID extracted:', videoId);

      const infoResponse = await fetch(`/api/youtube/info?videoId=${videoId}`);
      if (!infoResponse.ok) {
        throw new Error('Failed to fetch video info');
      }

      const videoInfo = await infoResponse.json();
      console.log('Video info received:', videoInfo);
      
      if (!videoInfo.formats || videoInfo.formats.length === 0) {
        throw new Error('No audio formats available');
      }

      const audioFormat = videoInfo.formats[0];
      if (!audioFormat?.url) {
        throw new Error('No audio stream found');
      }

      console.log('Starting audio fetch from:', audioFormat.url);

      await Tone.start();
      
      const response = await fetch(`/api/youtube/stream/${videoId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audio stream');
      }

      console.log('Audio stream fetched, converting to buffer...');

      const arrayBuffer = await response.arrayBuffer();
      console.log('ArrayBuffer created, decoding audio...');
      
      const audioBuffer = await Tone.context.decodeAudioData(arrayBuffer);
      console.log('Audio decoded successfully:', audioBuffer);
      
      console.log('Calling onAudioBuffer...');
      onAudioBuffer(audioBuffer, videoInfo.title, videoInfo.thumbnail);
      
      setUrl('');
      console.log('Process completed successfully');
      
    } catch (error) {
      console.error('Error processing YouTube link:', error);
      setError('Failed to process YouTube link. Please try a different video or check the URL.');
    } finally {
      setIsLoading(false);
    }
  }

  function extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
      /^[^"&?\/\s]{11}$/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="max-w-xl mx-auto mt-8 px-4"
    >
      <motion.div 
        className={`flex items-center gap-2 p-2 rounded-lg transition-colors
          ${isFocused 
            ? 'bg-gray-100/20 dark:bg-gray-100/10' 
            : 'bg-gray-50/50 dark:bg-gray-100/5'}`}
      >
        <Input 
          type="text" 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Or paste a YouTube link..."
          className="border-none bg-transparent focus-visible:ring-0 text-base"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleYouTubeLink();
          }}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleYouTubeLink}
          disabled={isLoading}
          className="p-2 rounded-md hover:bg-gray-100/10 text-muted-foreground transition-colors"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowRight className="w-5 h-5" />
          )}
        </motion.button>
      </motion.div>
      
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-sm mt-2 px-2"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}
    
