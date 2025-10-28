
export const i18n = {
  de: {
    DAILY_REPORT_STARTED: "Tagesabschluss wurde gestartet...",
    DAILY_REPORT_COMPLETED: "✅ Tagesabschluss erfolgreich erstellt.",
    NO_TRANSACTIONS: "Keine Transaktionen für diesen Tag gefunden.",
    TRANSACTION_PROCESSED: "Transaktion erfolgreich verarbeitet.",
    RKSV_SIGNATURE_CREATED: "RKSV-Signatur erfolgreich erstellt.",
  },
  en: {
    DAILY_REPORT_STARTED: "Daily Z-Report process started...",
    DAILY_REPORT_COMPLETED: "✅ Daily report successfully generated.",
    NO_TRANSACTIONS: "No transactions found for this day.",
    TRANSACTION_PROCESSED: "Transaction processed successfully.",
    RKSV_SIGNATURE_CREATED: "RKSV signature generated successfully.",
  },
  tr: {
    DAILY_REPORT_STARTED: "Gün sonu raporu başlatıldı...",
    DAILY_REPORT_COMPLETED: "✅ Gün sonu raporu başarıyla oluşturuldu.",
    NO_TRANSACTIONS: "Bugün için işlem bulunamadı.",
    TRANSACTION_PROCESSED: "İşlem başarıyla işlendi.",
    RKSV_SIGNATURE_CREATED: "RKSV imzası başarıyla oluşturuldu.",
  },
};

export type Language = "de" | "en" | "tr";

export function t(lang: Language, key: keyof typeof i18n["de"]) {
  return i18n[lang]?.[key] || i18n["en"][key] || key;
}
