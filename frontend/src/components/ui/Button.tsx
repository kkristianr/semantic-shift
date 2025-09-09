import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  buttonStyle?: 'outline' | '3d';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    buttonStyle = 'outline',
    children, 
    disabled,
    ...props 
  }, ref) => {
    const baseClasses = [
      // Base styles
      'inline-flex items-center justify-center font-semibold rounded',
      'transition-colors duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'relative overflow-hidden',
      
      // Full width
      fullWidth ? 'w-full' : '',
    ];

    const getVariantClasses = (variant: string, buttonStyle: 'outline' | '3d') => {
      if (buttonStyle === 'outline') {
        switch (variant) {
          case 'primary':
            return 'bg-transparent hover:bg-blue-500 text-blue-700 hover:text-white border border-blue-500 hover:border-transparent';
          case 'secondary':
            return 'bg-transparent hover:bg-gray-500 text-gray-700 hover:text-white border border-gray-500 hover:border-transparent';
          case 'danger':
            return 'bg-transparent hover:bg-red-500 text-red-700 hover:text-white border border-red-500 hover:border-transparent';
          case 'success':
            return 'bg-transparent hover:bg-green-500 text-green-700 hover:text-white border border-green-500 hover:border-transparent';
          case 'warning':
            return 'bg-transparent hover:bg-yellow-500 text-yellow-700 hover:text-white border border-yellow-500 hover:border-transparent';
          case 'ghost':
            return 'bg-transparent hover:bg-gray-500 text-gray-700 hover:text-white border border-gray-500 hover:border-transparent';
          default:
            return 'bg-transparent hover:bg-blue-500 text-blue-700 hover:text-white border border-blue-500 hover:border-transparent';
        }
      } else {
        switch (variant) {
          case 'primary':
            return 'bg-blue-500 hover:bg-blue-400 text-white border-b-4 border-blue-700 hover:border-blue-500';
          case 'secondary':
            return 'bg-gray-500 hover:bg-gray-400 text-white border-b-4 border-gray-700 hover:border-gray-500';
          case 'danger':
            return 'bg-red-500 hover:bg-red-400 text-white border-b-4 border-red-700 hover:border-red-500';
          case 'success':
            return 'bg-green-500 hover:bg-green-400 text-white border-b-4 border-green-700 hover:border-green-500';
          case 'warning':
            return 'bg-yellow-500 hover:bg-yellow-400 text-white border-b-4 border-yellow-700 hover:border-yellow-500';
          case 'ghost':
            return 'bg-gray-500 hover:bg-gray-400 text-white border-b-4 border-gray-700 hover:border-gray-500';
          default:
            return 'bg-blue-500 hover:bg-blue-400 text-white border-b-4 border-blue-700 hover:border-blue-500';
        }
      }
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
      xl: 'px-8 py-4 text-xl',
    };

    const isDisabled = disabled || isLoading;

    return (
      <button
        className={cn(
          baseClasses,
          getVariantClasses(variant, buttonStyle),
          sizeClasses[size],
          className
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          </div>
        )}
        
        {/* Content */}
        <div className={cn('flex items-center gap-2', isLoading ? 'opacity-0' : 'opacity-100')}>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children && <span>{children}</span>}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </div>
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
