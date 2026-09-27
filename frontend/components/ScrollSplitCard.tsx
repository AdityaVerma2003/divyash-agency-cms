"use client";

import { cn } from "@/lib/utils";
import { motion, useScroll, useTransform, useMotionTemplate, type MotionValue } from "framer-motion";
import { useRef, type ReactNode } from "react";

export interface ScrollSplitCardItem {
  title: ReactNode;
  description: ReactNode;
  bgColor: string;
  textColor: string;
  icon?: ReactNode;
}

export interface ScrollSplitCardProps {
  className?: string;
  /** CSS background value (gradient, color, etc.) sliced across the panels before they split */
  bannerBackground: string;
  hint?: string;
  endingText?: ReactNode;
  cards: ScrollSplitCardItem[];
  /** Separate card content for the mobile fallback layout (see below). Defaults
   * to `cards` when omitted — but if any card's `title`/`description` carries
   * a ref (e.g. for a count-up animation), pass genuinely separate elements
   * here rather than reusing the same ones, since the desktop split view and
   * the mobile grid both render at the same time (one just CSS-hidden) and a
   * single ref can only ever attach to one of the two copies. */
  mobileCards?: ScrollSplitCardItem[];
  containerRef?: React.RefObject<HTMLElement | null>;
}

function borderRadiusFor(index: number, total: number) {
  if (index === 0) return ["16px 0px 0px 16px", "16px 16px 16px 16px"] as const;
  if (index === total - 1) return ["0px 16px 16px 0px", "16px 16px 16px 16px"] as const;
  return ["0px 0px 0px 0px", "16px 16px 16px 16px"] as const;
}

function SplitCardPanel({
  card,
  index,
  total,
  bannerBackground,
  scrollYProgress,
}: {
  card: ScrollSplitCardItem;
  index: number;
  total: number;
  bannerBackground: string;
  scrollYProgress: MotionValue<number>;
}) {
  const center = (total - 1) / 2;
  const offset = index - center;

  const x = useTransform(scrollYProgress, [0, 0.4, 0.8], [0, offset * 32, offset * 16]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [1, 0.9]);
  const rotateY = useTransform(scrollYProgress, [0.4, 0.8], [0, 180]);
  const rotateZ = useTransform(scrollYProgress, [0.4, 0.8], [0, offset * -4]);

  const [radiusStart, radiusEnd] = borderRadiusFor(index, total);
  const borderRadius = useTransform(scrollYProgress, [0, 0.2], [radiusStart, radiusEnd]);
  const borderOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 0.2]);
  const shadowOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 0.4]);
  const boxShadow = useMotionTemplate`inset 0 1px 1px rgba(255, 255, 255, ${borderOpacity}), inset 0 -24px 48px rgba(0, 0, 0, ${shadowOpacity}), 0 25px 50px -12px rgba(0, 0, 0, ${shadowOpacity})`;

  return (
    <motion.div
      className="relative h-full flex-1"
      style={{ x, scale, rotateY, rotateZ, zIndex: index, transformStyle: "preserve-3d" }}
    >
      {/* Front — sliced brand banner, seamless until the split begins */}
      <motion.div
        className="absolute inset-0 overflow-hidden [backface-visibility:hidden]"
        style={{ zIndex: 2, borderRadius, boxShadow }}
      >
        <div
          className="absolute inset-0 h-full"
          style={{
            width: `${total * 100}%`,
            left: `${-100 * index}%`,
            background: bannerBackground,
            backgroundSize: "100% 100%",
          }}
        />
      </motion.div>

      {/* Back — the stat card content, revealed by the flip */}
      <motion.div
        className={cn(
          "absolute inset-0 flex flex-col justify-end overflow-hidden p-6 [backface-visibility:hidden] will-change-transform sm:p-8",
          "border border-white/10 bg-gradient-to-br from-white/10 to-transparent",
        )}
        style={{
          backgroundColor: card.bgColor,
          color: card.textColor,
          transform: "rotateY(180deg)",
          zIndex: 1,
          borderRadius,
          boxShadow,
        }}
      >
        {card.icon && <div className="relative z-10 mb-auto opacity-90">{card.icon}</div>}
        <div className="relative z-10">{card.title}</div>
        <p className="relative z-10 mt-2 text-sm opacity-85">{card.description}</p>
      </motion.div>
    </motion.div>
  );
}

export function ScrollSplitCard({
  className,
  bannerBackground,
  hint = "Scroll down",
  endingText,
  cards,
  mobileCards = cards,
  containerRef: externalContainerRef,
}: ScrollSplitCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: externalContainerRef,
    offset: ["start start", "end end"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.4], [1, 0.9]);
  const cardsY = useTransform(scrollYProgress, [0.8, 1], [0, -200]);
  const textOpacity = useTransform(scrollYProgress, [0.8, 1], [0, 1]);
  const textY = useTransform(scrollYProgress, [0.8, 1], [40, 0]);
  const startTextOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const startTextY = useTransform(scrollYProgress, [0, 0.1], [0, 20]);

  return (
    <>
      {/* Desktop/tablet — the scroll-driven split/flip effect. Below md the
          cards would be squeezed to well under 200px each, too narrow for the
          number + description to stay readable once flipped, so mobile gets
          a plain static layout instead (see below). */}
      <div ref={containerRef} className={cn("relative hidden h-[500vh] w-full md:block", className)}>
        <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden [perspective:1200px]">
          <motion.div
            className="absolute top-[20%] left-0 right-0 text-center"
            style={{ opacity: startTextOpacity, y: startTextY }}
          >
            <p className="text-sm font-medium uppercase tracking-widest text-white/60">{hint}</p>
          </motion.div>

          <motion.div
            style={{ scale, y: cardsY, transformStyle: "preserve-3d" }}
            className="relative flex h-[420px] w-full max-w-4xl px-4"
          >
            {cards.map((card, i) => (
              <SplitCardPanel
                key={i}
                card={card}
                index={i}
                total={cards.length}
                bannerBackground={bannerBackground}
                scrollYProgress={scrollYProgress}
              />
            ))}
          </motion.div>

          {endingText && (
            <motion.div
              className="absolute bottom-[20%] left-0 right-0 text-center"
              style={{ opacity: textOpacity, y: textY }}
            >
              {endingText}
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile — plain, always-readable cards; no split/flip animation */}
      <div className={cn("py-16 md:hidden", className)}>
        <div className="mx-auto grid max-w-md grid-cols-2 gap-4 px-5">
          {mobileCards.map((card, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 p-5"
              style={{ backgroundColor: card.bgColor, color: card.textColor }}
            >
              {card.icon && <div className="opacity-90">{card.icon}</div>}
              <div>{card.title}</div>
              <p className="text-xs leading-relaxed opacity-85">{card.description}</p>
            </div>
          ))}
        </div>
        {endingText && <div className="mt-8 text-center">{endingText}</div>}
      </div>
    </>
  );
}
