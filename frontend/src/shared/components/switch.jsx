import * as React from "react"

const Switch = React.forwardRef(({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onCheckedChange?.(!checked)}
            ref={ref}
            className={`
        peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors 
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background 
        disabled:cursor-not-allowed disabled:opacity-50 
        ${checked ? 'bg-orange-600' : 'bg-gray-200'}
        ${className}
      `}
            {...props}
        >
            <span
                className={`
          pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform bg-white
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
            />
        </button>
    )
})
Switch.displayName = "Switch"

export { Switch }
