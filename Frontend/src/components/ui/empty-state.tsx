import type { ReactNode } from "react";
import { Card } from "./card";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="rounded-2xl border-dashed p-5 text-center">
      <p className="text-base font-semibold text-[#000000]">
        {title}
      </p>
      {description ? (
        <p className="mt-2 text-sm text-[#000000]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}



