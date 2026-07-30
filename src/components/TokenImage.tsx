"use client";

import { useState } from "react";

interface TokenImageProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export function TokenImage({ src, alt, size = 20, className = "" }: TokenImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div 
        className={`rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover flex-shrink-0 ${className}`}
      onError={() => setError(true)}
      style={{ 
        width: size, 
        height: size, 
        minWidth: size, 
        minHeight: size,
        display: 'block'
      }}
    />
  );
}
