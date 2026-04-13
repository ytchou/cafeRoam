interface ShopDescriptionProps {
  text: string
}

export function ShopDescription({ text }: ShopDescriptionProps) {
  if (!text) return null

  return (
    <p className="text-foreground/70 text-sm leading-relaxed whitespace-pre-wrap">
      {text}
    </p>
  )
}
