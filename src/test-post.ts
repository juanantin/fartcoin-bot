import * as dotenv from 'dotenv';
dotenv.config();

import { makeClient, runPost } from './poster';

const mode = process.argv[2] ?? 'lore';
const counterMap: Record<string, number> = { lore: 0, donation: 1, buycall: 2 };
const counter = counterMap[mode] ?? 0;

const client = makeClient();

console.log(`Forcing test post: mode=${mode}`);
runPost(client, counter)
  .then(() => { console.log('Done.'); process.exit(0); })
  .catch((err) => { console.error(err); process.exit(1); });
