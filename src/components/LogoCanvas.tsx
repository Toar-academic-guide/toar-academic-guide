interface Props {
  size?: number;
  brighten?: boolean;
  className?: string;
}

export default function LogoCanvas({ size = 70, brighten = false, className = '' }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brighten ? '/brand/myway-wordmark-inverse.svg' : '/brand/myway-wordmark.svg'}
      alt="MyWay"
      dir="ltr"
      width={606}
      height={186}
      className={`shrink-0 ${className}`}
      style={{ display: 'block', width: 'auto', height: size }}
    />
  );
}
