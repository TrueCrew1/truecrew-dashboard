import { BRAND } from "@/brand/config";

interface BrandLogoProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export function BrandLogo({ size = 36, className = "", glow = true }: BrandLogoProps) {
  return (
    <img
      src={BRAND.logoPath}
      alt={BRAND.name}
      width={size}
      height={size}
      className={`brand-logo${glow ? " brand-logo-glow" : ""} ${className}`.trim()}
      draggable={false}
    />
  );
}

interface BrandWordmarkProps {
  compact?: boolean;
  subtitle?: string;
}

export function BrandWordmark({ compact = false, subtitle }: BrandWordmarkProps) {
  return (
    <div className={`brand-wordmark${compact ? " brand-wordmark-compact" : ""}`}>
      <div className="brand-wordmark-title">
        <span className="brand-wordmark-true">TRUE</span>
        <span className="brand-wordmark-crew">CREW</span>
      </div>
      {subtitle ? <div className="brand-wordmark-sub">{subtitle}</div> : null}
    </div>
  );
}

interface BrandLockupProps {
  logoSize?: number;
  subtitle?: string;
  collapsed?: boolean;
}

export function BrandLockup({
  logoSize = 40,
  subtitle = BRAND.tagline,
  collapsed = false,
}: BrandLockupProps) {
  if (collapsed) {
    return <BrandLogo size={32} />;
  }

  return (
    <div className="brand-lockup">
      <BrandLogo size={logoSize} />
      <BrandWordmark subtitle={subtitle} compact />
    </div>
  );
}
