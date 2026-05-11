import { toast } from "sonner";

type ToastOptions = {
    description?: string;
    duration?: number;
};

/**
 * Thin wrapper around sonner with consistent title + description structure.
 * Prefer this over bare `toast.success("msg")` so all toasts carry
 * semantic tone and optional context.
 *
 * Usage:
 *   showToast.success("Saved", { description: "Your changes have been saved." });
 *   showToast.error("Failed to save");
 *   showToast.warning("Review required", { description: "2 fields need attention." });
 *   showToast.info("Tip", { description: "You can bulk-edit from the table." });
 */
export const showToast = {
    success: (title: string, options?: ToastOptions) =>
        toast.success(title, { description: options?.description, duration: options?.duration }),
    error: (title: string, options?: ToastOptions) =>
        toast.error(title, { description: options?.description, duration: options?.duration }),
    warning: (title: string, options?: ToastOptions) =>
        toast.warning(title, { description: options?.description, duration: options?.duration }),
    info: (title: string, options?: ToastOptions) =>
        toast.info(title, { description: options?.description, duration: options?.duration }),
} as const;
