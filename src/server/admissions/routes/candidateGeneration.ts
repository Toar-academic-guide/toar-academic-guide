import type { RouteAction } from './actions';

export function* generateRouteActionSets(actions: RouteAction[]): Generator<RouteAction[]> {
  const sorted = [...new Map(actions.map((action) => [action.id, action])).values()].sort(
    (left, right) => left.id.localeCompare(right.id),
  );

  for (const action of sorted) {
    yield [action];
  }

  for (let first = 0; first < sorted.length; first += 1) {
    for (let second = first + 1; second < sorted.length; second += 1) {
      const pair = [sorted[first]!, sorted[second]!] as const;
      if (isSupportedPair(pair)) {
        yield [...pair];
      }
    }
  }
}

function isSupportedPair(actions: readonly [RouteAction, RouteAction]): boolean {
  const [left, right] = actions;
  if (left.kind === 'add_subject' && right.kind === 'add_subject') return false;
  if (left.kind === 'psychometric' && right.kind === 'psychometric') return false;

  const leftSubject = 'subjectId' in left ? left.subjectId : undefined;
  const rightSubject = 'subjectId' in right ? right.subjectId : undefined;
  if (!leftSubject || leftSubject !== rightSubject) return true;
  if (left.kind === 'add_subject' || right.kind === 'add_subject') return false;
  return left.kind !== right.kind;
}
