import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

/**
 * AnimatedCounter - Numero animato che conta da 0 al valore target
 * Usato per statistiche come "500+ serate" con effetto wow
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 2,
  className,
  suffix = '',
  prefix = '',
  decimals = 0,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  const spring = useSpring(0, {
    stiffness: 50,
    damping: 20,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) => {
    return `${prefix}${current.toFixed(decimals)}${suffix}`;
  });

  const [displayValue, setDisplayValue] = useState(`${prefix}0${suffix}`);

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      setDisplayValue(v);
    });
    return unsubscribe;
  }, [display]);

  return (
    <motion.span
      ref={ref}
      className={cn("tabular-nums", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      {displayValue}
    </motion.span>
  );
};

interface StatsCounterProps {
  value: number;
  label: string;
  icon?: React.ReactNode;
  suffix?: string;
  className?: string;
}

/**
 * StatsCounter - Card con contatore animato + label + icona
 */
export const StatsCounter: React.FC<StatsCounterProps> = ({
  value,
  label,
  icon,
  suffix = '+',
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      className={cn(
        "flex flex-col items-center gap-2 p-6 rounded-2xl",
        "bg-gradient-to-br from-card to-muted/30",
        "border border-border/50",
        className
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, type: "spring" }}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      {icon && (
        <motion.div
          className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
          initial={{ rotate: -10 }}
          animate={isInView ? { rotate: 0 } : {}}
          transition={{ delay: 0.2, type: "spring" }}
        >
          {icon}
        </motion.div>
      )}
      <AnimatedCounter
        value={value}
        suffix={suffix}
        className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
        duration={2.5}
      />
      <span className="text-sm text-muted-foreground font-medium">
        {label}
      </span>
    </motion.div>
  );
};

export default AnimatedCounter;
