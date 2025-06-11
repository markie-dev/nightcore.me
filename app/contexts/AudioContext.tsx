'use client';

import React, { createContext, useContext, useState, useRef } from 'react';
import * as Tone from 'tone';

interface AudioContextType {
  isUploaded: boolean;
  setIsUploaded: (value: boolean) => void;
  fileName: string;
  setFileName: (value: string) => void;
  thumbnail: string | null;
  setThumbnail: (value: string | null) => void;
  playerRef: React.MutableRefObject<Tone.Player | null>;
  duration: number;
  setDuration: (value: number) => void;
  playbackRate: number;
  setPlaybackRate: (value: number) => void;
  isPlaying: boolean;
  setIsPlaying: (value: boolean) => void;
  isFirstMount: boolean;
  setIsFirstMount: (value: boolean) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isUploaded, setIsUploaded] = useState(false);
  const [fileName, setFileName] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFirstMount, setIsFirstMount] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const playerRef = useRef<Tone.Player | null>(null);

  return (
    <AudioContext.Provider value={{
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
      setIsPlaying,
      isFirstMount,
      setIsFirstMount,
      isProcessing,
      setIsProcessing,
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}