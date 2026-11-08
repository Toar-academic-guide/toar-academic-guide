# Social short links

`/go/<slug>` links are fixed redirects declared in `src/lib/socialShortLinks.ts`. For example, `/go/retake-x` redirects to the complete MyWay calculator URL and its four approved UTM values.

To add or change a link, edit that mapping in a reviewed code change. Keep the slug lowercase and path-free, and set a complete `https://findmyway.co.il` destination. The mapping validator rejects external origins, credentials, unsafe schemes, encoded or traversal paths, and `/go/` loops. Run `npx vitest run src/lib/socialShortLinks.test.ts src/proxy.test.ts`, then deploy through the normal application release process. Redirects use 307 with `Cache-Control: no-store` so mapping changes take effect on the next request.

These redirects do not emit analytics events or count requests. Redirect request counts were left out to keep navigation independent of analytics availability and latency; no request count should be described as unique people.
