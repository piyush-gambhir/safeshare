import type { ToastProps } from "../components/ui/use-toast";
import { useState, useEffect } from "react";

export function useToast() {
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const toast = ({ ...props }: ToastProps) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { ...props, id }]);
    };

    useEffect(() => {
        if (toasts.length > 0) {
            const timer = setTimeout(() => {
                setToasts((prev) => prev.slice(1));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toasts]);

    return {
        toast,
        toasts,
    };
}
