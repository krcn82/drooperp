"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useFirestore } from "@/firebase";

export default function CustomerDisplay() {
  const [display, setDisplay] = useState<any>(null);
  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore) return;

    const tenantId = localStorage.getItem('tenantId') || "default-tenant"; 
    const unsub = onSnapshot(doc(firestore, "tenants", tenantId, "display", "current"), (docSnap) => {
      setDisplay(docSnap.data());
    });
    return () => unsub();
  }, [firestore]);

  if (!display) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white text-3xl">
        💳 Warten auf nächste Bestellung...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col items-center justify-center p-8 space-y-6 transition-all">
      <div className="text-6xl font-bold tracking-wide">
        € {display.total?.toFixed(2) ?? "0.00"}
      </div>

      {display.customer ? (
        <div className="text-center space-y-2">
          <p className="text-3xl font-semibold">{display.customer.name}</p>
          <p className="text-lg text-gray-300">
            Punkte: {display.customer.loyaltyPoints ?? 0}
          </p>
          {display.customer.bonusActive && (
            <p className="text-green-400 text-xl mt-2 animate-pulse">
              🎁 5 % Treuebonus aktiv!
            </p>
          )}
        </div>
      ) : (
        <p className="text-xl text-gray-400">Kein Kunde ausgewählt</p>
      )}

      <div className="text-2xl mt-8 font-medium text-yellow-300">
        {display.status === "processing" && "Zahlung wird verarbeitet..."}
        {display.status === "completed" && (
          <span className="text-green-400">✅ Zahlung abgeschlossen!</span>
        )}
      </div>

      {display.status === "completed" && (
        <p className="text-gray-200 text-lg mt-4">Danke, bis bald 👋</p>
      )}
    </div>
  );
}
