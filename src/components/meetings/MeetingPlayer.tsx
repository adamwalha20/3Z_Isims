'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Video,
  FileCheck,
  Sparkles,
} from 'lucide-react';

interface MeetingPlayerProps {
  storagePath?: string | null;
  playbackUrl?: string | null;
  durationSeconds?: number;
  mimeType?: string;
  onTimeUpdate?: (seconds: number) => void;
  seekToTime?: number | null;
  seekToSeconds?: number | null;
  meetingTitle?: string;
  title?: string;
  recordingDate?: string;
  provider?: string;
}

export default function MeetingPlayer({
  storagePath,
  playbackUrl,
  durationSeconds = 1800,
  mimeType = 'video/mp4',
  onTimeUpdate,
  seekToTime,
  seekToSeconds,
  meetingTitle,
  title,
  recordingDate,
  provider,
}: MeetingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const displayTitle = title || meetingTitle || 'Meeting Recording';
  const effectiveSeek = seekToSeconds !== undefined ? seekToSeconds : seekToTime;

  // Sync external seek request (e.g. from clicking a transcript timestamp)
  useEffect(() => {
    if (effectiveSeek !== null && effectiveSeek !== undefined && videoRef.current) {
      videoRef.current.currentTime = effectiveSeek;
      setCurrentTime(effectiveSeek);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [effectiveSeek]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (onTimeUpdate) {
      onTimeUpdate(curr);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  };

  const skipSeconds = (seconds: number) => {
    if (!videoRef.current) return;
    const nextTime = Math.min(Math.max(0, videoRef.current.currentTime + seconds), duration);
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const el = videoRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Video source resolution: check if valid external URL or Supabase storage path
  const rawUrl = playbackUrl || storagePath;
  const isDirectUrl = rawUrl?.startsWith('http://') || rawUrl?.startsWith('https://') || rawUrl?.startsWith('blob:');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const videoSrc: string = isDirectUrl && rawUrl
    ? rawUrl
    : rawUrl
    ? `${supabaseUrl}/storage/v1/object/authenticated/meeting-recordings/${rawUrl}`
    : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'; // Graceful preview fallback

  return (
    <div className="bg-slate-950 rounded-3xl overflow-hidden shadow-xl border border-slate-800 text-white flex flex-col">
      {/* Video Viewport */}
      <div className="relative aspect-video bg-black flex items-center justify-center group overflow-hidden">
        <video
          ref={videoRef}
          src={videoSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
          playsInline
        />

        {/* Center Play Overlay Button */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            aria-label="Play recording"
            className="absolute z-10 w-16 h-16 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all backdrop-blur-xs"
          >
            <Play className="w-8 h-8 ml-1" />
          </button>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/20 flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>HD ARCHIVE</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-300 font-mono text-[11px] font-semibold border border-slate-700/50">
              {formatTime(duration)}
            </span>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-300 text-[10px] font-mono border border-slate-700/50 uppercase">
            {mimeType.split('/')[1] || 'MP4'}
          </span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="p-4 bg-slate-900 flex flex-col gap-3">
        {/* Progress Bar Timeline */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-bold text-emerald-400 shrink-0">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={handleSeek}
              aria-label="Seek video position"
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:h-2 transition-all"
            />
          </div>
          <span className="text-[11px] font-mono text-slate-400 shrink-0">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Left: Playback controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-9 h-9 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center transition-all shadow-xs"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={() => skipSeconds(-10)}
              title="Skip back 10 seconds"
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => skipSeconds(10)}
              title="Skip forward 10 seconds"
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-xs"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Right: Speed options & Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Speed Selector */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700/60">
              {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => changeSpeed(rate)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-colors ${
                    playbackRate === rate
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <button
              onClick={toggleFullscreen}
              title="Fullscreen"
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
