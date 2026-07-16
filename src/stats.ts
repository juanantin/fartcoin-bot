import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { postTweet } from './poster';
import { sendToTelegram } from './telegram';

const SOLANA_RPC = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
const DATA_FILE = path.join(process.cwd(), 'data', 'donations.json');

interface DayRecord {
  date: string;   // YYYY-MM-DD UTC
  totalSol: number;
  totalUsd: number;
}

interface DonationStore {
  records: DayRecord[];
  lastFetchedSignature?: string;
}

function loadStore(): DonationStore {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch {}
  return { records: [] };
}

function saveStore(store: DonationStore): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

async function rpc(method: string, params: any[]): Promise<any> {
  const res = await axios.post(
    SOLANA_RPC,
    { jsonrpc: '2.0', id: 1, method, params },
    { timeout: 20000 }
  );
  if (res.data.error) throw new Error(res.data.error.message);
  return res.data.result;
}

async function getSolPrice(): Promise<number> {
  try {
    const res = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { timeout: 8000 }
    );
    return res.data?.solana?.usd ?? 150;
  } catch {
    return 150;
  }
}

// Fetch all SOL received by the donation wallet, grouped by UTC date
async function fetchOnchainDonations(): Promise<Record<string, number>> {
  const wallet = process.env.DONATION_WALLET;
  if (!wallet) {
    console.log('[stats] DONATION_WALLET not set, skipping onchain fetch');
    return {};
  }

  const store = loadStore();
  const byDate: Record<string, number> = {};

  // Seed existing stored records so we don't recount them
  for (const r of store.records) {
    byDate[r.date] = (byDate[r.date] ?? 0) + r.totalSol;
  }

  try {
    // Fetch up to 1000 recent signatures
    const sigs: Array<{ signature: string; blockTime: number | null }> = await rpc(
      'getSignaturesForAddress',
      [wallet, { limit: 1000, until: store.lastFetchedSignature }]
    );

    if (!sigs || sigs.length === 0) return byDate;

    // Process oldest-first so we can set lastFetchedSignature to the newest
    const ordered = [...sigs].reverse();

    for (const sig of ordered) {
      try {
        const tx = await rpc('getTransaction', [
          sig.signature,
          { encoding: 'json', commitment: 'confirmed', maxSupportedTransactionVersion: 0 },
        ]);
        if (!tx || !sig.blockTime) continue;

        const accounts: string[] = tx.transaction?.message?.accountKeys ?? [];
        const walletIdx = accounts.indexOf(wallet);
        if (walletIdx === -1) continue;

        const pre: number[] = tx.meta?.preBalances ?? [];
        const post: number[] = tx.meta?.postBalances ?? [];
        const delta = (post[walletIdx] ?? 0) - (pre[walletIdx] ?? 0);

        if (delta > 0) {
          const date = new Date(sig.blockTime * 1000).toISOString().slice(0, 10);
          byDate[date] = (byDate[date] ?? 0) + delta / 1e9;
        }
      } catch {
        // skip individual failed tx
      }
    }

    // Update last fetched to newest signature
    store.lastFetchedSignature = sigs[0]?.signature;
    const solPrice = await getSolPrice();

    // Rebuild records from byDate
    store.records = Object.entries(byDate).map(([date, totalSol]) => ({
      date,
      totalSol,
      totalUsd: totalSol * solPrice,
    }));
    saveStore(store);
  } catch (err: any) {
    console.error('[stats] onchain fetch error:', err?.message);
  }

  return byDate;
}

export interface DonationStats {
  today: number;      // SOL today
  todayUsd: number;
  avgUsd: number;
  athUsd: number;
  athDate: string;
  gapToAvgUsd: number;
  gapToAthUsd: number;
  solPrice: number;
}

export async function getDonationStats(): Promise<DonationStats | null> {
  const wallet = process.env.DONATION_WALLET;
  if (!wallet) {
    console.log('[stats] DONATION_WALLET not set');
    return null;
  }

  const solPrice = await getSolPrice();
  const byDate = await fetchOnchainDonations();

  if (Object.keys(byDate).length === 0) return null;

  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySol = byDate[todayKey] ?? 0;
  const todayUsd = todaySol * solPrice;

  const allValues = Object.entries(byDate).map(([date, sol]) => ({ date, usd: sol * solPrice }));
  const avgUsd = allValues.reduce((s, v) => s + v.usd, 0) / allValues.length;
  const ath = allValues.reduce((best, v) => (v.usd > best.usd ? v : best), { date: '', usd: 0 });

  return {
    today: todaySol,
    todayUsd,
    avgUsd,
    athUsd: ath.usd,
    athDate: ath.date,
    gapToAvgUsd: avgUsd - todayUsd,
    gapToAthUsd: ath.usd - todayUsd,
    solPrice,
  };
}

function formatUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export async function postDonationStats(): Promise<void> {
  console.log('[stats] generating donation stats post...');

  const stats = await getDonationStats();

  let text: string;

  if (!stats) {
    text = `the trees grow regardless of whether the numbers are legible. Fartcoin keeps planting. fartcoin.meme`;
  } else {
    const todayLine = `Today: ${formatUsd(stats.todayUsd)}`;
    const avgLine = `Avg/day: ${formatUsd(stats.avgUsd)}`;
    const athLine = `ATH: ${formatUsd(stats.athUsd)} (${stats.athDate})`;
    const gapAvg = stats.gapToAvgUsd > 0
      ? `${formatUsd(stats.gapToAvgUsd)} from avg`
      : `${formatUsd(-stats.gapToAvgUsd)} above avg`;
    const gapAth = stats.gapToAthUsd > 0
      ? `${formatUsd(stats.gapToAthUsd)} from ATH`
      : 'new ATH today';

    text = `Fartcoin donation pulse\n\n${todayLine}\n${avgLine}\n${athLine}\n\n${gapAvg} | ${gapAth}\n\nfartcoin.meme`;
  }

  if (text.length > 280) text = text.slice(0, 277) + '...';

  console.log(`[stats] posting (${text.length} chars):`, text);

  try {
    const id = await postTweet(text);
    console.log(`[stats] posted tweet id=${id}`);
    await sendToTelegram(id);
  } catch (err: any) {
    console.error('[stats] failed to post:', err?.message);
  }
}
