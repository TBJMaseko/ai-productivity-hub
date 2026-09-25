"use client";

import { cn } from "@/lib/utils";
import type { ElementType } from "react";
import { createElement, memo } from "react";

export interface TextShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  duration = 2,
}: TextShimmerProps) => {
  return createElement(Component, {
    className: cn("inline-block animate-pulse text-muted-foreground", className),
    style: { animationDuration: `${duration}s` },
    children,
  });
};

export const Shimmer = memo(ShimmerComponent);
