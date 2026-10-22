export default function JsonLd({ data }: { data: object | object[] }) {
  const graph = { '@context': 'https://schema.org', '@graph': Array.isArray(data) ? data : [data] };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }}
    />
  );
}
