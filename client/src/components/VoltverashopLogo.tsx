import React from 'react';
import logoImage from '@assets/cropped-Green-and-White-Eco-Friendly-Packaging-Logo-129-x-129-px-70-x-60-px-132-x-60-px-129-x-129-px-500-x-500-px (1)_1755373949404.png';

interface VoltverashopLogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'hero';
  className?: string;
}

export default function VoltverashopLogo({ size = 'large', className = '' }: VoltverashopLogoProps) {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
    xlarge: 'w-24 h-24',
    hero: 'w-40 h-40 sm:w-52 sm:h-52 lg:w-64 lg:h-64'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      <img 
        src={logoImage} 
        alt="Voltverashop Logo" 
        className="w-full h-full object-contain"
      />
    </div>
  );
}