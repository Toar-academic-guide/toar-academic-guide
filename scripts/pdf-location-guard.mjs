export function disallowedPdfPaths(paths) {
  return paths.filter(
    (path) =>
      /\.pdf$/i.test(path) &&
      !/^src\/lib\/__fixtures__\/bagrut-pdf\/[^/]+\.pdf$/i.test(path) &&
      !/^docs\/admissions-verification\/.*\.pdf$/i.test(path),
  );
}
