import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
  ctaOnClick,
}: {
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
      <div className="mb-5 grid size-20 place-items-center rounded-2xl border bg-card">
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          className="text-muted-foreground"
        >
          <path
            d="M7 8h10M7 12h6m-7 9 2.2-2.2c.4-.4.6-.6.8-.7.2-.1.4-.1.6-.1H17a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4h.4c.2 0 .4 0 .6.1.2.1.4.3.8.7L11 21"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {ctaLabel ? (
        <div className="mt-6">
          {ctaHref ? (
            <Button asChild>
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          ) : (
            <Button type="button" onClick={ctaOnClick}>
              {ctaLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
