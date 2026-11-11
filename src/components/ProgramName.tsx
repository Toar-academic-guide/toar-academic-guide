export default function ProgramName({ name }: { name: string }) {
  return name.split(/(\((?:B|M|Ph)\.[A-Za-z.]+\))/).map((part, index) =>
    index % 2 ? (
      <bdi key={index} dir="ltr">
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}
