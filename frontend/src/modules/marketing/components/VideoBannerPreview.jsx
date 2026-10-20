import React, { useMemo } from 'react'
import { FaPlay } from 'react-icons/fa'
import api from '@/shared/services/api'

export default function VideoBannerPreview({
  videoUrl,
  videoType = 'background',
  className = 'w-full h-full object-cover',
  autoPlay = true,
  loop = true,
  muted = true,
  controls = false,
  badge = true
}) {
  const fileBase = useMemo(() => {
    const base = api.defaults.baseURL || ''
    return base.replace(/\/?api\/?$/, '')
  }, [])

  const resolveUrl = (url) => {
    if (!url) return ''
    const clean = String(url).trim()
    if (/^(data:|https?:\/\/|blob:)/i.test(clean)) return clean
    return `${fileBase}/${clean.replace(/^\/+/, '')}`
  }

  const embedInfo = useMemo(() => {
    if (!videoUrl || typeof videoUrl !== 'string' || videoUrl === 'null' || videoUrl === 'undefined') return null
    const cleanUrl = videoUrl.trim()
    if (!cleanUrl) return null

    // YouTube
    const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
    if (ytMatch && ytMatch[1]) {
      return {
        type: 'youtube',
        url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=${autoPlay ? 1 : 0}&mute=${muted ? 1 : 0}&loop=${loop ? 1 : 0}&playlist=${ytMatch[1]}&controls=${controls ? 1 : 0}`
      }
    }

    // TikTok
    const ttMatch = cleanUrl.match(/tiktok\.com\/.*\/video\/(\d+)/)
    if (ttMatch && ttMatch[1]) {
      return {
        type: 'tiktok',
        url: `https://www.tiktok.com/embed/v2/${ttMatch[1]}?autoplay=${autoPlay ? 1 : 0}`
      }
    }

    // Vimeo
    const vimeoMatch = cleanUrl.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        type: 'vimeo',
        url: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=${autoPlay ? 1 : 0}&muted=${muted ? 1 : 0}&loop=${loop ? 1 : 0}&controls=${controls ? 1 : 0}`
      }
    }

    // Direct video file
    return {
      type: 'direct',
      url: resolveUrl(cleanUrl)
    }
  }, [videoUrl, autoPlay, muted, loop, controls, fileBase])

  if (!embedInfo) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-center p-2">
        <div>
          <FaPlay className="text-purple-600 text-3xl mx-auto mb-1 opacity-70" />
          <div className="text-[10px] font-bold text-purple-700">No Video</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      {embedInfo.type === 'direct' ? (
        <video
          src={embedInfo.url}
          className={className}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline
          controls={controls}
          onError={(e) => {
            console.warn('[VideoBannerPreview] Video failed to load:', embedInfo.url)
          }}
        />
      ) : (
        <iframe
          src={embedInfo.url}
          className={`${className} pointer-events-none scale-105`}
          title="Video preview"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          frameBorder="0"
        />
      )}

      {badge && (
        <div className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shadow pointer-events-none z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          <span className="uppercase">{videoType || embedInfo.type || 'video'}</span>
        </div>
      )}
    </div>
  )
}
