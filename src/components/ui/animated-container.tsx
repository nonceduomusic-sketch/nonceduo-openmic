import * as React from "react";
import { cn } from "@/lib/utils";

interface AnimatedContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  animation?: "fadeIn" | "slideUp" | "slideIn" | "scaleIn" | "none";
}

/**
 * A container that animates its children on mount with configurable animations.
 * Uses CSS animations for performance.
 */
export const AnimatedContainer = React.forwardRef<HTMLDivElement, AnimatedContainerProps>(
  ({ children, className, delay = 0, duration = 300, animation = "fadeIn", style, ...props }, ref) => {
    const animationClass = React.useMemo(() => {
      switch (animation) {
        case "fadeIn":
          return "animate-in fade-in";
        case "slideUp":
          return "animate-in fade-in slide-in-from-bottom-4";
        case "slideIn":
          return "animate-in fade-in slide-in-from-right-4";
        case "scaleIn":
          return "animate-in fade-in zoom-in-95";
        case "none":
          return "";
        default:
          return "animate-in fade-in";
      }
    }, [animation]);

    return (
      <div
        ref={ref}
        className={cn(animationClass, className)}
        style={{
          animationDuration: `${duration}ms`,
          animationDelay: `${delay}ms`,
          animationFillMode: "both",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

AnimatedContainer.displayName = "AnimatedContainer";

interface StaggeredListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  staggerDelay?: number;
  initialDelay?: number;
  animation?: AnimatedContainerProps["animation"];
}

/**
 * A container that staggers the animation of its children.
 */
export const StaggeredList = React.forwardRef<HTMLDivElement, StaggeredListProps>(
  ({ children, className, staggerDelay = 50, initialDelay = 0, animation = "slideUp", ...props }, ref) => {
    const childrenArray = React.Children.toArray(children);

    return (
      <div ref={ref} className={className} {...props}>
        {childrenArray.map((child, index) => (
          <AnimatedContainer
            key={index}
            delay={initialDelay + index * staggerDelay}
            animation={animation}
          >
            {child}
          </AnimatedContainer>
        ))}
      </div>
    );
  }
);

StaggeredList.displayName = "StaggeredList";
