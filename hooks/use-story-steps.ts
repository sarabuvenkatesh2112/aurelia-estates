import gsap from 'gsap';
import { Observer } from 'gsap/Observer';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollToPosition, suspendSmoothScroll } from '@/lib/scroll';
import { ScrollIntent } from '@/lib/motion/scroll-intent';

/** ScrollTrigger owns pinning; Observer owns intent only while the pin is held. */
export function bindStorySteps(
  element: HTMLElement,
  tl: gsap.core.Timeline,
  reduced: boolean,
  initial: number,
  select: (index: number) => void,
) {
  gsap.registerPlugin(Observer);
  const scenes = Array.from(
    element.querySelectorAll<HTMLElement>('.story-scene'),
  );
  const intent = new ScrollIntent();
  let index = initial,
    held = false,
    exiting = false,
    busy = false;
  let animation: gsap.core.Tween | undefined, resume: (() => void) | undefined;
  let pin: ScrollTrigger | undefined;
  const startTime = (i: number) => tl.labels[`chapter-${i}-start`] ?? 0;
  const endTime = (i: number) => tl.labels[`chapter-${i}-end`] ?? 0;
  const accessible = () =>
    scenes.forEach((scene, i) => {
      scene.inert = i !== index;
      scene.setAttribute('aria-hidden', String(i !== index));
    });
  const show = (i: number) => {
    index = i;
    tl.pause(endTime(i), true);
    select(i);
    gsap.set(element.querySelector('.chapter-progress span'), {
      scaleX: i / 4,
    });
    accessible();
  };
  const release = () => {
    held = false;
    observer.disable();
    resume?.();
    resume = undefined;
  };
  const exit = (direction: number, distance: number) => {
    exiting = true;
    release();
    if (pin) {
      const edge = direction > 0 ? pin.end + 2 : pin.start - 2;
      scrollToPosition(edge, true);
      // Hand the accepted boundary gesture back to the existing page scroller.
      scrollToPosition(
        edge + direction * Math.min(innerHeight / 2, Math.max(40, distance)),
      );
    }
    exiting = false;
  };
  const go = (next: number, distance = 80) => {
    if (busy) return;
    if (next < 0 || next > 4) {
      exit(next < 0 ? -1 : 1, distance);
      return;
    }
    if (next === index) return;
    const forward = next > index;
    const previous = index;
    const adjacent = Math.abs(next - index) === 1;
    // Skip the old scrub timeline's dwell gaps, retaining every reveal tween.
    if (adjacent) tl.pause(forward ? startTime(next) : endTime(index), true);
    const destination =
      forward || !adjacent ? endTime(next) : startTime(index) - 0.001;
    busy = true;
    index = next;
    select(next);
    accessible();
    if (reduced) {
      show(next);
      busy = false;
      return;
    }
    // The existing 1.25s reveal, played at 1.6x, settles in 781ms.
    const reveal = forward ? next : previous;
    const duration = (endTime(reveal) - startTime(reveal)) / 1.6;
    animation = tl.tweenTo(destination, {
      duration,
      ease: 'none',
      onUpdate: () => {
        gsap.set(element.querySelector('.chapter-progress span'), {
          scaleX:
            (previous + (next - previous) * (animation?.progress() ?? 0)) / 4,
        });
      },
      onComplete: () => {
        show(next);
        busy = false;
      },
    });
  };
  const observer = Observer.create({
    target: window,
    type: 'wheel,touch',
    preventDefault: true,
    allowClicks: true,
    lockAxis: true,
    tolerance: 0,
    debounce: false,
    ignore:
      'input,textarea,select,[contenteditable=true],[data-slot="dialog-content"]',
    ignoreCheck: (event) => {
      if (document.querySelector('[data-slot="dialog-content"]')) {
        release();
        return true;
      }
      return (
        !!(event as WheelEvent).ctrlKey ||
        (event.type === 'wheel' &&
          Math.abs((event as WheelEvent).deltaX) >
            Math.abs((event as WheelEvent).deltaY)) ||
        (!!(event as TouchEvent).touches &&
          (event as TouchEvent).touches.length > 1)
      );
    },
    onPress: () => intent.reset(),
    onChangeY: (self) => {
      const touch = self.event.type !== 'wheel';
      const direction = intent.feed(
        touch ? -self.deltaY : self.deltaY,
        performance.now(),
        busy,
        touch,
      );
      if (direction) go(index + direction, Math.abs(self.deltaY));
    },
  });
  observer.disable();
  const enter = (direction: number) => {
    if (!pin || held || exiting) return;
    // Programmatic jumps over the entire section must remain possible.
    if (
      Math.abs(window.scrollY - (direction > 0 ? pin.start : pin.end)) >
      innerHeight
    )
      return;
    animation?.kill();
    busy = false;
    show(direction > 0 ? 0 : 4);
    held = true;
    resume = suspendSmoothScroll();
    scrollToPosition(pin.start + 1, true);
    intent.reset();
    // Consume entry momentum too, until a new wheel gesture begins.
    intent.feed(40, performance.now(), true);
    observer.enable();
  };
  const guardPosition = (self: ScrollTrigger) => {
    if (!held) return;
    const drift = Math.abs(window.scrollY - (self.start + 1));
    // Arrest native touch inertia which began before Observer took ownership.
    // Large external jumps (focus, scrollbar, browser restoration) may escape.
    if (drift > innerHeight) release();
    else if (drift > 3) scrollToPosition(self.start + 1, true);
  };
  pin = ScrollTrigger.create({
    id: 'living-story',
    trigger: element,
    start: 'top top',
    end: '+=2',
    pin: true,
    onEnter: () => enter(1),
    onEnterBack: () => enter(-1),
    onLeave: guardPosition,
    onLeaveBack: guardPosition,
    onRefresh: (self) => {
      if (held) scrollToPosition(self.start + 1, true);
    },
  });
  const keyboard = (event: KeyboardEvent) => {
    if (!held || event.ctrlKey || event.metaKey || event.altKey) return;
    if (
      (event.target as Element).closest(
        'input,textarea,select,[contenteditable=true],[data-slot="dialog-content"]',
      )
    )
      return;
    const direction = ['ArrowDown', 'PageDown'].includes(event.key)
      ? 1
      : ['ArrowUp', 'PageUp'].includes(event.key)
        ? -1
        : 0;
    if (direction) {
      event.preventDefault();
      if (!event.repeat) go(index + direction);
    } else if (['Tab', 'Escape', 'Home', 'End'].includes(event.key)) release();
  };
  document.addEventListener('keydown', keyboard);
  const navigation = (event: MouseEvent) => {
    if (
      (event.target as Element).closest(
        'a[href],button[aria-haspopup="dialog"]',
      )
    )
      release();
  };
  document.addEventListener('click', navigation, true);
  const focus = (event: FocusEvent) => {
    if (held && !element.contains(event.target as Node)) release();
  };
  document.addEventListener('focusin', focus);
  show(initial);
  if (pin.isActive) enter(1);
  return {
    go: (next: number) => {
      if (!pin) return;
      if (!held) {
        held = true;
        resume = suspendSmoothScroll();
        scrollToPosition(pin.start + 1, true);
        observer.enable();
      }
      go(next);
    },
    destroy: () => {
      animation?.kill();
      release();
      observer.kill();
      pin?.kill();
      pin = undefined;
      pin = undefined;
      document.removeEventListener('keydown', keyboard);
      document.removeEventListener('click', navigation, true);
      document.removeEventListener('focusin', focus);
      scenes.forEach((scene) => {
        scene.inert = false;
        scene.removeAttribute('aria-hidden');
      });
    },
  };
}
