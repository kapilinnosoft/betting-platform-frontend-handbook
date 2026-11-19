import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-semibold">404 — Not found</h1>
      <p className="text-slate-500">The requested documentation page is unavailable.</p>
      <Link href="/" className="text-sm underline">
        Back to overview
      </Link>
    </div>
  );
}
