import { elt, useValue } from './elt';
import { slides, type SlideInput } from './content';
import { AnimatedText } from './AnimatedText';
import type { RouteProps } from './router';

// function plurality(count: number, single: string, many: string): string {
//   return count === 1 ? single : many;
// }

interface TalkProps extends RouteProps {
}

export function Talk({ root, historyState }: TalkProps) {
  const title = useValue('');
  const text = useValue('');
  const code = useValue('');
  const inputs = useValue([] as Array<SlideInput>);
  const renderingTitle = useValue(false);
  let form: HTMLFormElement;

  {
    let load_slide;
    try {
      const req_slide = typeof historyState.query.talkSlide === 'string' ? parseInt(historyState.query.talkSlide) : 0;
      if (req_slide !== 0 && req_slide < slides.length && req_slide > 0) {
        load_slide = () => slides.change_to(req_slide);
      } else {
        load_slide = () => slides.reload_slide();
      }
    } catch (err) {
      console.error(err);
      load_slide = () => slides.reload_slide();
    }
    queueMicrotask(load_slide);
  }

  title.sub(() => renderingTitle.setTo(true));
  slides.addEventListener('slidechange', () => {
    const slide = slides.current;
    if (title.value !== slide.title) {
      title.setTo(slide.title);
      if (slide.text.length > 0) {
        renderingTitle.sub((rendering) => {
          if (rendering) return;
          text.setTo(slide.text);
        }, { once: true });
      } else {
        text.setTo(slide.text);
      }
    } else {
      text.setTo(slide.text);
    }
    code.setTo(slide.code);
    inputs.setTo(slide.inputs ?? []);
  });
  inputs.sub((inputs) => {
    form.innerHTML = '';
    elt(form, {
      children: inputs.map((inp) => {
        let ref: HTMLInputElement;
        return elt('label', {
          className: 'flex gap-4 border border-2 border-cyan-200',
          children: [
            inp.name + ': ',
            elt('input', {
              set ref(v: HTMLInputElement) { ref = v; },
              className: 'border border-slate-100 px4 py-2',
              type: inp.kind,
              value: inp.value,
              name: inp.name,
              onInput() {
                inp.value = inp.kind === 'text' ? ref.value : ref.valueAsNumber;
              },
            }),
          ]
        });
      }),
    });
  });

  return elt(root, {
    tabIndex: 1,
    className: 'w-full min-h-[100vh] flex flex-wrap flex-col justify-center items-center bg-slate-800 text-wrap text-slate-200',
    onLoad() {
      root.focus();
    },
    onKeyup(event) {
      if (event.key === 'ArrowLeft') {
        slides.prev_slide();
        return;
      }
      if (event.key === 'ArrowRight') {
        slides.next_slide();
        return;
      }
    },
    children: [
      elt('h1', {
        className: 'w-full md:w-3/4 min-h-[2.5rem] text-center text-4xl font-bold',
        children: AnimatedText({
          text: title,
          onAnimationEnd: () => {
            renderingTitle.setTo(false);
          },
        }),
      }),
      elt('pre', {
        className: 'w-full md:w-3/4 min-h-[1.75rem] text-xl text-wrap',
        children: AnimatedText({ text, delay: 0.25 }),
      }),
      elt('form', {
        set ref(ref: HTMLFormElement) { form = ref; },
        className: 'w-full md:w-3/4 flex flex-col text-xl text-wrap',
        children: [],
        onSubmit(ev) {
          ev.preventDefault();
          const data = new FormData(form);
          console.log('submitted data');
          const inputs = slides.current.inputs;
          if (!inputs || inputs.length === 0) return;
          for (const [name, value] of data.entries()) {
            slides.data[name].value = value.toString();
          }
          const fn = slides.at(slides.active_index);
          if (typeof fn !== 'function') {
            console.log('Slide is static');
            return;
          }
          const remade = fn(slides.data, slides.current);
          console.log('Slide is dynamic');
          if (title.value !== remade.title) {
            title.setTo(remade.title);
            console.log('Updating title');
          }
          if (text.value !== remade.text) {
            text.setTo(remade.text);
            console.log('Updating text');
          }
          if (code.value !== remade.code) {
            code.setTo(remade.code);
            console.log('Updating code');
          }
        },
      }),
      elt('pre', {
        className: 'w-full md:w-3/4 min-h-[1.75rem] font-mono text-lg text-wrap',
        children: elt('code', {
          children: AnimatedText({ text: code, delay: 1, deletion_speed: 0.01, write_speed: 0.02 }),
        }),
      }),
    ],
  });
}
