import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CharacterResponse, { CharacterMood } from '@/components/ui/character-response';
import { cn } from '@/lib/utils';

interface FormInputWithValidationProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  validationRules?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    email?: boolean;
    custom?: (value: string) => boolean;
    customMessage?: string;
  };
  showValidation?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  feedbackMessages?: {
    initial?: string;
    valid?: string;
    empty?: string;
    invalid?: string;
    typing?: string;
  };
}

const FormInputWithValidation: React.FC<FormInputWithValidationProps> = ({
  label,
  id,
  validationRules,
  showValidation = true,
  containerClassName,
  labelClassName,
  feedbackMessages,
  className,
  onChange,
  value,
  ...props
}) => {
  const [inputValue, setInputValue] = useState<string>(value as string || '');
  const [isTouched, setIsTouched] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    message: string;
    mood: CharacterMood;
  }>({
    isValid: true,
    message: feedbackMessages?.initial || 'Enter your information here',
    mood: 'neutral'
  });

  // Typing timer for detecting when user stops typing
  let typingTimer: NodeJS.Timeout;
  
  const validateInput = (val: string) => {
    // Empty check
    if (validationRules?.required && val.trim() === '') {
      return {
        isValid: false,
        message: feedbackMessages?.empty || 'This field is required',
        mood: 'sad' as CharacterMood
      };
    }

    // Skip other validations if empty and not required
    if (val.trim() === '' && !validationRules?.required) {
      return {
        isValid: true,
        message: feedbackMessages?.initial || 'Enter your information here',
        mood: 'neutral' as CharacterMood
      };
    }

    // Min length
    if (validationRules?.minLength && val.length < validationRules.minLength) {
      return {
        isValid: false,
        message: `Must be at least ${validationRules.minLength} characters`,
        mood: 'sad' as CharacterMood
      };
    }

    // Max length
    if (validationRules?.maxLength && val.length > validationRules.maxLength) {
      return {
        isValid: false,
        message: `Cannot exceed ${validationRules.maxLength} characters`,
        mood: 'sad' as CharacterMood
      };
    }

    // Email validation
    if (validationRules?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      return {
        isValid: false,
        message: 'Please enter a valid email address',
        mood: 'sad' as CharacterMood
      };
    }

    // Pattern validation
    if (validationRules?.pattern && !validationRules.pattern.test(val)) {
      return {
        isValid: false,
        message: 'The input format is incorrect',
        mood: 'sad' as CharacterMood
      };
    }

    // Custom validation
    if (validationRules?.custom && !validationRules.custom(val)) {
      return {
        isValid: false,
        message: validationRules.customMessage || 'The input is invalid',
        mood: 'sad' as CharacterMood
      };
    }

    // Valid
    return {
      isValid: true,
      message: feedbackMessages?.valid || 'Looks good!',
      mood: 'happy' as CharacterMood
    };
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsTyping(true);
    
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      setIsTyping(false);
      if (isTouched) {
        setValidationState(validateInput(newValue));
      }
    }, 500);

    // Call the original onChange handler if provided
    if (onChange) {
      onChange(e);
    }
  };

  // Handle blur event
  const handleBlur = () => {
    setIsTouched(true);
    setIsTyping(false);
    clearTimeout(typingTimer);
    setValidationState(validateInput(inputValue));
  };

  // Check validation when value prop changes
  useEffect(() => {
    if (typeof value === 'string' && value !== inputValue) {
      setInputValue(value);
      if (isTouched) {
        setValidationState(validateInput(value));
      }
    }
  }, [value]);

  return (
    <div className={cn('space-y-2', containerClassName)}>
      <Label htmlFor={id} className={labelClassName}>
        {label}
      </Label>
      
      <Input
        id={id}
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(
          validationState.isValid ? '' : 'border-rose-500',
          className
        )}
        {...props}
      />
      
      {showValidation && isTouched && (
        <div className="min-h-[40px]">
          {isTyping ? (
            <CharacterResponse
              mood="thinking"
              message={feedbackMessages?.typing || "I'm checking your input..."}
              size="sm"
            />
          ) : (
            <CharacterResponse
              mood={validationState.mood}
              message={validationState.message}
              size="sm"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FormInputWithValidation;