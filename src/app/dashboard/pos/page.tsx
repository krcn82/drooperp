"use client";
import { useEffect, useState } from "react";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import RetailPOS from "./retail/cashier/page";
import RestaurantPOS from "./restaurant/cashier/page";
import { Database } from "lucide-react";

export default function POSRouter() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [mode, setMode] = useState<"retail" | "restaurant" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tenantId = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem("tenantId");
  }, [user]);

  useEffect(() => {
    if (isUserLoading || !tenantId || !firestore) return;

    const ref = doc(db, `tenants/${tenantId}`);
    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMode(data.posMode || "retail");
      } else {
        setMode("retail"); // Default to retail if not found
      }
      setIsLoading(false);
    }).catch(() => {
      setMode("retail");
      setIsLoading(false);
    });
  }, [user, isUserLoading, tenantId, firestore]);

  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Database className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  };

  return mode === "restaurant" ? <RestaurantPOS /> : <RetailPOS />;
}