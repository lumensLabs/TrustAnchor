import { FC } from "react";

interface SpinnerProps {
  type: "spin" | "bounce" | "double-spinner";
  size?: number;
  duration?: number;
  delayStep?: number;
  className?: string;
}

export const Spinner: FC<SpinnerProps> = ({
  type,
  size = 24,
  duration = 1,
  delayStep = 0.2,
  className = "text-foreground",
}) => {
  if (type === "spin") {
    return (
      <div
        style={{
          width: size + "px",
          height: size + "px",
          borderTopColor: "transparent",
          borderStyle: "solid",
          borderWidth: "4px",
          animationDuration: `${duration}s`,
        }}
        className={`animate-spin rounded-full inline-block box-border border-current ${className}`}
      />
    );
  } else if (type === "double-spinner") {
    return (
      <div className="relative inline-block">
        {/* Outer Spinner */}
        <div
          style={{
            width: size + "px",
            height: size + "px",
            borderTopColor: "transparent",
            borderStyle: "solid",
            borderWidth: "3px",
            animationDuration: `${duration}s`,
          }}
          className={`animate-spin rounded-full box-border border-current ${className}`}
        />

        {/* Inner Spinner (reverse) */}
        <div
          style={{
            width: size * 0.6 + "px",
            height: size * 0.6 + "px",
            borderTopColor: "transparent",
            borderStyle: "solid",
            borderWidth: "3px",
            animationDuration: `${duration}s`,
          }}
          className={`animate-reverse-spin rounded-full box-border border-current absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${className}`}
        />
      </div>
    );
  }

  // Bounce Loader
  else {
    return (
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: size + "px",
              height: size + "px",
              animationDuration: `${duration}s`,
              animationDelay: `${i * delayStep}s`,
            }}
            className={`animate-dot-bounce rounded-full bg-current ${className}`}
          />
        ))}
      </div>
    );
  }
};
