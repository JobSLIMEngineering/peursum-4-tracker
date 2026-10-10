import Link from "next/link";
import { Tabs } from "./Tabs";

export function Header() {
  return (
    <header className="head">
      <div className="wrap">
        <Link href="/" className="brand" aria-label="Peursum 4, naar Overzicht">
          <span className="logo">
            Peursum <span className="no">4</span>
          </span>
        </Link>
        <Tabs />
      </div>
    </header>
  );
}
