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

    // Find the section around fartcoin (case-insensitive)
    const fartIdx = html.toLowerCase().indexOf('fartcoin');
    if (fartIdx !== -1) {
      const section = html.slice(Math.max(0, fartIdx - 200), fartIdx + 500);

      // Match amounts like 18,153.83 or 18153.83
      const match = section.match(/([\d,]+\.\d{2})/);
      if (match) {
        const raw = match[1];
        return { total: `$${raw}`, raw };
      }
    }

    // Fallback: first dollar amount on page near fartcoin context
    const fallback = html.match(/\$([\d,]+\.\d{2})/);
    if (fallback) return { total: fallback[0], raw: fallback[1] };

    return { total: 'an undisclosed sum', raw: '' };
  } catch {
    return { total: 'an undisclosed sum', raw: '' };
  }
}
