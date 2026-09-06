/**
 * MosaicLogo — uses the actual mosaic_logo.svg pixel-art tiles.
 *
 * The icon is the mosaic-tile "M" extracted from the source SVG,
 * cropped to a tight square viewBox around the pixel grid.
 *
 * The wordmark renders the gradient "Mosaic" text from the same SVG.
 */

interface MosaicLogoProps {
  size?: number
  className?: string
}

/** Square pixel-art M icon — extracted from mosaic_logo.svg tile grid.
 *  Original tiles are in a g translate(60,60), spanning x:60–779, y:174–665.
 *  We shift by (-60,-60) to normalise, then crop to the tile bounds:
 *  x:0–735, y:114–621  →  viewBox="0 114 839 552"  (with translate applied)
 */
export function MosaicLogo({ size = 36, className }: MosaicLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="120 234 719 491"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mosaic logo"
    >
      <g transform="translate(60,60)">
        <rect x="60" y="174" width="16" height="16" rx="3" ry="3" fill="#2c89a9"/>
        <rect x="79" y="174" width="16" height="16" rx="3" ry="3" fill="#288ba6"/>
        <rect x="98" y="174" width="16" height="16" rx="3" ry="3" fill="#248da2"/>
        <rect x="117" y="174" width="16" height="16" rx="3" ry="3" fill="#21909e"/>
        <rect x="136" y="174" width="16" height="16" rx="3" ry="3" fill="#1d929a"/>
        <rect x="155" y="174" width="16" height="16" rx="3" ry="3" fill="#199597"/>
        <rect x="174" y="174" width="16" height="16" rx="3" ry="3" fill="#219692"/>
        <rect x="193" y="174" width="16" height="16" rx="3" ry="3" fill="#2d978d"/>
        <rect x="212" y="174" width="16" height="16" rx="3" ry="3" fill="#389888"/>
        <rect x="231" y="174" width="16" height="16" rx="3" ry="3" fill="#449982"/>
        <rect x="250" y="174" width="16" height="16" rx="3" ry="3" fill="#509a7d"/>
        <rect x="269" y="174" width="16" height="16" rx="3" ry="3" fill="#5b9b78"/>
        <rect x="554" y="174" width="16" height="16" rx="3" ry="3" fill="#db973a"/>
        <rect x="573" y="174" width="16" height="16" rx="3" ry="3" fill="#da9239"/>
        <rect x="592" y="174" width="16" height="16" rx="3" ry="3" fill="#d98e38"/>
        <rect x="611" y="174" width="16" height="16" rx="3" ry="3" fill="#d88a37"/>
        <rect x="630" y="174" width="16" height="16" rx="3" ry="3" fill="#d78536"/>
        <rect x="649" y="174" width="16" height="16" rx="3" ry="3" fill="#d68136"/>
        <rect x="668" y="174" width="16" height="16" rx="3" ry="3" fill="#d47d35"/>
        <rect x="687" y="174" width="16" height="16" rx="3" ry="3" fill="#d37834"/>
        <rect x="706" y="174" width="16" height="16" rx="3" ry="3" fill="#d27433"/>
        <rect x="725" y="174" width="16" height="16" rx="3" ry="3" fill="#d17032"/>
        <rect x="744" y="174" width="16" height="16" rx="3" ry="3" fill="#d06b31"/>
        <rect x="763" y="174" width="16" height="16" rx="3" ry="3" fill="#cf6730"/>
        <rect x="60" y="193" width="16" height="16" rx="3" ry="3" fill="#288ba6"/>
        <rect x="79" y="193" width="16" height="16" rx="3" ry="3" fill="#248da2"/>
        <rect x="98" y="193" width="16" height="16" rx="3" ry="3" fill="#21909e"/>
        <rect x="117" y="193" width="16" height="16" rx="3" ry="3" fill="#1d929a"/>
        <rect x="136" y="193" width="16" height="16" rx="3" ry="3" fill="#199597"/>
        <rect x="155" y="193" width="16" height="16" rx="3" ry="3" fill="#219692"/>
        <rect x="174" y="193" width="16" height="16" rx="3" ry="3" fill="#2d978d"/>
        <rect x="193" y="193" width="16" height="16" rx="3" ry="3" fill="#389888"/>
        <rect x="212" y="193" width="16" height="16" rx="3" ry="3" fill="#449982"/>
        <rect x="231" y="193" width="16" height="16" rx="3" ry="3" fill="#509a7d"/>
        <rect x="250" y="193" width="16" height="16" rx="3" ry="3" fill="#5b9b78"/>
        <rect x="269" y="193" width="16" height="16" rx="3" ry="3" fill="#679c73"/>
        <rect x="554" y="193" width="16" height="16" rx="3" ry="3" fill="#da9239"/>
        <rect x="573" y="193" width="16" height="16" rx="3" ry="3" fill="#d98e38"/>
        <rect x="592" y="193" width="16" height="16" rx="3" ry="3" fill="#d88a37"/>
        <rect x="611" y="193" width="16" height="16" rx="3" ry="3" fill="#d78536"/>
        <rect x="630" y="193" width="16" height="16" rx="3" ry="3" fill="#d68136"/>
        <rect x="649" y="193" width="16" height="16" rx="3" ry="3" fill="#d47d35"/>
        <rect x="668" y="193" width="16" height="16" rx="3" ry="3" fill="#d37834"/>
        <rect x="687" y="193" width="16" height="16" rx="3" ry="3" fill="#d27433"/>
        <rect x="706" y="193" width="16" height="16" rx="3" ry="3" fill="#d17032"/>
        <rect x="725" y="193" width="16" height="16" rx="3" ry="3" fill="#d06b31"/>
        <rect x="744" y="193" width="16" height="16" rx="3" ry="3" fill="#cf6730"/>
        <rect x="763" y="193" width="16" height="16" rx="3" ry="3" fill="#ce632f"/>
        <rect x="136" y="212" width="16" height="16" rx="3" ry="3" fill="#219692"/>
        <rect x="155" y="212" width="16" height="16" rx="3" ry="3" fill="#2d978d"/>
        <rect x="174" y="212" width="16" height="16" rx="3" ry="3" fill="#389888"/>
        <rect x="193" y="212" width="16" height="16" rx="3" ry="3" fill="#449982"/>
        <rect x="212" y="212" width="16" height="16" rx="3" ry="3" fill="#509a7d"/>
        <rect x="231" y="212" width="16" height="16" rx="3" ry="3" fill="#5b9b78"/>
        <rect x="250" y="212" width="16" height="16" rx="3" ry="3" fill="#679c73"/>
        <rect x="269" y="212" width="16" height="16" rx="3" ry="3" fill="#729d6e"/>
        <rect x="288" y="212" width="16" height="16" rx="3" ry="3" fill="#7e9e68"/>
        <rect x="535" y="212" width="16" height="16" rx="3" ry="3" fill="#da9239"/>
        <rect x="554" y="212" width="16" height="16" rx="3" ry="3" fill="#d98e38"/>
        <rect x="573" y="212" width="16" height="16" rx="3" ry="3" fill="#d88a37"/>
        <rect x="592" y="212" width="16" height="16" rx="3" ry="3" fill="#d78536"/>
        <rect x="611" y="212" width="16" height="16" rx="3" ry="3" fill="#d68136"/>
        <rect x="630" y="212" width="16" height="16" rx="3" ry="3" fill="#d47d35"/>
        <rect x="649" y="212" width="16" height="16" rx="3" ry="3" fill="#d37834"/>
        <rect x="668" y="212" width="16" height="16" rx="3" ry="3" fill="#d27433"/>
        <rect x="687" y="212" width="16" height="16" rx="3" ry="3" fill="#d17032"/>
        <rect x="136" y="231" width="16" height="16" rx="3" ry="3" fill="#2d978d"/>
        <rect x="155" y="231" width="16" height="16" rx="3" ry="3" fill="#389888"/>
        <rect x="174" y="231" width="16" height="16" rx="3" ry="3" fill="#449982"/>
        <rect x="193" y="231" width="16" height="16" rx="3" ry="3" fill="#509a7d"/>
        <rect x="212" y="231" width="16" height="16" rx="3" ry="3" fill="#5b9b78"/>
        <rect x="231" y="231" width="16" height="16" rx="3" ry="3" fill="#679c73"/>
        <rect x="250" y="231" width="16" height="16" rx="3" ry="3" fill="#729d6e"/>
        <rect x="269" y="231" width="16" height="16" rx="3" ry="3" fill="#7e9e68"/>
        <rect x="288" y="231" width="16" height="16" rx="3" ry="3" fill="#899f63"/>
        <rect x="535" y="231" width="16" height="16" rx="3" ry="3" fill="#d98e38"/>
        <rect x="554" y="231" width="16" height="16" rx="3" ry="3" fill="#d88a37"/>
        <rect x="573" y="231" width="16" height="16" rx="3" ry="3" fill="#d78536"/>
        <rect x="592" y="231" width="16" height="16" rx="3" ry="3" fill="#d68136"/>
        <rect x="611" y="231" width="16" height="16" rx="3" ry="3" fill="#d47d35"/>
        <rect x="630" y="231" width="16" height="16" rx="3" ry="3" fill="#d37834"/>
        <rect x="649" y="231" width="16" height="16" rx="3" ry="3" fill="#d27433"/>
        <rect x="668" y="231" width="16" height="16" rx="3" ry="3" fill="#d17032"/>
        <rect x="687" y="231" width="16" height="16" rx="3" ry="3" fill="#d06b31"/>
        <rect x="136" y="250" width="16" height="16" rx="3" ry="3" fill="#389888"/>
        <rect x="155" y="250" width="16" height="16" rx="3" ry="3" fill="#449982"/>
        <rect x="174" y="250" width="16" height="16" rx="3" ry="3" fill="#509a7d"/>
        <rect x="193" y="250" width="16" height="16" rx="3" ry="3" fill="#5b9b78"/>
        <rect x="212" y="250" width="16" height="16" rx="3" ry="3" fill="#679c73"/>
        <rect x="231" y="250" width="16" height="16" rx="3" ry="3" fill="#729d6e"/>
        <rect x="250" y="250" width="16" height="16" rx="3" ry="3" fill="#7e9e68"/>
        <rect x="269" y="250" width="16" height="16" rx="3" ry="3" fill="#899f63"/>
        <rect x="288" y="250" width="16" height="16" rx="3" ry="3" fill="#95a05e"/>
        <rect x="307" y="250" width="16" height="16" rx="3" ry="3" fill="#a1a159"/>
        <rect x="516" y="250" width="16" height="16" rx="3" ry="3" fill="#d98e38"/>
        <rect x="535" y="250" width="16" height="16" rx="3" ry="3" fill="#d88a37"/>
        <rect x="554" y="250" width="16" height="16" rx="3" ry="3" fill="#d78536"/>
        <rect x="573" y="250" width="16" height="16" rx="3" ry="3" fill="#d68136"/>
        <rect x="592" y="250" width="16" height="16" rx="3" ry="3" fill="#d47d35"/>
        <rect x="611" y="250" width="16" height="16" rx="3" ry="3" fill="#d37834"/>
        <rect x="630" y="250" width="16" height="16" rx="3" ry="3" fill="#d27433"/>
        <rect x="649" y="250" width="16" height="16" rx="3" ry="3" fill="#d17032"/>
        <rect x="668" y="250" width="16" height="16" rx="3" ry="3" fill="#d06b31"/>
        <rect x="687" y="250" width="16" height="16" rx="3" ry="3" fill="#cf6730"/>
        <rect x="136" y="459" width="16" height="16" rx="3" ry="3" fill="#b8a34f"/>
        <rect x="155" y="459" width="16" height="16" rx="3" ry="3" fill="#c3a449"/>
        <rect x="269" y="459" width="16" height="16" rx="3" ry="3" fill="#db973a"/>
        <rect x="288" y="459" width="16" height="16" rx="3" ry="3" fill="#da9239"/>
        <rect x="307" y="459" width="16" height="16" rx="3" ry="3" fill="#d98e38"/>
        <rect x="326" y="459" width="16" height="16" rx="3" ry="3" fill="#d88a37"/>
        <rect x="345" y="459" width="16" height="16" rx="3" ry="3" fill="#d78536"/>
        <rect x="364" y="459" width="16" height="16" rx="3" ry="3" fill="#d68136"/>
        <rect x="383" y="459" width="16" height="16" rx="3" ry="3" fill="#d47d35"/>
        <rect x="402" y="459" width="16" height="16" rx="3" ry="3" fill="#d37834"/>
        <rect x="421" y="459" width="16" height="16" rx="3" ry="3" fill="#d27433"/>
        <rect x="440" y="459" width="16" height="16" rx="3" ry="3" fill="#d17032"/>
        <rect x="459" y="459" width="16" height="16" rx="3" ry="3" fill="#d06b31"/>
        <rect x="573" y="459" width="16" height="16" rx="3" ry="3" fill="#cd5f3f"/>
        <rect x="592" y="459" width="16" height="16" rx="3" ry="3" fill="#cd6146"/>
        <rect x="611" y="459" width="16" height="16" rx="3" ry="3" fill="#cd624d"/>
        <rect x="630" y="459" width="16" height="16" rx="3" ry="3" fill="#cd6454"/>
        <rect x="649" y="459" width="16" height="16" rx="3" ry="3" fill="#cd655b"/>
        <rect x="668" y="459" width="16" height="16" rx="3" ry="3" fill="#ce6662"/>
        <rect x="687" y="459" width="16" height="16" rx="3" ry="3" fill="#ce686a"/>
        <rect x="136" y="592" width="16" height="16" rx="3" ry="3" fill="#db973a"/>
        <rect x="155" y="592" width="16" height="16" rx="3" ry="3" fill="#da9239"/>
        <rect x="573" y="592" width="16" height="16" rx="3" ry="3" fill="#ce6971"/>
        <rect x="592" y="592" width="16" height="16" rx="3" ry="3" fill="#ce6b78"/>
        <rect x="611" y="592" width="16" height="16" rx="3" ry="3" fill="#cf6c7f"/>
        <rect x="630" y="592" width="16" height="16" rx="3" ry="3" fill="#cf6d86"/>
        <rect x="649" y="592" width="16" height="16" rx="3" ry="3" fill="#cf6f8d"/>
        <rect x="668" y="592" width="16" height="16" rx="3" ry="3" fill="#cf7094"/>
        <rect x="687" y="592" width="16" height="16" rx="3" ry="3" fill="#d0719b"/>
        <rect x="136" y="611" width="16" height="16" rx="3" ry="3" fill="#da9239"/>
        <rect x="155" y="611" width="16" height="16" rx="3" ry="3" fill="#d98e38"/>
        <rect x="573" y="611" width="16" height="16" rx="3" ry="3" fill="#ce6b78"/>
        <rect x="592" y="611" width="16" height="16" rx="3" ry="3" fill="#cf6c7f"/>
        <rect x="611" y="611" width="16" height="16" rx="3" ry="3" fill="#cf6d86"/>
        <rect x="630" y="611" width="16" height="16" rx="3" ry="3" fill="#cf6f8d"/>
        <rect x="649" y="611" width="16" height="16" rx="3" ry="3" fill="#cf7094"/>
        <rect x="668" y="611" width="16" height="16" rx="3" ry="3" fill="#d0719b"/>
        <rect x="687" y="611" width="16" height="16" rx="3" ry="3" fill="#d073a2"/>
        <rect x="60" y="630" width="16" height="16" rx="3" ry="3" fill="#dd9f3c"/>
        <rect x="79" y="630" width="16" height="16" rx="3" ry="3" fill="#dc9b3b"/>
        <rect x="98" y="630" width="16" height="16" rx="3" ry="3" fill="#db973a"/>
        <rect x="117" y="630" width="16" height="16" rx="3" ry="3" fill="#da9239"/>
        <rect x="136" y="630" width="16" height="16" rx="3" ry="3" fill="#d98e38"/>
        <rect x="155" y="630" width="16" height="16" rx="3" ry="3" fill="#d88a37"/>
        <rect x="174" y="630" width="16" height="16" rx="3" ry="3" fill="#d78536"/>
        <rect x="193" y="630" width="16" height="16" rx="3" ry="3" fill="#d68136"/>
        <rect x="212" y="630" width="16" height="16" rx="3" ry="3" fill="#d47d35"/>
        <rect x="231" y="630" width="16" height="16" rx="3" ry="3" fill="#d37834"/>
        <rect x="516" y="630" width="16" height="16" rx="3" ry="3" fill="#ce686a"/>
        <rect x="535" y="630" width="16" height="16" rx="3" ry="3" fill="#ce6971"/>
        <rect x="554" y="630" width="16" height="16" rx="3" ry="3" fill="#ce6b78"/>
        <rect x="573" y="630" width="16" height="16" rx="3" ry="3" fill="#cf6c7f"/>
        <rect x="592" y="630" width="16" height="16" rx="3" ry="3" fill="#cf6d86"/>
        <rect x="611" y="630" width="16" height="16" rx="3" ry="3" fill="#cf6f8d"/>
        <rect x="630" y="630" width="16" height="16" rx="3" ry="3" fill="#cf7094"/>
        <rect x="649" y="630" width="16" height="16" rx="3" ry="3" fill="#d0719b"/>
        <rect x="668" y="630" width="16" height="16" rx="3" ry="3" fill="#d073a2"/>
        <rect x="687" y="630" width="16" height="16" rx="3" ry="3" fill="#cf74a7"/>
        <rect x="706" y="630" width="16" height="16" rx="3" ry="3" fill="#c976a2"/>
        <rect x="725" y="630" width="16" height="16" rx="3" ry="3" fill="#c3779c"/>
        <rect x="744" y="630" width="16" height="16" rx="3" ry="3" fill="#bd7997"/>
        <rect x="763" y="630" width="16" height="16" rx="3" ry="3" fill="#b87b92"/>
        <rect x="60" y="649" width="16" height="16" rx="3" ry="3" fill="#dc9b3b"/>
        <rect x="79" y="649" width="16" height="16" rx="3" ry="3" fill="#db973a"/>
        <rect x="98" y="649" width="16" height="16" rx="3" ry="3" fill="#da9239"/>
        <rect x="117" y="649" width="16" height="16" rx="3" ry="3" fill="#d98e38"/>
        <rect x="136" y="649" width="16" height="16" rx="3" ry="3" fill="#d88a37"/>
        <rect x="155" y="649" width="16" height="16" rx="3" ry="3" fill="#d78536"/>
        <rect x="174" y="649" width="16" height="16" rx="3" ry="3" fill="#d68136"/>
        <rect x="193" y="649" width="16" height="16" rx="3" ry="3" fill="#d47d35"/>
        <rect x="212" y="649" width="16" height="16" rx="3" ry="3" fill="#d37834"/>
        <rect x="231" y="649" width="16" height="16" rx="3" ry="3" fill="#d27433"/>
        <rect x="516" y="649" width="16" height="16" rx="3" ry="3" fill="#ce6971"/>
        <rect x="535" y="649" width="16" height="16" rx="3" ry="3" fill="#ce6b78"/>
        <rect x="554" y="649" width="16" height="16" rx="3" ry="3" fill="#cf6c7f"/>
        <rect x="573" y="649" width="16" height="16" rx="3" ry="3" fill="#cf6d86"/>
        <rect x="592" y="649" width="16" height="16" rx="3" ry="3" fill="#cf6f8d"/>
        <rect x="611" y="649" width="16" height="16" rx="3" ry="3" fill="#cf7094"/>
        <rect x="630" y="649" width="16" height="16" rx="3" ry="3" fill="#d0719b"/>
        <rect x="649" y="649" width="16" height="16" rx="3" ry="3" fill="#d073a2"/>
        <rect x="668" y="649" width="16" height="16" rx="3" ry="3" fill="#cf74a7"/>
        <rect x="687" y="649" width="16" height="16" rx="3" ry="3" fill="#c976a2"/>
        <rect x="706" y="649" width="16" height="16" rx="3" ry="3" fill="#c3779c"/>
        <rect x="725" y="649" width="16" height="16" rx="3" ry="3" fill="#bd7997"/>
        <rect x="744" y="649" width="16" height="16" rx="3" ry="3" fill="#b87b92"/>
        <rect x="763" y="649" width="16" height="16" rx="3" ry="3" fill="#b27c8d"/>
      </g>
    </svg>
  )
}

/**
 * MosaicWordmark — the gradient "Mosaic" text from mosaic_logo.svg,
 * rendered inline as an SVG for crisp display at any size.
 * Uses the same Liberation Serif / Georgia bold italic as the source.
 */
interface MosaicWordmarkProps {
  height?: number
  className?: string
}

export function MosaicWordmark({ height = 28, className }: MosaicWordmarkProps) {
  return (
    <svg
      height={height}
      viewBox="0 0 660 220"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mosaic"
    >
      <g fontFamily="Georgia, 'Liberation Serif', serif" fontWeight="bold" fontStyle="italic" fontSize="210">
        <text x="0"   y="200" fill="#8B3A2F">M</text>
        <text x="185" y="200" fill="#B08A3E">o</text>
        <text x="290" y="200" fill="#4A6B54">s</text>
        <text x="368" y="200" fill="#2C3E50">a</text>
        <text x="473" y="200" fill="#6B2E42">i</text>
        <text x="531" y="200" fill="#5B4A6B">c</text>
      </g>
    </svg>
  )
}
