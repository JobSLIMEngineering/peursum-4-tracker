import Link from "next/link";
import { BASE } from "@/lib/base";
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
        {/* eslint-disable-next-line @next/next/no-img-element -- statische export, geen beeldoptimalisatie */}
        <img className="club" src={`${BASE}/club-logo.png`} alt="VV Peursum" width={191} height={256} />
      </div>
    </header>
  );
}
