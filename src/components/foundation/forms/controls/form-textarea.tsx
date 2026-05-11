"use client";

import { forwardRef, useId } from "react";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, type FormControlProps } from "./form-control";

type NativeTextareaProps = Omit<
    React.ComponentProps<"textarea">,
    "id" | "aria-invalid" | "aria-describedby"
>;

export type FormTextareaProps = NativeTextareaProps &
    Omit<FormControlProps, "children" | "id"> & {
        id?: string;
    };

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
    function FormTextarea(
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
            ...textareaProps
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
                <Textarea
                    ref={ref}
                    id={fieldId}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby={describedBy}
                    required={required}
                    {...textareaProps}
                />
            </FormControl>
        );
    },
);
