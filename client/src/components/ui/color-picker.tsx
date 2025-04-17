import React, { useState, useEffect } from "react";

interface ColorPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function ColorPicker({ value = "#000000", onChange, className = "" }: ColorPickerProps) {
  const [color, setColor] = useState(value);

  useEffect(() => {
    setColor(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor);
    if (onChange) {
      onChange(newColor);
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <input
        type="color"
        value={color}
        onChange={handleChange}
        className="h-9 w-9 cursor-pointer border border-input rounded-md overflow-hidden p-0"
      />
      <div 
        className="w-8 h-8 rounded-md border"
        style={{ backgroundColor: color }}
      />
      <input
        type="text"
        value={color}
        onChange={handleChange}
        className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}