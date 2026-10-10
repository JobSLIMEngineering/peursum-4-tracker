import { FeedbackButton } from "@/components/FeedbackButton";
import { Header } from "@/components/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="wrap">
        <main className="panel">{children}</main>
      </div>
      <FeedbackButton />
    </>
  );
}
