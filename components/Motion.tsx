'use client';

import { useEffect } from 'react';
import { usePathname } from '@/i18n/navigation';

/**
 * Scroll-reveal and parallax, ported from the prototype. Elements already on
 * screen are never hidden, so content stays visible without JavaScript and for
 * search engines. Both effects are skipped when the visitor prefers reduced motion.
 */
export function Motion() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let io: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target as HTMLElement;
            el.style.opacity = '1';
            el.style.transform = 'none';
            io?.unobserve(el);
          }),
        { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
      );
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) return;
        el.style.opacity = '0';
        el.style.transform = 'translateY(32px)';
        el.style.transition =
          'opacity 1.2s cubic-bezier(.2,.7,.2,1), transform 1.2s cubic-bezier(.2,.7,.2,1)';
        io?.observe(el);
      });
    }

    let raf = 0;
    const parallax = () => {
      raf = 0;
      const vh = window.innerHeight;
      document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
        const parent = el.parentElement;
        if (!parent) return;
        const r = parent.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const f = parseFloat(el.dataset.parallax ?? '') || 0.15;
        const off = (r.top + r.height / 2 - vh / 2) * -f;
        el.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(parallax);
    };
    parallax();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      io?.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pathname]);

  return null;
}
