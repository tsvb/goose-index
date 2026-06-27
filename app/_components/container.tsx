import { clsx } from "./clsx";

export function Container({
  className,
  children,
  size = "default",
}: {
  className?: string;
  children: React.ReactNode;
  size?: "default" | "wide" | "prose";
}) {
  return (
    <div
      className={clsx(
        "mx-auto w-full px-5 sm:px-8",
        size === "default" && "max-w-5xl",
        size === "wide" && "max-w-6xl",
        size === "prose" && "max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
