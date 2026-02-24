"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <html lang="en">
            <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center font-sans dark:bg-black">
                <div className="w-full max-w-md space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            A Critical Error Occurred
                        </h1>
                        <p className="text-lg text-zinc-600 dark:text-zinc-400">
                            We're sorry, but the application encountered a fatal error and could
                            not continue.
                        </p>
                    </div>

                    {error.digest && (
                        <div className="rounded-md bg-zinc-100 p-2 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500">
                            Error ID: {error.digest}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <button
                            onClick={() => reset()}
                            className="w-full rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:w-auto"
                        >
                            Try again
                        </button>
                        <button
                            onClick={() => (window.location.href = "/")}
                            className="w-full rounded-full border border-zinc-200 bg-transparent px-5 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900 sm:w-auto"
                        >
                            Reload application
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
