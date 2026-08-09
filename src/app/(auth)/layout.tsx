import { OwnovaMark } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <OwnovaMark size={40} />
          <h1 className="text-lg font-semibold">Ownova OS</h1>
          <p className="text-sm text-muted-foreground">Automating the Future, Empowering Businesses.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
