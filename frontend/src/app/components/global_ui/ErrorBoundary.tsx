"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import Button from "./Button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.fallback) {
        return this.fallback;
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/30 dark:bg-red-900/10">
          <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-400">
            Something went wrong
          </h2>
          <p className="mb-4 text-sm text-red-600 dark:text-red-500">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button
            onClick={() => this.setState({ hasError: false })}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }

  private get fallback() {
    return this.props.fallback;
  }
}

export default ErrorBoundary;
