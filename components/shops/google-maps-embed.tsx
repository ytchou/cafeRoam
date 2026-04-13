'use client'

interface GoogleMapsEmbedProps {
  latitude: number
  longitude: number
  googlePlaceId?: string | null
}

/**
 * Embedded Google Maps component for shop detail page.
 * Uses Place mode when googlePlaceId is available, falls back to View mode.
 */
export function GoogleMapsEmbed({
  latitude,
  longitude,
  googlePlaceId,
}: GoogleMapsEmbedProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div className="flex h-[200px] w-full items-center justify-center bg-muted rounded-lg">
        <span className="text-muted-foreground text-sm">Map unavailable</span>
      </div>
    )
  }

  const embedUrl = googlePlaceId
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=place_id:${googlePlaceId}`
    : `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${latitude},${longitude}&zoom=16`

  return (
    <iframe
      title="Google Maps"
      src={embedUrl}
      className="w-full h-[200px] rounded-lg"
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  )
}
