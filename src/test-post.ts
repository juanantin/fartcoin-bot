import * as dotenv from 'dotenv';
dotenv.config();

import { TwitterApi } from 'twitter-api-v2';
import { runPost } from './poster';

const mode = process.argv[2] ?? 'lore'; // lore | donation | buycall

const client = new TwitterApi({
  appKey: process.env.X_API_KEY!,
  appSecret: process.env.X_API_SECRET!,
  accessToken: process.env.X_ACCESS_TOKEN!,
  accessSecret: process.env.X_ACCESS_SECRET!,
});

// Map mode name to counter index
const counterMap: Record<string, number> = { lore: 0, donation: 1, buycall: 2 };
const counter = counterMap[mode] ?? 0;

console.log(`Forcing test post: mode=${mode}`);
runPost(client, counter)
  .then(() => { console.log('Done.'); process.exit(0); })
  .catch((err) => { console.error(err); process.exit(1); });
