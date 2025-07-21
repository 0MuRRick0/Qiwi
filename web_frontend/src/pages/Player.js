import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Hls from 'hls.js';
import styles from '../index.css';

function Player() {
  const { id } = useParams();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const hlsRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

 
  useEffect(() => {
    const calculateDimensions = () => {
      if (containerRef.current) {
        const width = Math.min(containerRef.current.offsetWidth, 1200);
        const height = width * 9 / 16;
        setDimensions({ width, height });
      }
    };

    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);

    return () => {
      window.removeEventListener('resize', calculateDimensions);
    };
  }, []);

  useEffect(() => {
    if (!dimensions.width) return;

    const hls = new Hls({
      maxMaxBufferLength: 30,
      maxBufferLength: 30,
      maxBufferSize: 60 * 1000 * 1000,
      maxBufferHole: 0.5,
      fragLoadingTimeOut: 20000,
      fragLoadingMaxRetry: 6, 
      fragLoadingMaxRetryTimeout: 64000,
      startLevel: -1,
    });
    hlsRef.current = hls;

    const loadVideo = () => {
      const hlsUrl = `/api/getfile/movies/${id}/transcoded/m_master.m3u8`;

      if (Hls.isSupported()) {
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          const availableQualities = data.levels.map((level, index) => ({
            id: index,
            height: level.height,
            bandwidth: level.bitrate,
            name: `${level.height}p`
          }));

          setQualities([
            { id: -1, height: 0, bandwidth: 0, name: 'Auto' },
            ...availableQualities
          ]);

         
          setCurrentQuality('-1');
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          const level = hls.levels[data.level];
          if (level) {
            setCurrentQuality(level.height.toString());
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
               
                if (hlsRef.current) {
                  hlsRef.current.destroy();
                }
                videoRef.current.src = `/api/getfile/movies/${id}/m.mp4`;
                videoRef.current.load();
                break;
            }
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
       
        videoRef.current.src = hlsUrl;
      } else {
       
        videoRef.current.src = `/api/getfile/movies/${id}/m.mp4`;
      }
    };

    loadVideo();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [id, dimensions]);

 
  useEffect(() => {
    const video = videoRef.current;

    const handleFullscreenChange = () => {
      if (document.fullscreenElement === null) {
        video.currentTime = currentTime;
        video.play();
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('fullscreenchange', handleFullscreenChange);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('fullscreenchange', handleFullscreenChange);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [currentTime]);

  const handleQualityChange = (qualityId) => {
    if (!hlsRef.current) return;
    const level = parseInt(qualityId);
    hlsRef.current.currentLevel = level;
    setCurrentQuality(qualityId);
  };

  return (
    <div className="player-container" ref={containerRef}>
      <div 
        className="video-wrapper"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxWidth: '100%'
        }}
      >
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          className="video-element"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000'
          }}
        />
      </div>

      {qualities.length > 0 && (
        <div className="quality-controls">
          <div className="quality-selector">
            <label htmlFor="quality-select">Quality: </label>
            <select
              id="quality-select"
              value={currentQuality}
              onChange={(e) => handleQualityChange(e.target.value)}
            >
              {qualities.map((quality) => (
                <option key={quality.id} value={quality.id}>
                  {quality.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default Player;