import axios from 'axios';

const DONATE_URL = 'https://www.donate.gg/charity-coins';

export interface DonationInfo {
  total: string;
  raw: string;
}

export async function fetchDonationTotal(): Promise<DonationInfo> {
  try {
    const res = await axios.get(DONATE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FartcoinBot/1.0)' },
      timeout: 10000,
    });
    const html: string = res.data;

    // Try to find a dollar amount near $FARTCOIN context
    const fartcoinSection = html.match(/fartcoin[\s\S]{0,500}/i)?.[0] ?? html;
    const amounts = [...fartcoinSection.matchAll(/\$(\d[\d,]*\.?\d*)/gi)];

    if (amounts.length > 0) {
      const raw = amounts[0][0];
      return { total: raw, raw };
    }

    // Fallback: first dollar amount on the page
    const fallback = html.match(/\$(\d[\d,]*\.?\d*)/)?.[0];
    if (fallback) return { total: fallback, raw: fallback };

    return { total: 'an undisclosed sum', raw: '' };
  } catch {
    return { total: 'an undisclosed sum', raw: '' };
  }
}
