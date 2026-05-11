"use client";

import { forwardRef, useId } from "react";
import { Input } from "@/components/ui/input";
import { FormControl, type FormControlProps } from "./form-control";

type NativeInputProps = Omit<
    React.ComponentProps<"input">,
    "id" | "aria-invalid" | "aria-describedby"
>;

export type FormTextProps = NativeInputProps &
    Omit<FormControlProps, "children" | "id"> & {
        id?: string;
    };

/**
 * Standard text-style input bound to a labelled `FormControl`.
 * Pass `type="number"`, `type="email"`, `type="date"` etc. for variants.
 */
export const FormText = forwardRef<HTMLInputElement, FormTextProps>(function FormText(
    {
        id,
        label,
        hint,
        error,
        help,
        required,
        optional,
        className,
        hideLabel,
        ...inputProps
    },
    ref,
) {
    const reactId = useId();
    const fieldId = id ?? reactId;
    const describedBy = hint || error || help ? `${fieldId}-desc` : undefined;
    return (
        <FormControl
            id={fieldId}
            label={label}
            hint={hint}
            error={error}
            help={help}
            required={required}
            optional={optional}
            hideLabel={hideLabel}
            className={className}
        >
            <Input
                ref={ref}
                id={fieldId}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={describedBy}
                required={required}
                {...inputProps}
            />
        </FormControl>
    );
});
