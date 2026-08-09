import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function chunkToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
  return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? " " + chunkToWords(n % 100) : ""}`;
}

/** Converts a whole-number amount to words, e.g. 112000 -> "One Hundred Twelve Thousand". */
export function amountToWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts = [
    crore ? `${chunkToWords(crore)} Crore` : "",
    lakh ? `${chunkToWords(lakh)} Lakh` : "",
    thousand ? `${chunkToWords(thousand)} Thousand` : "",
    rest ? chunkToWords(rest) : "",
  ].filter(Boolean);
  return parts.join(" ");
}

const CURRENCY_WORDS: Record<string, string> = {
  PKR: "Pakistani Rupees",
  USD: "US Dollars",
  AED: "UAE Dirhams",
  EUR: "Euros",
  GBP: "British Pounds",
};

/** "Pakistani Rupees One Hundred Twelve Thousand Only" */
export function amountInWords(amount: number, currency: string) {
  const label = CURRENCY_WORDS[currency] ?? currency;
  return `${label} ${amountToWords(amount)} Only`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
