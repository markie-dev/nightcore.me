"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import * as Tone from "tone";
import { Play, Pause, SkipBack, Download, Upload, Speedometer, X, Check, Waveform, Headphones, SpeakerNone, SpeakerHigh, SpeakerSimpleSlash } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { getFFmpegHelper } from "@/app/utils/ffmpeg.helper";
import LinkBar from "@/app/components/LinkBar";
import Image from 'next/image';
import { useAudio } from '@/app/contexts/AudioContext';
import { Skeleton } from "@/components/ui/skeleton";


function bufferToWaveBlob(buffer: AudioBuffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  
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

  for (let i = 0; i < numOfChan; i++) {
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
  return new Blob([bufferArray], { type: "audio/wav" });
}

interface UploadAreaProps {
  skipAnimation?: boolean;
}

export default function UploadArea({ }: UploadAreaProps) {
  const { theme } = useTheme();
  const playedColor = theme === "dark" ? "#d1d5db" : "#4b5563";
  const futureColor = theme === "dark" ? "#1f2937" : "#9ca3af";

  const { 
    isUploaded, 
    setIsUploaded,
    fileName,
    setFileName,
    thumbnail,
    setThumbnail,
    playerRef,
    duration,
    setDuration,
    playbackRate,
    setPlaybackRate,
    isPlaying,
    setIsPlaying
  } = useAudio();

  
  const [currentTime, setCurrentTime] = useState(0);

  
  
  const startTimeRef = useRef<number>(0);  
  const offsetRef = useRef<number>(0);     
  const requestRef = useRef<number>(0);

  
  const playbackRates = [0.75, 1, 1.15, 1.25, 1.5];

  
  const [isConverting, setIsConverting] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "loading" | "success">("idle");

  
  const [isScrubbing, setIsScrubbing] = useState(false);

  // play silent audio to unlock iOS audio
  const [audioElement] = useState(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('/silence.mp3');
      audio.loop = false;
      return audio;
    }
    return null;
  });

  const [volume, setVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem('audioVolume');
      return savedVolume ? parseFloat(savedVolume) : 1;
    }
    return 1;
  });

  const [isVolumeHovered, setIsVolumeHovered] = useState(false);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (playerRef.current.state === "started") {
      pause();
    } else {
      play();
    }
    
    (document.activeElement as HTMLElement)?.blur();
  }, []);

  /* ======================
     KEYBOARD CONTROLS
  ====================== */
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.code !== 'Space') return;
      e.stopPropagation();
      e.preventDefault();
      (document.activeElement as HTMLElement)?.blur();
      
      if (isUploaded) {
        togglePlayPause();
      }
    }

    document.addEventListener('keydown', handleKeyPress, true);
    return () => {
      document.removeEventListener('keydown', handleKeyPress, true);
    };
  }, [isUploaded, togglePlayPause]);

  /* ======================
     FILE UPLOAD
  ====================== */
  function handleFileUpload(file: File) {
    if (!file) return;

    const url = URL.createObjectURL(file);

    
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    
    const newPlayer = new Tone.Player(url, () => {
      setIsUploaded(true);
      setFileName(file.name);

      const rawBuffer = newPlayer.buffer?.get();
      if (!rawBuffer) {
        console.error("Failed to get audio buffer");
        return;
      }
      setDuration(rawBuffer.duration);
    }).toDestination();

    
    newPlayer.onstop = () => {
      const rawBuffer = newPlayer.buffer?.get();
      const bufferDuration = rawBuffer?.duration || 0;
      
      
      const elapsed = Tone.now() - startTimeRef.current;
      const actualCurrentTime = offsetRef.current + elapsed;
      
      
      if (!isScrubbing && bufferDuration > 0 && Math.abs(actualCurrentTime - bufferDuration) < 1.2) {
        setIsPlaying(false);
        offsetRef.current = 0;
        setCurrentTime(0);
      }
    };

    newPlayer.autostart = false;
    newPlayer.playbackRate = playbackRate;
    newPlayer.volume.value = 20 * Math.log10(volume);
    playerRef.current = newPlayer;
  }

  /* ======================
     PLAY / PAUSE
  ====================== */
  function play() {
    const player = playerRef.current;
    if (!player) return;
    
    // play silent audio to unlock iOS audio
    if (audioElement) {
        audioElement.play().then(() => {
            if (Tone.context.state === "suspended") {
                Tone.start().then(() => {
                    player.start(undefined, offsetRef.current);
                    startTimeRef.current = Tone.now();
                    setIsPlaying(true);
                });
            } else {
                player.start(undefined, offsetRef.current);
                startTimeRef.current = Tone.now();
                setIsPlaying(true);
            }
        }).catch(error => {
            console.error("Error starting audio:", error);
        });
    }
  }

  function pause() {
    const player = playerRef.current;
    if (!player) return;
    
    const elapsed = Tone.now() - startTimeRef.current;
    offsetRef.current += elapsed; 
    player.stop(); 
    setIsPlaying(false);
  }

  /* ======================
     TIME TRACKING
  ====================== */
  useEffect(() => {
    function updateTime() {
      if (playerRef.current && playerRef.current.state === "started") {
        const elapsed = Tone.now() - startTimeRef.current;
        const newTime = offsetRef.current + elapsed;
        
        
        if (Math.abs(newTime - currentTime) > 0.1) {
          setCurrentTime(newTime);
        }
      }
      requestRef.current = requestAnimationFrame(updateTime);
    }
    requestRef.current = requestAnimationFrame(updateTime);

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [duration, currentTime]);

  /* ======================
     SCRUBBING
  ====================== */
  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTime = parseFloat(e.target.value);
    const player = playerRef.current;
    if (!player) return;

    setIsScrubbing(true);  
    
    const wasPlaying = player.state === "started";
    if (wasPlaying) {
      player.stop();
    }
    
    
    offsetRef.current = newTime;
    setCurrentTime(newTime);
    startTimeRef.current = Tone.now();

    
    if (wasPlaying) {
      player.start(undefined, newTime);
      setIsPlaying(true);
    }

    
    setTimeout(() => setIsScrubbing(false), 500);
  }

  function handleRestart() {
    const player = playerRef.current;
    if (!player) return;

    
    const wasPlaying = player.state === "started";

    
    player.stop();
    offsetRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    
    (document.activeElement as HTMLElement)?.blur();

    
    if (wasPlaying) {
      play();
    }
  }

  /* ======================
     PLAYBACK RATE
  ====================== */
  function handlePlaybackRateChange(rate: number) {
    setPlaybackRate(rate);
    if (playerRef.current) {
      playerRef.current.playbackRate = rate;
    }
    
    (document.activeElement as HTMLElement)?.blur();
  }

  /* ======================
     OFFLINE RENDER & EXPORT
  ====================== */
  async function convertToMP3(buffer: AudioBuffer): Promise<Blob> {
    setIsConverting(true);
    try {
      const ffmpeg = await getFFmpegHelper();
      const wavBlob = bufferToWaveBlob(buffer);
      const wavData = new Uint8Array(await wavBlob.arrayBuffer());

      await ffmpeg.writeFile("input.wav", wavData);
      await ffmpeg.run(["-i", "input.wav", "-codec:a", "libmp3lame", "-qscale:a", "2", "output.mp3"]);

      const mp3Data = await ffmpeg.readFile("output.mp3");
      await ffmpeg.deleteFile("input.wav");
      await ffmpeg.deleteFile("output.mp3");

      return new Blob([mp3Data], { type: "audio/mp3" });
    } finally {
      setIsConverting(false);
    }
  }

  async function handleDownload(format: "wav" | "mp3") {
    const player = playerRef.current;
    if (!player || !fileName || !player.buffer) {
      console.warn("Missing player or buffer or fileName");
      return;
    }

    try {
      setDownloadState("loading");
      const MIN_LOADING_TIME = 500;
      const startTime = Date.now();

      
      const originalBuffer = player.buffer?.get();
      if (!originalBuffer) {
        console.error("Failed to get original buffer");
        return;
      }
      const durationSeconds = originalBuffer.duration / playbackRate;

      
      const renderedBuffer = await Tone.Offline(() => {
        
        const offPlayer = new Tone.Player(originalBuffer).toDestination();
        offPlayer.playbackRate = playbackRate;
        offPlayer.start(0);
      }, durationSeconds);

      
      let finalBlob: Blob;
      if (format === "wav") {
        finalBlob = bufferToWaveBlob(renderedBuffer.get() as AudioBuffer);
      } else {
        finalBlob = await convertToMP3(renderedBuffer.get() as AudioBuffer);
      }

      
      const url = URL.createObjectURL(finalBlob);
      const link = document.createElement("a");
      link.href = url;
      const rateStr = playbackRate.toString().replace(".", "_");
      link.download = `${fileName.replace(/\.\w+$/, "")}_${rateStr}x.${format}`;
      link.click();
      URL.revokeObjectURL(url);

      
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_TIME) {
        await new Promise((res) => setTimeout(res, MIN_LOADING_TIME - elapsed));
      }
      setDownloadState("success");
      setTimeout(() => setDownloadState("idle"), 2000);
    } catch (err) {
      console.error(err);
      setDownloadState("idle");
    }
  }

  /* ======================
     FORMAT TIME
  ====================== */
  function formatTime(t: number) {
    if (!Number.isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  const handleYouTubeAudio = async (buffer: AudioBuffer, title?: string, thumbnail?: string) => {
    try {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      setIsUploaded(true);
      setFileName(title || "YouTube Audio");
      setThumbnail(thumbnail || null);
      setDuration(buffer.duration);
      
      const newPlayer = new Tone.Player({
        url: buffer,
        onload: () => {
          console.log('Player loaded');
        }
      }).toDestination();

      
      newPlayer.autostart = false;
      newPlayer.playbackRate = playbackRate;
      newPlayer.volume.value = 20 * Math.log10(volume);
      
      
      newPlayer.onstop = () => {
        const bufferDuration = buffer.duration;
        const elapsed = Tone.now() - startTimeRef.current;
        const actualCurrentTime = offsetRef.current + elapsed;
        
        if (!isScrubbing && bufferDuration > 0 && Math.abs(actualCurrentTime - bufferDuration) < 1.2) {
          setIsPlaying(false);
          offsetRef.current = 0;
          setCurrentTime(0);
        }
      };
      playerRef.current = newPlayer;
      
      setCurrentTime(0);
      offsetRef.current = 0;
      setIsPlaying(false);

    } catch (error) {
      console.error('Error setting up player:', error);
      
      setIsUploaded(false);
      setFileName("");
      setThumbnail(null);
    }
  };

  /* ======================
     VOLUME CONTROL
  ====================== */
  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    localStorage.setItem('audioVolume', newVolume.toString());
    if (playerRef.current) {
      playerRef.current.volume.value = 20 * Math.log10(newVolume);
    }
  }

  /* ======================
     RENDER
  ====================== */
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
            e.currentTarget.classList.add("border-primary");
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-primary");
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-primary");
            const file = e.dataTransfer.files[0];
            if (file && (file.type.startsWith("audio/") || file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i))) {
              handleFileUpload(file);
            } else {
              console.warn("Please upload an audio file");
            }
          }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "audio/*,.mp3,.wav,.m4a,.aac,.ogg";
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f && (f.type.startsWith("audio/") || f.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i))) {
                handleFileUpload(f);
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
            <Upload className="w-8 h-8 opacity-60" />
            <div>
              <p className="text-lg font-medium">Drop your audio file here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to select a file</p>
            </div>
          </motion.div>
        </motion.div>
        <div className="max-w-xl mx-auto px-4 my-8">
        <motion.div 
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.2 }}
          className="h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent"
        />
      </div>
        <LinkBar onAudioBuffer={handleYouTubeAudio} />
      </motion.div>
    );
  }

  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 max-w-xl mx-auto p-4 bg-gray-50/50 dark:bg-gray-100/10 rounded-lg"
    >
      {/* Close / Remove file */}
      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setIsUploaded(false);
            setFileName("");
            setThumbnail(null);
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
            offsetRef.current = 0;
            if (playerRef.current) {
              playerRef.current.dispose();
              playerRef.current = null;
            }
          }}
          className="p-1.5 rounded-md hover:bg-gray-100/10 text-muted-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Main UI */}
      <motion.div 
        className="flex flex-col gap-2 px-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {/* Thumbnail */}
        {thumbnail && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full aspect-square max-w-[240px] mx-auto mb-4 rounded-lg overflow-hidden"
          >
            <div className="relative w-full h-full">
              <Skeleton className="absolute inset-0 z-10" />
              <Image
                src={thumbnail}
                alt="Video thumbnail"
                fill
                className="object-cover z-20"
                sizes="(max-width: 240px) 100vw, 240px"
                priority
                onLoad={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.zIndex = "30";
                }}
              />
            </div>
          </motion.div>
        )}

        {/* File name */}
        <div className="text-left">
          <h3 className="font-medium text-lg truncate" title={fileName}>
            {fileName}
          </h3>
        </div>

        {/* Time slider */}
        <div className="relative w-full">
          <input
            type="range"
            min={0}
            max={duration}
            step="0.01"
            value={currentTime}
            onChange={handleSliderChange}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{
              background: `linear-gradient(to right,
                ${playedColor}50 0%,
                ${playedColor}50 ${(currentTime / duration) * 100}%,
                ${futureColor}30 ${(currentTime / duration) * 100}%,
                ${futureColor}30 100%)`,
            }}
          />
        </div>

        <div className="flex justify-between text-sm text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls row */}
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
              <AnimatePresence mode="wait" initial={false}>
                {isPlaying ? (
                  <motion.div
                    key="pause"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.6, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <Pause className="w-6 h-6 text-foreground" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.6, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <Play className="w-6 h-6 text-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Download button & menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 transition-colors hover:bg-gray-100/10 rounded-md relative"
                  disabled={downloadState === "loading"}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {downloadState === "loading" ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.6, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin"
                      />
                    ) : downloadState === "success" ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.6, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="text-foreground"
                      >
                        <Check className="w-6 h-6" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="download"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.6, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                      >
                        <Download className="w-6 h-6" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleDownload("wav")} disabled={downloadState === "loading"}>
                  <Waveform className="w-4 h-4 mr-2" />
                  Lossless (WAV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("mp3")} disabled={downloadState === "loading"}>
                  <Headphones className="w-4 h-4 mr-2" />
                  {isConverting ? "Converting..." : "Normal (MP3)"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Playback speed control - desktop buttons */}
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

        <motion.div 
          className="flex items-center gap-3 mt-4 px-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onMouseEnter={() => setIsVolumeHovered(true)}
          onMouseLeave={() => setIsVolumeHovered(false)}
        >
          <motion.div
            whileTap={{ scale: 0.9 }}
            animate={{ 
              scale: isVolumeHovered ? 1.1 : 1,
              x: isVolumeHovered ? -8 : 0
            }}
            className="cursor-pointer"
            onClick={() => {
              const newVolume = volume === 0 ? 1 : 0;
              setVolume(newVolume);
              localStorage.setItem('audioVolume', newVolume.toString());
              if (playerRef.current) {
                playerRef.current.volume.value = 20 * Math.log10(newVolume);
              }
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {volume === 0 ? (
                <motion.div
                  key="muted"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <SpeakerSimpleSlash className={`w-5 h-5 transition-opacity duration-200 ${
                    isVolumeHovered ? 'text-foreground' : 'text-muted-foreground'
                  }`} />
                </motion.div>
              ) : (
                <motion.div
                  key="unmuted"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <SpeakerNone className={`w-5 h-5 transition-opacity duration-200 ${
                    isVolumeHovered ? 'text-foreground' : 'text-muted-foreground'
                  }`} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <div className="relative w-full">
            <motion.div
              animate={{ scale: isVolumeHovered ? 1.02 : 1 }}
              className="w-full"
            >
              <input
                type="range"
                min={0}
                max={1}
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                style={{
                  background: `linear-gradient(to right,
                    ${playedColor}50 0%,
                    ${playedColor}50 ${volume * 100}%,
                    ${futureColor}30 ${volume * 100}%,
                    ${futureColor}30 100%)`,
                }}
              />
            </motion.div>
          </div>
          <motion.div
            whileTap={{ scale: 0.9 }}
            animate={{ 
              scale: isVolumeHovered ? 1.1 : 1,
              x: isVolumeHovered ? 8 : 0
            }}
            className="cursor-pointer"
            onClick={() => {
              const newVolume = 1;
              setVolume(newVolume);
              localStorage.setItem('audioVolume', newVolume.toString());
              if (playerRef.current) {
                playerRef.current.volume.value = 20 * Math.log10(newVolume);
              }
            }}
          >
            <SpeakerHigh className={`w-5 h-5 transition-opacity duration-200 ${
              isVolumeHovered ? 'text-foreground' : 'text-muted-foreground'
            }`} />
          </motion.div>
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
          background: ${theme === 'dark' ? '#d1d5db' : '#4b5563'};
          cursor: pointer;
          opacity: 1;
        }
        input[type='range']::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${theme === 'dark' ? '#d1d5db' : '#4b5563'};
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