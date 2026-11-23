/** Isolate scores, dates and the quoted SAT formula without changing the copy. */
export default function AdmissionGuidanceText({ text }: { text: string }) {
  return text
    .split(/(M \* 0\.67 \+ R \* 0\.33|\d+(?:[.,]\d+)*%?|SAT|ACT|Superscore)/g)
    .map((part, index) =>
      /^(?:\d|M \*|SAT|ACT|Superscore)/.test(part) ? (
        <bdi dir="ltr" key={index}>
          {part}
        </bdi>
      ) : (
        part
      ),
    );
}
