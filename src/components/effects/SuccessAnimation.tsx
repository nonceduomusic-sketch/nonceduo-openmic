import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, Music, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessAnimationProps {
  variant?: 'booking' | 'dedication' | 'achievement';
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * SuccessAnimation - Animazione celebrativa per conferme
 * 
 * Varianti:
 * - booking: Icona microfono con effetti neon pink
 * - dedication: Cuore animato con particelle
 * - achievement: Stelle e sparkles
 */
export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  variant = 'booking',
  title,
  subtitle,
  className,
}) => {
  const icons = {
    booking: Music,
    dedication: Heart,
    achievement: Sparkles,
  };

  const Icon = icons[variant];

  const colors = {
    booking: 'from-primary via-secondary to-accent',
    dedication: 'from-pink-500 via-red-500 to-rose-500',
    achievement: 'from-yellow-400 via-amber-500 to-orange-500',
  };

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* Glow background */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl opacity-30"
        style={{
          background: `radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main icon container */}
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1,
        }}
      >
        {/* Orbiting particles */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-secondary"
            style={{
              left: '50%',
              top: '50%',
            }}
            animate={{
              x: [0, Math.cos((i * Math.PI) / 2) * 40, 0],
              y: [0, Math.sin((i * Math.PI) / 2) * 40, 0],
              opacity: [0, 1, 0],
              scale: [0.5, 1.5, 0.5],
            }}
            transition={{
              duration: 1.5,
              delay: 0.3 + i * 0.1,
              repeat: Infinity,
              repeatDelay: 0.5,
            }}
          />
        ))}

        {/* Icon background */}
        <motion.div
          className={cn(
            "w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center",
            colors[variant]
          )}
          animate={{
            boxShadow: [
              '0 0 20px rgba(255, 51, 102, 0.3)',
              '0 0 40px rgba(255, 51, 102, 0.5)',
              '0 0 20px rgba(255, 51, 102, 0.3)',
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Icon className="w-10 h-10 text-white" />
          </motion.div>
        </motion.div>

        {/* Checkmark overlay */}
        <motion.div
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 15,
            delay: 0.5,
          }}
        >
          <CheckCircle className="w-5 h-5 text-white" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h2
        className="mt-6 font-display text-2xl font-bold text-center bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {title}
      </motion.h2>

      {/* Subtitle */}
      {subtitle && (
        <motion.p
          className="mt-2 text-muted-foreground text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {subtitle}
        </motion.p>
      )}

      {/* Sparkles decoration */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${10 + Math.random() * 30}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 1,
            delay: 0.6 + i * 0.15,
            repeat: Infinity,
            repeatDelay: 2,
          }}
        >
          <Sparkles className="w-4 h-4 text-secondary" />
        </motion.div>
      ))}
    </div>
  );
};

export default SuccessAnimation;
