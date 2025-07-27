
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Hls from 'hls.js';

function Player() {
  const { id } = useParams();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState('-1');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const hlsRef = useRef(null);
  const savedTimeRef = useRef(0); 
  const isProgrammaticQualityChangeRef = useRef(false); 
  const isFullscreenTransitionRef = useRef(false); 

  const getTimeStorageKey = () => `movie_${id}_time`;
  const getQualityStorageKey = () => `movie_${id}_quality`;

  
  useEffect(() => {
    const calculateDimensions = () => {
      if (containerRef.current) {
        const width = Math.min(containerRef.current.offsetWidth, 1200);
        const height = width * 9 / 16;
        setDimensions({ width, height });
      }
    };

    calculateDimensions();
    const handleResize = () => requestAnimationFrame(calculateDimensions);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  
  useEffect(() => {
    if (!dimensions.width || !id) return;

    let savedTimeToRestore = 0;
    let savedQualityToRestore = '-1';

    try {
      const storedTime = sessionStorage.getItem(getTimeStorageKey());
      if (storedTime) savedTimeToRestore = parseFloat(storedTime);

      const storedQuality = sessionStorage.getItem(getQualityStorageKey());
      if (storedQuality) savedQualityToRestore = storedQuality;
    } catch (e) {
      console.warn("Player: Could not read saved time/quality from storage", e);
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    
    setCurrentQuality(savedQualityToRestore);
    savedTimeRef.current = savedTimeToRestore; 

    const hls = new Hls({
      maxBufferSize: 60 * 1000 * 1000,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      maxBufferHole: 0.5,
      fragLoadingTimeOut: 20000,
      fragLoadingMaxRetry: 3,
      fragLoadingMaxRetryTimeout: 64000,
      startLevel: parseInt(savedQualityToRestore, 10), 
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

          
          
          if (savedQualityToRestore !== '-1') {
            const levelIndex = parseInt(savedQualityToRestore, 10);
            if (levelIndex >= 0 && levelIndex < hls.levels.length) {
              isProgrammaticQualityChangeRef.current = true; 
              hls.nextLevel = levelIndex;
              
              setTimeout(() => {
                isProgrammaticQualityChangeRef.current = false;
              }, 100);
            }
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          
          
          if (!isFullscreenTransitionRef.current && !isProgrammaticQualityChangeRef.current) {
            const level = hls.levels[data.level];
            if (level) {
              const qualityId = data.level === -1 ? '-1' : level.height.toString();
              setCurrentQuality(qualityId);
              try {
                sessionStorage.setItem(getQualityStorageKey(), qualityId);
              } catch (e) {
                console.warn("Player: Could not save quality to storage", e);
              }
            }
          }
        });

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          
          if (savedTimeToRestore > 0) {
            setTimeout(() => {
              if (videoRef.current) {
                console.log(`Restoring time to ${savedTimeToRestore} after MEDIA_ATTACHED`);
                videoRef.current.currentTime = savedTimeToRestore;
                
              }
            }, 200);
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS Error:", data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("Trying to recover network error...");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Trying to recover media error...");
                hls.recoverMediaError();
                break;
              default:
                console.log("Fatal network/media error, falling back to MP4");
                if (hlsRef.current) {
                  hlsRef.current.destroy();
                  hlsRef.current = null;
                }
                if (videoRef.current) {
                  videoRef.current.src = `/api/getfile/movies/${id}/m.mp4`;
                  if (savedTimeToRestore > 0) {
                    videoRef.current.currentTime = savedTimeToRestore;
                  }
                }
                break;
            }
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = hlsUrl;
        if (savedTimeToRestore > 0) {
          videoRef.current.currentTime = savedTimeToRestore;
        }
      } else {
        videoRef.current.src = `/api/getfile/movies/${id}/m.mp4`;
        if (savedTimeToRestore > 0) {
          videoRef.current.currentTime = savedTimeToRestore;
        }
      }
    };

    loadVideo();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [id, dimensions]);

  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const saveCurrentTime = () => {
      savedTimeRef.current = video.currentTime; 
      try {
        sessionStorage.setItem(getTimeStorageKey(), video.currentTime.toString());
      } catch (e) {
        console.warn("Player: Could not save time to storage", e);
      }
    };

    const handleTimeUpdate = () => {
      
      if (video.currentTime % 5 < 0.1) {
        saveCurrentTime();
      }
    };

    const handlePause = saveCurrentTime;
    const handleSeeking = saveCurrentTime;
    const handleBeforeUnload = saveCurrentTime;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveCurrentTime(); 
      } else {
        
        
        setTimeout(() => {
           if (videoRef.current && Math.abs(videoRef.current.currentTime - savedTimeRef.current) > 0.5) {
              videoRef.current.currentTime = savedTimeRef.current;
           }
        }, 100);
      }
    };

    const handleFullscreenChange = () => {
      isFullscreenTransitionRef.current = true;
      
      
      
      
      
      setTimeout(() => {
        isFullscreenTransitionRef.current = false;
      }, 300); 
    };

    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeking', handleSeeking);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    video.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      
      saveCurrentTime();
      
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeking', handleSeeking);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      video.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  
  const handleQualityChange = (qualityId) => {
    if (!hlsRef.current) return;
    
    const level = parseInt(qualityId, 10);
    
    hlsRef.current.nextLevel = level;
    
    
    setCurrentQuality(qualityId);
    try {
      sessionStorage.setItem(getQualityStorageKey(), qualityId);
    } catch (e) {
      console.warn("Player: Could not save quality change to storage", e);
    }
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