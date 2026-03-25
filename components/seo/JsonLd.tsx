interface JsonLdProps {
  data: Record<string, unknown> | null;
}

export function JsonLd({ data }: JsonLdProps) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
        __html: JSON.stringify(data).replace(/<\//g, '<\\/'),
      }}
    />
  );
}
