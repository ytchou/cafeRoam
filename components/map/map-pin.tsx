interface MapPinProps {
  active?: boolean;
}

const SIZE_DEFAULT = 40;
const SIZE_ACTIVE = 44;
const COLOR_DEFAULT = 'var(--map-pin)';
const COLOR_ACTIVE = 'var(--pin-selected)';
const TIP_HEIGHT = 8;

export function MapPin({ active = false }: MapPinProps) {
  const size = active ? SIZE_ACTIVE : SIZE_DEFAULT;
  const color = active ? COLOR_ACTIVE : COLOR_DEFAULT;
  const radius = size / 2;
  const iconSize = Math.round(size * 0.5);

  return (
    <svg
      width={size}
      height={size + TIP_HEIGHT}
      viewBox={`0 0 ${size} ${size + TIP_HEIGHT}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx={radius} cy={radius} r={radius} fill={color} />
      <polygon
        points={`${radius - 6},${size - 2} ${radius},${size + TIP_HEIGHT} ${radius + 6},${size - 2}`}
        fill={color}
      />
      <g
        transform={`translate(${(size - iconSize) / 2}, ${(size - iconSize) / 2})`}
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path
          d={`M${iconSize * 0.146} ${iconSize * 0.333}h${iconSize * 0.542}a${iconSize * 0.167} ${iconSize * 0.167} 0 0 1 0 ${iconSize * 0.333}h-${iconSize * 0.542}z`}
        />
        <path
          d={`M${iconSize * 0.688} ${iconSize * 0.5}a${iconSize * 0.208} ${iconSize * 0.208} 0 0 0 0-${iconSize * 0.333}`}
        />
        <path
          d={`M${iconSize * 0.083} ${iconSize * 0.667}l${iconSize * 0.125} ${iconSize * 0.25}h${iconSize * 0.583}l${iconSize * 0.125}-${iconSize * 0.25}`}
        />
      </g>
    </svg>
  );
}
