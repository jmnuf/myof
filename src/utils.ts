
export const isspace = (c: string) => c.trim().length === 0;

export const sleep = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1_000));

export const clamp = (value: number, min: number, max: number) => Math.max(Math.min(value, max), min);

export const randi = (min: number, max: number = 0) => Math.floor((Math.random() * (max - min)) + min);

export function* listZip<A, B>(a: A[], b: B[]) {
  const smallest_length = Math.min(a.length, b.length);
  for (let i = 0; i < smallest_length; ++i) {
    yield [a[i], b[i]] as const;
  }
}

export function* iterZip<A, B>(a: Iterator<A>, b: Iterator<B>) {
  let step_a = a.next();
  let step_b = b.next();
  while (!step_a.done && !step_b.done) {
    yield [step_a.value, step_b.value] as const;
    step_a = a.next();
    step_b = b.next();
  }
}

export const List = {
  zip: listZip,
}

