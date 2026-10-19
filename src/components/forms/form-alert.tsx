import { CircleAlert } from "lucide-react";

export function FormAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </div>
  );
}
