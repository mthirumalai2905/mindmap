import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="text-center">
        <p className="font-mono text-xs text-ink-4">404</p>
        <h1 className="mt-2 text-base font-semibold">This page does not exist</h1>
        <Link href="/overview" className="mt-4 inline-block text-[13px] underline underline-offset-2">
          Back to overview
        </Link>
      </div>
    </div>
  );
}
