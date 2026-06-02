"use client";

import { useId } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FormControl, type FormControlProps } from "./form-control";

const EMPTY_SELECT_VALUE = "__prime_hr_form_select_empty__";

export type FormSelectOption<TValue extends string = string> = {
    value: TValue;
    label: string;
    description?: string;
    disabled?: boolean;
};

export type FormSelectProps<TValue extends string = string> = Omit<
    FormControlProps,
    "children" | "id"
> & {
    id?: string;
    value?: TValue;
    defaultValue?: TValue;
    onValueChange?: (value: TValue) => void;
    placeholder?: string;
    options: ReadonlyArray<FormSelectOption<TValue>>;
    name?: string;
    disabled?: boolean;
};

/**
 * Labelled select wrapping shadcn `Select`. Accepts a flat options array.
 */
export function FormSelect<TValue extends string = string>({
    id,
    label,
    hint,
    error,
    help,
    required,
    optional,
    className,
    hideLabel,
    value,
    defaultValue,
    onValueChange,
    placeholder = "Select…",
    options,
    name,
    disabled,
}: FormSelectProps<TValue>) {
    const reactId = useId();
    const fieldId = id ?? reactId;
    const describedBy = hint || error || help ? `${fieldId}-desc` : undefined;
    const isControlled = value !== undefined || onValueChange !== undefined;
    const resolvedValue: TValue | undefined = isControlled ? ((value ?? EMPTY_SELECT_VALUE) as TValue) : undefined;

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
            <Select
                value={resolvedValue}
                defaultValue={isControlled ? undefined : defaultValue}
                onValueChange={(v) => {
                    if (v === EMPTY_SELECT_VALUE) return;
                    if (v != null) onValueChange?.(v as TValue);
                }}
                name={name}
                disabled={disabled}
            >
                <SelectTrigger
                    id={fieldId}
                    aria-invalid={Boolean(error) || undefined}
                    aria-describedby={describedBy}
                    className="w-full"
                >
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {isControlled && value === undefined ? (
                        <SelectItem value={EMPTY_SELECT_VALUE} disabled>
                            {placeholder}
                        </SelectItem>
                    ) : null}
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                            <span className="flex flex-col">
                                <span>{opt.label}</span>
                                {opt.description ? (
                                    <span className="text-xs text-muted-foreground">
                                        {opt.description}
                                    </span>
                                ) : null}
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </FormControl>
    );
}
