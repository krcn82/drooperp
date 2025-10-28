
"use client";

import { useState } from "react";
import Image from "next/image";
import { translations } from "@/lib/pos-translations";

interface Product {
  id: string;
  name: { de: string; en: string };
  price: number;
  image: string;
  category: string;
}

export default function POSPage() {
  const [language, setLanguage] = useState<"de" | "en">("de");
  const [cart, setCart] = useState<Product[]>([]);

  const t = translations[language];

  const products: Product[] = [
    {
      id: "1",
      name: { de: "Schreibtischlampe", en: "Desk Lamp" },
      price: 46.0,
      image: "https://picsum.photos/seed/lamp/400/400",
      category: "Möbel",
    },
    {
      id: "2",
      name: { de: "Ablagebox", en: "Storage Box" },
      price: 18.17,
      image: "https://picsum.photos/seed/box/400/400",
      category: "Möbel",
    },
    {
      id: "3",
      name: { de: "Briefablage", en: "Letter Tray" },
      price: 5.52,
      image: "https://picsum.photos/seed/tray/400/400",
      category: "Büro",
    },
  ];

  const addToCart = (product: Product) => setCart([...cart, product]);
  const removeFromCart = (id: string) => {
    const indexToRemove = cart.findIndex((p) => p.id === id);
    if (indexToRemove > -1) {
      const newCart = [...cart];
      newCart.splice(indexToRemove, 1);
      setCart(newCart);
    }
  };

  const total = cart.reduce((sum, p) => sum + p.price, 0);

  return (
    <div className="grid grid-cols-12 h-screen">
      {/* 🧾 Left: Cart */}
      <div className="col-span-4 bg-white border-r p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{t.cart}</h2>
          <select
            className="border rounded px-2 py-1"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "de" | "en")}
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto space-y-2">
          {cart.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="flex justify-between items-center border-b pb-2"
            >
              <div>
                <p className="font-medium">{item.name[language]}</p>
                <p className="text-sm text-gray-500">€ {item.price.toFixed(2)}</p>
              </div>
              <button
                onClick={() => removeFromCart(item.id)}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t pt-4">
          <div className="flex justify-between font-bold text-lg">
            <span>{t.total}</span>
            <span>€ {total.toFixed(2)}</span>
          </div>
          <button
            className="w-full mt-4 bg-green-600 text-white py-2 rounded hover:bg-green-700"
            onClick={() => alert("Payment Flow (coming soon)")}
          >
            💳 {t.pay}
          </button>
        </div>
      </div>

      {/* 🪑 Right: Products */}
      <div className="col-span-8 bg-gray-50 p-6 overflow-auto">
        <h2 className="text-xl font-bold mb-4">{t.products}</h2>
        <div className="grid grid-cols-3 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white shadow-sm hover:shadow-md transition cursor-pointer rounded-lg p-4"
            >
              <Image
                src={p.image}
                alt={p.name[language]}
                width={120}
                height={120}
                className="mx-auto"
                data-ai-hint="office product"
              />
              <p className="mt-2 font-semibold text-center">{p.name[language]}</p>
              <p className="text-center text-gray-600 text-sm">
                € {p.price.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
