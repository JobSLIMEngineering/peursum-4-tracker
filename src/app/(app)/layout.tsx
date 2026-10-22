import { DataProvider } from "@/components/DataProvider";
import { Dock } from "@/components/Dock";
import { Footer } from "@/components/Footer";
import { Gestures } from "@/components/Gestures";
import { Header } from "@/components/Header";
import { HeaderMatchup } from "@/components/HeaderMatchup";
import { PageTransition } from "@/components/PageTransition";
import { SaveStatus } from "@/components/SaveStatus";
import { Settings } from "@/components/Settings";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="wrap">
        <main className="panel">
          <DataProvider>
            <SaveStatus />
            <HeaderMatchup />
            <PageTransition>{children}</PageTransition>
            <Footer />
            <Gestures />
            <Dock />
            <Settings />
          </DataProvider>
        </main>
      </div>
    </>
  );
}
