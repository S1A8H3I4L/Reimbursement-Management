import { Currency } from "../types";

export async function fetchCountries() {
  const response = await fetch('https://restcountries.com/v3.1/all?fields=name,currencies');
  const data = await response.json();
  return data.map((country: any) => ({
    name: country.name.common,
    currencies: country.currencies ? Object.keys(country.currencies).map(code => ({
      code,
      name: country.currencies[code].name
    })) : []
  })).sort((a: any, b: any) => a.name.localeCompare(b.name));
}

export async function convertCurrency(amount: number, from: string, to: string) {
  if (from === to) return amount;
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const data = await response.json();
    const rate = data.rates[to];
    return amount * rate;
  } catch (error) {
    console.error("Currency conversion error:", error);
    return amount;
  }
}
