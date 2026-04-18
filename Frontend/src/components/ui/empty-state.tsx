import type { ReactNode } from "react";
import { Card } from "./card";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="rounded-2xl border-dashed p-8 text-center">
      <p className="text-base font-semibold text-(--text-primary)">
        {title}
      </p>
      {description ? (
        <p className="mt-2 text-sm text-(--text-secondary)">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}
