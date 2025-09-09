
import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { useAnalysis } from "@/context/AnalysisContext";

export function StatusMessage() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const lastText = useRef<string>('');

  const { phase, discussionProgress, communityName } = useAnalysis();
  
  const phaseText = {
    "digging": !discussionProgress ? `Analysing sentiment in ${communityName}` : `Digging deeper into ${communityName}`,
    "analyzing": `Searching ${communityName}`
  }

  const text = phase === "digging" ? phaseText.digging  : phase === "analyzing" ? phaseText.analyzing
    : `${communityName}`;

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    gsap.fromTo(
      wrapRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }
    );
  }, []);

  // Text change: slide old up and new in from bottom
  useEffect(() => {
    if (!textRef.current) return;
    if (lastText.current && lastText.current !== text) {
      const tl = gsap.timeline();
      tl.to(textRef.current, { y: -20, opacity: 0, duration: 0.25, ease: 'power2.in' })
        .add(() => {
          if (textRef.current) textRef.current.textContent = text;
        })
        .fromTo(
          textRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }
        );
    } else {
      if (textRef.current) textRef.current.textContent = text;
    }
    lastText.current = text;
  }, [text]);

  // Toggle CSS classes for shimmer vs. white states
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    // Base style for gradient-clipped text
    el.classList.add('status-text');
    // Remove state classes first
    el.classList.remove('status-text--anim', 'status-text--stop', 'status-text--white');
    const isActive = phase === 'analyzing' || phase === 'digging';
    if (!isActive) {
      // Smoothly settle to white, then lock solid white
      el.classList.add('status-text--stop');
      const t = setTimeout(() => {
        el.classList.remove('status-text--stop');
        el.classList.add('status-text--white');
      }, 360);
      return () => clearTimeout(t);
    } else {
      el.classList.add('status-text--anim');
    }
  }, [phase]);

  return (
    <div ref={wrapRef}>
      <div
        ref={textRef}
        className="relative z-10 font-semibold inline-block status-text"
      />
    </div>
  );
}