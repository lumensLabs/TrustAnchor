import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  ...props
}) => {
  const baseStyles =
    "rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantStyles = {
    primary:
      "bg-zinc-900 text-white hover:bg-zinc-700 focus:ring-zinc-500 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
    secondary:
      "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800",
  };

  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const disabledStyles = "opacity-50 cursor-not-allowed";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        disabled ? disabledStyles : ""
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export { Button };
export default Button;