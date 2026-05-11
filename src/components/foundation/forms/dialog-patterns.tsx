import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type StandardDialogProps = {
  triggerLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function StandardDialog({ triggerLabel, title, description, children, footer }: StandardDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button">
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div>{children}</div>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

