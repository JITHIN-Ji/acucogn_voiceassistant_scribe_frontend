import { useEffect, useRef } from 'react';

export function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    document.body.classList.add('page-background', 'home-page-bg');
    return () => {
      document.body.classList.remove('page-background', 'home-page-bg');
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Start with muted so autoplay works
    video.muted = true;

    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Video is playing, now try to unmute after a short delay
          setTimeout(() => {
            video.muted = false;
            video.play().catch(() => {
              console.log('Autoplay with sound blocked by browser');
            });
          }, 500);
        })
        .catch((error) => {
          console.log('Autoplay failed:', error);
          const handleInteraction = () => {
            video.play();
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
          };
          document.addEventListener('click', handleInteraction);
          document.addEventListener('touchstart', handleInteraction);
        });
    }

    const handleError = () => {
      console.error('Video error:', video.error);
    };
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div className="home-container">
      <div className="left-section">
        <div className="hero">
          <div className="hero-content">
            <h1>Acucogn Ambient Scribe</h1>
            <p className="subtle subtitle-prominent">Let Doctors talk. We handle notes.</p>
          </div>
        </div>
      </div>

      <div className="video-container">
        <video 
          ref={videoRef}
          className="hero-video"
          autoPlay 
          loop 
          playsInline
          muted
          controls
        >
          <source src="/videos/InShot_20251110_163959340.mp4" type="video/mp4" />
          <source src="/videos/your-video.webm" type="video/webm" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}