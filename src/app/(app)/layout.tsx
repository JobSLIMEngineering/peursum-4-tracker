import { BottomNav } from "@/components/BottomNav";
import { DataProvider } from "@/components/DataProvider";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Footer } from "@/components/Footer";
import { Gestures } from "@/components/Gestures";
import { Header } from "@/components/Header";
import { HeaderMatchup } from "@/components/HeaderMatchup";
import { PageTransition } from "@/components/PageTransition";
import { SaveStatus } from "@/components/SaveStatus";

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
            <FeedbackButton />
          </DataProvider>
        </main>
      </div>
      <BottomNav />
    </>
  );
}
