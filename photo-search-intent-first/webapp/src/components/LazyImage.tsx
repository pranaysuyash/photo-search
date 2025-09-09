import React, { useRef, useEffect, memo, useState } from 'react';
import { imageLoadingService } from '../services/ImageLoadingService';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  onLoad?: () => void;
  onError?: () => void;
  enableProgressiveLoading?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

const LazyImage = memo<LazyImageProps>(({ 
  src, 
  alt, 
  onLoad, 
  onError, 
  className = '', 
  enableProgressiveLoading = true,
  quality = 'medium',
  ...props 
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !src) return;

    const handleLoad = () => {
      setIsLoaded(true);
      onLoad?.();
    };

    const handleError = () => {
      setHasError(true);
      onError?.();
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    // Start observing for lazy loading
    imageLoadingService.observeImage(img, src);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src, onLoad, onError]);

  const combinedClassName = `
    ${className}
    ${enableProgressiveLoading && !isLoaded ? 'transition-opacity duration-300 opacity-0' : ''}
    ${isLoaded ? 'opacity-100' : ''}
    ${hasError ? 'bg-red-100' : ''}
  `.trim();

  return (
    <img
      ref={imgRef}
      alt={alt}
      className={combinedClassName}
      {...props}
      // Don't set src - it will be set by the service
      style={{
        ...props.style,
        ...(enableProgressiveLoading && !isLoaded ? {
          backgroundColor: '#f3f4f6',
          backgroundImage: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s infinite linear'
        } : {})
      }}
    />
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;