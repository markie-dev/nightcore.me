'use client';

import { Play, Pause, SkipBack, Download, Upload, Waveform, Headphones, Speedometer, X, Check } from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { getFFmpegHelper } from "@/app/utils/ffmpeg.helper";
import { motion, AnimatePresence } from "framer-motion";

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export default function UploadArea() {
  const { theme } = useTheme();
  const playedColor = theme === "dark" ? "#d1d5db" : "#4b5563";
  const thumbColor = theme === "dark" ? "#d1d5db" : "#6b7280";
  const futureColor = theme === "dark" ? "#1f2937" : "#9ca3af";

  const [isUploaded, setIsUploaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.25);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);
  const [downloadState, setDownloadState] = useState<'idle' | 'loading' | 'success'>('idle');

  const playbackRates = [0.75, 1, 1.25, 1.5, 2];

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          audioRef.current.play().then(() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }).catch(console.error);
        }
        setIsPlaying(true);
      }
      (document.activeElement as HTMLElement)?.blur();
    }
  };

  const handleFileUpload = async (file: File) => {
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setIsUploaded(true);
    setFileName(file.name);
    setPlaybackRate(1.25);

    setTimeout(() => {
      if (audioRef.current && audioContextRef.current) {
        if (!sourceNodeRef.current) {
          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceNodeRef.current.connect(audioContextRef.current.destination);
        }
      }
    }, 0);
  };

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        togglePlayPause();
      }
    };

    document.addEventListener('keydown', handleKeyPress, { capture: true });

    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      document.removeEventListener('keydown', handleKeyPress, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (audioRef.current && isUploaded) {
      updatePitch(playbackRate);
    }
  }, [playbackRate, isUploaded]);

  const updatePitch = (rate: number) => {
    if (audioRef.current) {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }

      if (rate > 1) {
        audioRef.current.preservesPitch = false;
      } else {
        audioRef.current.preservesPitch = true;
      }
      
      audioRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    updatePitch(rate);
    (document.activeElement as HTMLElement)?.blur();
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      let animationFrameId: number;
      
      const updateTime = () => {
        if (audio) {
          setCurrentTime(audio.currentTime);
          if (!audio.paused) {
            animationFrameId = requestAnimationFrame(updateTime);
          }
        }
      };

      const handlePlay = () => {
        animationFrameId = requestAnimationFrame(updateTime);
      };

      const handlePause = () => {
        cancelAnimationFrame(animationFrameId);
      };

      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('seeking', updateTime);
      audio.addEventListener('seeked', updateTime);
      
      return () => {
        if (audio) {
          audio.removeEventListener('play', handlePlay);
          audio.removeEventListener('pause', handlePause);
          audio.removeEventListener('seeking', updateTime);
          audio.removeEventListener('seeked', updateTime);
        }
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      (document.activeElement as HTMLElement)?.blur();
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const convertToMP3 = async (audioBuffer: AudioBuffer): Promise<Blob> => {
    setIsConverting(true);
    try {
      const ffmpeg = await getFFmpegHelper();
      
      const wavBlob = bufferToWaveBlob(audioBuffer);
      const wavData = new Uint8Array(await wavBlob.arrayBuffer());
      
      await ffmpeg.writeFile('input.wav', wavData);
      await ffmpeg.run([
        '-i', 'input.wav',
        '-codec:a', 'libmp3lame',
        '-qscale:a', '2',
        'output.mp3'
      ]);

      const mp3Data = await ffmpeg.readFile('output.mp3');

      await ffmpeg.deleteFile('input.wav');
      await ffmpeg.deleteFile('output.mp3');

      return new Blob([mp3Data], { type: 'audio/mp3' });
    } catch (error) {
      console.error('Error converting to MP3:', error);
      throw error;
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = async (format: 'wav' | 'mp3') => {
    if (!audioUrl || !fileName || !audioContextRef.current) {
      console.error('Missing required data for download');
      return;
    }
    
    try {
      console.log('Starting download process...');
      setDownloadState('loading');
      
      const startTime = Date.now();
      const MIN_LOADING_TIME = 500;

      console.log('Fetching audio data...');
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      const offlineContext = new OfflineAudioContext({
        numberOfChannels: audioBuffer.numberOfChannels,
        length: Math.ceil(audioBuffer.length * (1 / playbackRate)),
        sampleRate: audioBuffer.sampleRate
      });

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;
      source.connect(offlineContext.destination);

      source.start(0);

      try {
        const renderedBuffer = await offlineContext.startRendering();

        let blob;
        if (format === 'wav') {
          blob = bufferToWaveBlob(renderedBuffer);
        } else {
          blob = await convertToMP3(renderedBuffer);
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const rateString = playbackRate.toString().replace('.', '_');
        link.download = `${fileName.split('.').slice(0, -1).join('.')}_${rateString}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        const processingTime = Date.now() - startTime;
        if (processingTime < MIN_LOADING_TIME) {
          await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - processingTime));
        }

        console.log('Download completed successfully');
        setDownloadState('success');
        
        setTimeout(() => {
          setDownloadState('idle');
        }, 2000);

      } catch (renderError) {
        console.error('Rendering error:', renderError);
        throw renderError;
      }
    } catch (error) {
      console.error('Download error:', error);
      setDownloadState('idle');
    }
  };

  const bufferToWaveBlob = (buffer: AudioBuffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels = [];
    let offset = 0;
    let pos = 0;

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);

    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);

    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        const sample = Math.max(-1, Math.min(1, channels[i][offset]));
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([bufferArray], { type: 'audio/wav' });

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  };

  if (!isUploaded) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mt-12 max-w-xl mx-auto"
      >
        <motion.div 
          className="border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-lg px-12 py-8 text-center hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 group cursor-pointer bg-gray-50/50 dark:bg-gray-100/10 hover:bg-gray-100/50 dark:hover:bg-gray-100/20"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('border-primary');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-primary');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-primary');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('audio/')) {
              handleFileUpload(file);
            }
          }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                handleFileUpload(file);
              }
            };
            input.click();
          }}
        >
          <motion.div 
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
          >
            <div>
              <Upload className="w-8 h-8 opacity-60" />
            </div>
            <div>
              <p className="text-lg font-medium">Drop your audio file here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to select a file</p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 max-w-xl mx-auto p-4 bg-gray-50/50 dark:bg-gray-100/10 rounded-lg"
    >
      <div className="flex justify-end">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setIsUploaded(false);
            setAudioUrl(null);
            setFileName("");
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
          }}
          className="p-1.5 rounded-md hover:bg-gray-100/10 text-muted-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl || ''}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            updatePitch(playbackRate);
          }
        }}
      />
      
      <motion.div 
        className="flex flex-col gap-2 px-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-left">
          <h3 className="font-medium text-lg truncate" title={fileName}>
            {fileName}
          </h3>
        </div>
        
        <div className="relative w-full">
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleSliderChange}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{
              background: `linear-gradient(to right, 
                ${playedColor}50 0%, 
                ${playedColor}50 ${((currentTime / duration) * 100) + (0.5 * (1 - currentTime/duration))}%, 
                ${futureColor}30 ${((currentTime / duration) * 100) + (0.5 * (1 - currentTime/duration))}%, 
                ${futureColor}30 100%)`
            }}
          />
        </div>
        
        <div className="flex justify-between text-sm text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        
        <motion.div 
          className="flex items-center justify-between mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRestart}
              className="p-2 transition-colors hover:bg-gray-100/10 rounded-md"
            >
              <SkipBack className="w-5 h-5 text-foreground opacity-60" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={togglePlayPause}
              className="p-2 transition-colors hover:bg-gray-100/10 rounded-md"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-foreground opacity-60" />
              ) : (
                <Play className="w-6 h-6 text-foreground opacity-60" />
              )}
            </motion.button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 transition-colors hover:bg-gray-100/10 rounded-md relative"
                  disabled={downloadState !== 'idle' || isConverting}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {downloadState === 'idle' && (
                      <motion.div
                        key="download"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Download className="w-6 h-6 text-foreground opacity-60" />
                      </motion.div>
                    )}
                    {downloadState === 'loading' && (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative"
                      >
                        <svg
                          className="animate-spin w-6 h-6 text-foreground opacity-60"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M12 4c4.411 0 8 3.589 8 8h2c0-5.515-4.485-10-10-10v2zm0-2v2c-4.411 0-8 3.589-8 8H2c0-5.515 4.485-10 10-10z"
                          />
                        </svg>
                      </motion.div>
                    )}
                    {downloadState === 'success' && (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Check className="w-6 h-6 text-foreground opacity-60" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem 
                  onClick={() => handleDownload('wav')}
                  disabled={downloadState !== 'idle'}
                >  
                  <Waveform className="w-4 h-4 opacity-60" />
                  Lossless (WAV)
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDownload('mp3')}
                  disabled={downloadState !== 'idle' || isConverting}
                >
                  <Headphones className="w-4 h-4 opacity-60" />
                  {isConverting ? 'Converting...' : 'Normal (MP3)'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex gap-2">
            <div className="hidden sm:flex items-center gap-2">
              {playbackRates.map((rate) => (
                <motion.button
                  key={rate}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePlaybackRateChange(rate)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-gray-100/10 
                    ${playbackRate === rate ? "bg-foreground/10" : "text-muted-foreground"}`}
                >
                  {rate}x
                </motion.button>
              ))}
            </div>

            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-gray-100/10 flex items-center gap-1.5 text-muted-foreground">
                    <Speedometer className="w-5 h-5" />
                    {playbackRate}x
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {playbackRates.map((rate) => (
                    <DropdownMenuItem
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={playbackRate === rate ? "bg-foreground/10" : ""}
                    >
                      {rate}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.div>
      </motion.div>
      <style jsx>{`
        input[type='range'] {
          margin: 0;
          padding: 0;
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${thumbColor};
          cursor: pointer;
          opacity: 1;
        }
        input[type='range']::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${thumbColor};
          cursor: pointer;
          border: none;
          opacity: 1;
        }
        button:focus {
          outline: none !important;
        }
        button:focus-visible {
          outline: 2px solid var(--focus-ring) !important;
          outline-offset: 2px;
        }
      `}</style>
    </motion.div>
  );
} 