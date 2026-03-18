import React from 'react';
import { cn } from '../../lib/utils';

const Checkbox = React.forwardRef(({ 
  className, 
  checked, 
  onCheckedChange, 
  ...props 
}, ref) => {
  return (
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2",
        className
      )}
      {...props}
    />
  );
});

Checkbox.displayName = 'Checkbox';

export { Checkbox };