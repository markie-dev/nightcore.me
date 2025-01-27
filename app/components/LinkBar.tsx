'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from '@phosphor-icons/react';
import * as Tone from 'tone';

export default function LinkBar({ onAudioBuffer }: { 
  onAudioBuffer: (buffer: AudioBuffer, title?: string, thumbnail?: string) => void 
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<{
    message: string;
    isTransitioning?: boolean;
  } | null>(null);

  async function handleYouTubeLink() {
    if (!url) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Extract Video ID
      setLoadingState({ message: "Extracting video ID..." });
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      const infoPromise = fetch(`/api/youtube/info?videoId=${videoId}`);
      
      setLoadingState({ message: "Finding video...", isTransitioning: true });
      
      const infoResponse = await infoPromise;
      if (!infoResponse.ok) {
        throw new Error('Failed to fetch video info');
      }

      const videoInfo = await infoResponse.json();
      
      if (!videoInfo.formats || videoInfo.formats.length === 0) {
        throw new Error('No audio formats available');
      }

      setLoadingState({ 
        message: videoInfo.title || "Video found!", 
        isTransitioning: true 
      });

      await Tone.start();
      const audioPromise = fetch(`/api/youtube/stream/${videoId}`);

      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 800)),
        audioPromise.then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch audio stream');
          }
          
          setLoadingState({ 
            message: "Starting audio fetch...", 
            isTransitioning: true 
          });

          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await Tone.context.decodeAudioData(arrayBuffer);
          
          onAudioBuffer(audioBuffer, videoInfo.title, videoInfo.thumbnail);
        })
      ]);
      
      setUrl('');
      setLoadingState(null);
      
    } catch (error) {
      console.error('Error processing YouTube link:', error);
      setError('Failed to process YouTube link. Please try a different video or check the URL.');
      setLoadingState(null);
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
        <AnimatePresence mode="wait">
          {loadingState ? (
            <motion.div
              key="loading-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 text-base px-3 py-1.5 text-muted-foreground overflow-hidden"
            >
              <motion.span
                animate={{ opacity: loadingState.isTransitioning ? 0.5 : 1 }}
                transition={{ duration: 0.3 }}
                className="block truncate"
              >
                {loadingState.message}
              </motion.span>
            </motion.div>
          ) : (
            <Input 
              key="input"
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
              disabled={isLoading}
            />
          )}
        </AnimatePresence>
        
        <AnimatePresence mode="wait">
          {url && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: isLoading ? 1 : 1.05, backgroundColor: isLoading ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.15)' }}
              whileTap={{ scale: isLoading ? 1 : 0.95 }}
              onClick={() => setUrl('')}
              disabled={isLoading}
              className={`p-1.5 rounded-full bg-white/5 backdrop-blur-sm text-muted-foreground transition-all duration-200 hover:bg-white/10
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{
                boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.05)',
              }}
            >
              <X weight="bold" className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>

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
    
