"use client";

import { cn } from "@/lib/utils";
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef } from "react";

export interface FlipStackItem {
  number?: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  background: string;
  foreground?: string;
}

interface FlipStackProps {
  items: FlipStackItem[];
  className?: string;
  hint?: string;
  heading?: string;
  /** Rendered in the closing panel after the last card. Falls back to plain endLabel text. */
  footer?: React.ReactNode;
  endLabel?: string;
}

function FlipCard({
  item,
  index,
  total,
  progress,
  reduceMotion,
}: {
  item: FlipStackItem;
  index: number;
  total: number;
  progress: MotionValue<number>;
  reduceMotion: boolean;
}) {
  const segment = 1 / Math.max(total, 1);
  const start = index * segment;
  const end = Math.min(start + segment, 1);
  const entryStart = Math.max(0, start - segment);
  const entryEnd = index === 0 ? 0.0001 : Math.min(start, entryStart + segment * 0.7);
  const exitStart = start;
  const exitEnd = end;
  const stackedCardGap = Math.min(24, 72 / Math.max(total - 1, 1));
  const stackedOffset = index * stackedCardGap;
  const restingOffset = Math.min(index * 12, 34);
  const restingScale = 1 - Math.min(index * 0.012, 0.035);

  const exitYPercent = useTransform(progress, [exitStart, exitEnd], reduceMotion ? [0, 0] : [0, -118]);
  const exitStackOffset = useTransform(progress, [exitStart, exitEnd], reduceMotion ? [0, 0] : [0, stackedOffset]);
  const exitY = useMotionTemplate`calc(${exitYPercent}% + ${exitStackOffset}px)`;
  const rotateX = useTransform(progress, [exitStart, exitEnd], reduceMotion ? [0, 0] : [0, 22]);
  const opacity = useTransform(progress, [exitStart, exitEnd], reduceMotion ? [1, 0] : [1, 1]);
  const entryScale = useTransform(progress, [entryStart, entryEnd], index === 0 ? [1, 1] : [restingScale, 1]);
  const entryY = useTransform(progress, [entryStart, entryEnd], index === 0 ? [0, 0] : [restingOffset, 0]);

  return (
    <motion.article
      className="absolute inset-x-0 top-0 aspect-[3/4] will-change-transform sm:aspect-[1.76/1]"
      style={{
        y: exitY,
        rotateX,
        opacity,
        zIndex: total - index,
        transformOrigin: "50% 50%",
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
      }}
    >
      <motion.div
        className="grid h-full overflow-hidden rounded-[clamp(18px,2vw,30px)] shadow-[0_16px_50px_rgba(16,17,20,0.25)] sm:grid-cols-[1.15fr_0.85fr]"
        style={{
          backgroundColor: item.background,
          color: item.foreground ?? "white",
          y: entryY,
          scale: entryScale,
          transformOrigin: "50% 100%",
        }}
      >
        <div className="flex min-w-0 flex-col p-[clamp(24px,3vw,48px)] md:pr-[clamp(22px,3vw,48px)]">
          <div className="flex items-start">
            <span className="font-display text-[clamp(24px,2.5vw,36px)] font-semibold leading-none tracking-tight opacity-90">
              {item.number ?? String(index + 1).padStart(2, "0")}
            </span>
          </div>

          <div className="mt-auto max-w-[46rem] pt-8">
            <p className="mb-[clamp(10px,1.5vw,22px)] text-[10px] font-bold uppercase tracking-[0.16em] opacity-75 sm:text-xs">
              {item.eyebrow}
            </p>
            <h2 className="font-display max-w-[16ch] text-balance text-[clamp(26px,3vw,44px)] font-bold leading-[1.05] tracking-tight">
              {item.title}
            </h2>
            <p className="mt-[clamp(16px,1.8vw,24px)] max-w-[42rem] text-[clamp(13px,1.1vw,16px)] leading-[1.5] opacity-85">
              {item.description}
            </p>
          </div>
        </div>

        {/* Icon panel — replaces the original component's photography with a large
            brand icon on a tinted glass panel, matching the site's icon-led visual language */}
        <div
          className="relative m-[clamp(10px,1.2vw,18px)] flex min-h-[180px] items-center justify-center overflow-hidden rounded-[clamp(12px,1.4vw,22px)] sm:ml-0"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />
          <div className="relative [&>svg]:h-[clamp(64px,9vw,140px)] [&>svg]:w-[clamp(64px,9vw,140px)]">
            {item.icon}
          </div>
        </div>
      </motion.div>
    </motion.article>
  );
}

export function FlipStack({
  items,
  className,
  hint = "Scroll to explore",
  heading = "What We Do.",
  footer,
  endLabel = "Let's build yours",
}: FlipStackProps) {
  const stackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({
    target: stackRef,
    offset: ["start start", "end end"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 22,
    mass: 0.8,
    restDelta: 0.0005,
  });
  const cardProgress = reduceMotion ? scrollYProgress : smoothProgress;

  return (
    <section className={cn("relative bg-[var(--page-bg)] text-[var(--ink)]", className)}>
      <div className="relative h-[42vh] min-h-[300px] overflow-hidden px-5 sm:px-10">
        <div className="absolute inset-x-0 top-[clamp(28px,6vh,56px)] flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          <motion.span
            aria-hidden="true"
            animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            ↓
          </motion.span>
          <span>{hint}</span>
          <motion.span
            aria-hidden="true"
            animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
            transition={{ duration: 1.4, delay: 0.18, repeat: Infinity, ease: "easeInOut" }}
          >
            ↓
          </motion.span>
        </div>

        <div className="absolute inset-x-5 top-[clamp(120px,22vh,190px)] flex justify-center sm:inset-x-10">
          <h1 className="font-display max-w-[18ch] text-center text-[clamp(34px,4.5vw,64px)] font-extrabold leading-[0.95] tracking-tight text-[var(--ink)]">
            {heading}
          </h1>
        </div>
      </div>

      <div ref={stackRef} className="relative" style={{ height: `${(Math.max(items.length, 1) + 1) * 100}vh` }}>
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden px-[clamp(14px,4vw,64px)] py-8">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[860px] [perspective:800px] sm:aspect-[1.76/1]">
            {[...items].reverse().map((item, reverseIndex) => {
              const index = items.length - reverseIndex - 1;
              return (
                <FlipCard
                  key={`${item.title}-${index}`}
                  item={item}
                  index={index}
                  total={items.length}
                  progress={cardProgress}
                  reduceMotion={reduceMotion}
                />
              );
            })}
          </div>
        </div>
      </div>

      <section className="flex min-h-[38vh] items-center justify-center px-5 py-16 sm:px-10">
        {footer ?? (
          <p className="font-display text-center text-[clamp(36px,6vw,88px)] font-extrabold leading-none tracking-tight text-[var(--ink)]">
            {endLabel}
          </p>
        )}
      </section>
    </section>
  );
}
