import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Frown, ThumbsUp, AlertTriangle, HelpCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CharacterMood = 'happy' | 'sad' | 'thinking' | 'success' | 'warning' | 'neutral';

interface CharacterResponseProps {
  mood: CharacterMood;
  message: string;
  className?: string;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const CharacterResponse: React.FC<CharacterResponseProps> = ({
  mood,
  message,
  className,
  animated = true,
  size = 'md'
}) => {
  // Icon based on mood
  const getIcon = () => {
    switch (mood) {
      case 'happy':
        return <Smile className="text-emerald-500" />;
      case 'sad':
        return <Frown className="text-rose-500" />;
      case 'success':
        return <Check className="text-green-500" />;
      case 'warning':
        return <AlertTriangle className="text-amber-500" />;
      case 'thinking':
        return <HelpCircle className="text-blue-500" />;
      case 'neutral':
      default:
        return <ThumbsUp className="text-slate-500" />;
    }
  };

  // Background based on mood
  const getBgColor = () => {
    switch (mood) {
      case 'happy':
        return 'bg-emerald-50 border-emerald-200';
      case 'sad':
        return 'bg-rose-50 border-rose-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'thinking':
        return 'bg-blue-50 border-blue-200';
      case 'neutral':
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  // Size styles
  const sizeStyles = {
    sm: 'text-xs p-2 rounded-md',
    md: 'text-sm p-3 rounded-lg',
    lg: 'text-base p-4 rounded-lg'
  };

  // Icon size
  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  // Render with animation if enabled
  return (
    <AnimatePresence>
      <motion.div
        initial={animated ? 'hidden' : 'visible'}
        animate="visible"
        variants={containerVariants}
        className={cn(
          'flex items-center border gap-3',
          getBgColor(),
          sizeStyles[size],
          className
        )}
      >
        <div className={cn(iconSize[size], 'flex-shrink-0')}>
          {getIcon()}
        </div>
        <p className="flex-grow">{message}</p>
      </motion.div>
    </AnimatePresence>
  );
};

export default CharacterResponse;