"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateMyContactInfoAction } from "@/features/me/me.actions";
import type { SafeContactInfoInput } from "@/features/me/schemas/safe-contact.schema";

type Props = {
    initialValues: SafeContactInfoInput;
};

export function SafeContactForm({ initialValues }: Props) {
    const [values, setValues] = useState<SafeContactInfoInput>(initialValues);
    const [isPending, startTransition] = useTransition();

    function update<K extends keyof SafeContactInfoInput>(key: K, value: SafeContactInfoInput[K]) {
        setValues((prev) => ({ ...prev, [key]: value }));
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        startTransition(async () => {
            const result = await updateMyContactInfoAction(values);
            if (result.ok) {
                toast.success("Your contact information was updated.");
            } else {
                toast.error(result.error);
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor="mobileNo">Mobile number</Label>
                    <Input
                        id="mobileNo"
                        autoComplete="tel"
                        placeholder="e.g. 0917 000 0000"
                        value={values.mobileNo ?? ""}
                        onChange={(e) => update("mobileNo", e.target.value)}
                        disabled={isPending}
                    />
                    <p className="text-xs text-muted-foreground">Used by HR for urgent communications only.</p>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="emergencyContactName">Emergency contact name</Label>
                    <Input
                        id="emergencyContactName"
                        autoComplete="name"
                        placeholder="Full name"
                        value={values.emergencyContactName ?? ""}
                        onChange={(e) => update("emergencyContactName", e.target.value)}
                        disabled={isPending}
                    />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="emergencyContactPhone">Emergency contact phone</Label>
                    <Input
                        id="emergencyContactPhone"
                        autoComplete="tel"
                        placeholder="Phone number of the person we should call"
                        value={values.emergencyContactPhone ?? ""}
                        onChange={(e) => update("emergencyContactPhone", e.target.value)}
                        disabled={isPending}
                    />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="presentAddress">Present address</Label>
                    <Textarea
                        id="presentAddress"
                        rows={2}
                        placeholder="Where you currently live"
                        value={values.presentAddress ?? ""}
                        onChange={(e) => update("presentAddress", e.target.value)}
                        disabled={isPending}
                    />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="permanentAddress">Permanent address</Label>
                    <Textarea
                        id="permanentAddress"
                        rows={2}
                        placeholder="Your official permanent address"
                        value={values.permanentAddress ?? ""}
                        onChange={(e) => update("permanentAddress", e.target.value)}
                        disabled={isPending}
                    />
                </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span>
                    To change your name, birth date, position, or government IDs, please file a correction request with HR.
                </span>
            </div>
            <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving…" : "Save changes"}
                </Button>
            </div>
        </form>
    );
}
