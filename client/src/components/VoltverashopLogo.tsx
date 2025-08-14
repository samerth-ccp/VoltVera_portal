interface VoltverashopLogoProps {
  size?: 'small' | 'large';
  className?: string;
}

export default function VoltverashopLogo({ size = 'large', className = '' }: VoltverashopLogoProps) {
  if (size === 'small') {
    return (
      <div className={`sidebar-brand ${className}`}>
        <div className="sidebar-handle"></div>
        <div className="sidebar-leaf-icon">
          <div className="sidebar-leaf"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`shopping-bag ${className}`}>
      <div className="bag-handle"></div>
      <div className="leaf-icon">
        <div className="leaf"></div>
      </div>
    </div>
  );
}
