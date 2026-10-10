"use client";

import { useData } from "./DataProvider";

/** Meldingen over opslaan en de lokale testmodus, bovenaan het scherm. */
export function SaveStatus() {
  const { error, store } = useData();
  return (
    <>
      {store.kind === "local" && (
        <p className="note warn" style={{ marginTop: 0, marginBottom: 14 }}>
          Lokale testmodus: wijzigingen blijven alleen in deze browser.
        </p>
      )}
      {error && (
        <p className="note warn" style={{ marginTop: 0, marginBottom: 14 }} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
