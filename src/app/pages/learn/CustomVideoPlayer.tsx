// Custom video player.
//
// Replaces the browser's default <video controls> chrome with our own
// inline tools row (play/pause, scrub bar, 10s back/forward, volume,
// playback speed, captions toggle, fullscreen). Captions arrive via the
// `captions` URL set by the tutor on the lesson.

import { useEffect, useRef, useState } from 'react';
import {
  FastForward,
  Maximize,
  Minimize,
  Pause,
  Play,
  Rewind,
  Settings,
  Subtitles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { currentUserScope } from '@/app/utils/userScope';

interface CustomVideoPlayerProps {
  src: string;
  /** Optional captions track URL (.vtt). .srt won't render natively. */
  captions?: string | null;
  /** Poster image to show before play. */
  poster?: string | null;
  /** Restores playback position by lesson id. */
  persistKey?: string;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function CustomVideoPlayer({ src, captions, poster, persistKey }: CustomVideoPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [showRates, setShowRates] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<number | null>(null);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const seekBy = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const next = Math.max(0, Math.min((v.duration || 0) + 0.5, v.currentTime + delta));
    v.currentTime = next;
  };

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  };

  const setVideoVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    if (val > 0 && v.muted) v.muted = false;
  };

  const toggleCaptions = () => {
    const v = videoRef.current;
    if (!v || !v.textTracks || v.textTracks.length === 0) return;
    const next = !captionsOn;
    for (let i = 0; i < v.textTracks.length; i += 1) {
      v.textTracks[i].mode = next ? 'showing' : 'disabled';
    }
    setCaptionsOn(next);
  };

  const toggleFullscreen = async () => {
    const root = wrapperRef.current;
    if (!root) return;
    if (!document.fullscreenElement) {
      await root.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  const setPlaybackRate = (r: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = r;
    setRate(r);
    setShowRates(false);
  };

  // Persisted position (per lesson).
  useEffect(() => {
    if (!persistKey) return;
    const v = videoRef.current;
    if (!v) return;
    try {
      const stored = localStorage.getItem(`da_video_time:${currentUserScope()}:${persistKey}`);
      if (stored) {
        const t = Number(stored);
        if (Number.isFinite(t)) {
          v.currentTime = t;
        }
      }
    } catch { /* ignore */ }
  }, [persistKey, src]);

  // Wire video element listeners.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onLoadedMeta = () => setDuration(v.duration || 0);
    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      if (persistKey) {
        try { localStorage.setItem(`da_video_time:${currentUserScope()}:${persistKey}`, String(v.currentTime)); } catch { /* ignore */ }
      }
    };
    const onVolume = () => { setVolume(v.volume); setMuted(v.muted); };
    const onRate = () => setRate(v.playbackRate);
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1));
      }
    };

    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('loadedmetadata', onLoadedMeta);
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('volumechange', onVolume);
    v.addEventListener('ratechange', onRate);
    v.addEventListener('progress', onProgress);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('loadedmetadata', onLoadedMeta);
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('volumechange', onVolume);
      v.removeEventListener('ratechange', onRate);
      v.removeEventListener('progress', onProgress);
    };
  }, [persistKey]);

  // Track fullscreen changes from any source (Esc, F11).
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Auto-hide controls while playing.
  const bumpControls = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    if (playing) {
      hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2500);
    }
  };
  useEffect(() => {
    bumpControls();
    return () => { if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!wrapperRef.current?.contains(document.activeElement) && document.activeElement !== document.body) {
        return;
      }
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
          seekBy(-10);
          break;
        case 'ArrowRight':
        case 'l':
          seekBy(10);
          break;
        case 'm':
          toggleMute();
          break;
        case 'c':
          toggleCaptions();
          break;
        case 'f':
          toggleFullscreen();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captionsOn]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={wrapperRef}
      onMouseMove={bumpControls}
      onMouseLeave={() => { if (playing) setControlsVisible(false); }}
      tabIndex={0}
      className="relative w-full h-full bg-black overflow-hidden group focus:outline-none"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        onClick={togglePlay}
        className="absolute inset-0 w-full h-full object-contain cursor-pointer bg-black"
        playsInline
        crossOrigin="anonymous"
      >
        {captions && (
          <track
            kind="captions"
            src={captions}
            srcLang="en"
            label="English"
            default={false}
          />
        )}
      </video>

      {/* Centered play overlay when paused */}
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
        >
          <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/90 text-slate-900 shadow-2xl scale-100 hover:scale-110 transition-transform">
            <Play className="w-9 h-9 ml-1 fill-current" />
          </span>
        </button>
      )}

      {/* Controls overlay */}
      <div
        className={[
          'absolute left-0 right-0 bottom-0 px-3 sm:px-4 pt-12 pb-3 bg-gradient-to-t from-black/85 via-black/60 to-transparent transition-opacity duration-300',
          controlsVisible || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      >
        {/* Scrub bar */}
        <div className="relative w-full h-1.5 rounded-full bg-white/20 mb-3 group/scrub cursor-pointer">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/30"
            style={{ width: `${bufferPercent}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="Seek"
            className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:opacity-0 group-hover/scrub:[&::-webkit-slider-thumb]:opacity-100
              [&::-moz-range-thumb]:appearance-none
              [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white"
          />
        </div>

        {/* Tools row */}
        <div className="flex items-center gap-1 sm:gap-2 text-white">
          <IconBtn label={playing ? 'Pause (k)' : 'Play (k)'} onClick={togglePlay}>
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </IconBtn>

          <IconBtn label="Back 10 seconds (j)" onClick={() => seekBy(-10)}>
            <Rewind className="w-5 h-5" />
            <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none mix-blend-difference">10</span>
          </IconBtn>

          <IconBtn label="Forward 10 seconds (l)" onClick={() => seekBy(10)}>
            <FastForward className="w-5 h-5" />
            <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none mix-blend-difference">10</span>
          </IconBtn>

          {/* Volume */}
          <div className="group/vol flex items-center gap-1">
            <IconBtn label={muted || volume === 0 ? 'Unmute (m)' : 'Mute (m)'} onClick={toggleMute}>
              {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </IconBtn>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => setVideoVolume(Number(e.target.value))}
              aria-label="Volume"
              className="w-0 group-hover/vol:w-20 transition-all h-1 appearance-none bg-white/30 rounded-full overflow-hidden cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>

          <span className="ml-1 text-xs font-medium tabular-nums text-white/90 hidden sm:inline">
            {formatTime(currentTime)} <span className="text-white/40">/ {formatTime(duration)}</span>
          </span>

          <div className="flex-1" />

          {captions && (
            <IconBtn
              label={captionsOn ? 'Hide captions (c)' : 'Show captions (c)'}
              onClick={toggleCaptions}
              pressed={captionsOn}
            >
              <Subtitles className="w-5 h-5" />
            </IconBtn>
          )}

          {/* Playback speed */}
          <div className="relative">
            <IconBtn label={`Playback speed (${rate}x)`} onClick={() => setShowRates((s) => !s)} pressed={showRates}>
              <Settings className="w-5 h-5" />
            </IconBtn>
            {showRates && (
              <div className="absolute bottom-full right-0 mb-2 min-w-[120px] rounded-lg bg-slate-900/95 border border-slate-700 backdrop-blur shadow-xl py-1 z-10">
                <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400">Speed</p>
                {PLAYBACK_RATES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setPlaybackRate(r)}
                    className={[
                      'block w-full px-3 py-1.5 text-left text-sm transition-colors',
                      r === rate ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-200 hover:bg-slate-800',
                    ].join(' ')}
                  >
                    {r}x{r === 1 ? '  · Normal' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          <IconBtn label={isFullscreen ? 'Exit fullscreen (f)' : 'Fullscreen (f)'} onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </IconBtn>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  pressed,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={[
        'relative inline-flex items-center justify-center w-9 h-9 rounded-md transition-colors',
        pressed ? 'bg-indigo-500/30 text-white' : 'text-white hover:bg-white/15',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
