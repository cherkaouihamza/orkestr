import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Globe, LogOut } from "lucide-react";

export default async function ParticipantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Header participant */}
      <header className="bg-primary-900 text-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={`/${locale}/my-events`}>
            <span className="orkestr-logo text-xl text-white">
              ORKEST<span className="text-accent">R</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-primary-300">{user.email}</span>
            <form
              action={async () => {
                "use server";
                const supabase = await createClient();
                await supabase.auth.signOut();
                redirect(`/${locale}/login`);
              }}
            >
              <button className="flex items-center gap-1 text-primary-300 hover:text-white transition-colors">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
