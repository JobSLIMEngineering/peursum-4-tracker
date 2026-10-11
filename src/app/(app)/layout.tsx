import { DataProvider } from "@/components/DataProvider";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SaveStatus } from "@/components/SaveStatus";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="wrap">
        <main className="panel">
          <DataProvider>
            <SaveStatus />
            {children}
            <Footer />
            <FeedbackButton />
          </DataProvider>
        </main>
      </div>
    </>
  );
}
