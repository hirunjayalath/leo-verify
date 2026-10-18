"use client";

import {
  HomeJourneyIllustrationCard,
  type JourneyCardItem,
} from "@/components/public/home-journey-illustration-card";
import { cn } from "@/lib/utils";

const staggerClass = [
  "animate-fade-up",
  "animate-fade-up-delay-1",
  "animate-fade-up-delay-2",
  "animate-fade-up-delay-3",
  "animate-fade-up-delay-3",
];

export function HomeFeaturesShowcase({ items }: { items: JourneyCardItem[] }) {
  return (
    <div
      className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scroll-px-4 sm:-mx-6 sm:px-6 sm:scroll-px-6 [scrollbar-width:thin]"
      role="list"
      aria-label="Certificate journey steps"
    >
      {items.map((item, index) => (
        <div
          key={item.step}
          role="listitem"
          className={cn(
            "w-[17.5rem] shrink-0 sm:w-[20rem]",
            staggerClass[index] ?? "animate-fade-up",
          )}
        >
          <HomeJourneyIllustrationCard item={item} className="h-full" />
        </div>
      ))}
    </div>
  );
}
