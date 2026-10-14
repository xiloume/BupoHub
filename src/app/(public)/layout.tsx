import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getSettings } from "@/server/settings";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer showSupport={settings["donations.enabled"]} />
    </>
  );
}
