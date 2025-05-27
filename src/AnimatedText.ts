import type { ValueState } from './elt';
import { sleep, isspace } from './utils';

export interface AnimatedTextProps {
  text: ValueState<string>;
  delay?: number;
  deletion_speed?: number;
  write_speed?: number;
  onAnimationEnd?: () => void;
}

export function AnimatedText(props: AnimatedTextProps) {
  const delay = 0; // props.delay ?? 0;
  const text = props.text;
  const t = new Text(props.text.value);
  const letter_del_time = 0; //props.deletion_speed ?? 0.02;
  const letter_wrt_time = 0.01;//props.write_speed ?? 0.025;
  let animation_promise: Promise<void> | null = null;
  text.sub(async (new_text) => {
    if (animation_promise != null) {
      await animation_promise;
    }
    if (delay > 0) await sleep(delay);
    animation_promise = (async () => {
      while (t.data.length) {
        t.data = t.data.trim().substring(0, t.data.length - 1);
        if (letter_del_time > 0) await sleep(letter_del_time);
      }
      let text = '';
      for (let i = 0; i < new_text.length; ++i) {
        const char = new_text[i];
        text += char;
        t.data = text;
        if (isspace(char)) continue;
        if (letter_wrt_time > 0) await sleep(letter_wrt_time);
      }
    })().then(() => {
      animation_promise = null;
      return props.onAnimationEnd ? props.onAnimationEnd() : undefined;
    });
  });
  return t;
}
