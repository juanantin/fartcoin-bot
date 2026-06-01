import * as dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const apiKey = process.env.X_API_KEY;
const apiSecret = process.env.X_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error('X_API_KEY and X_API_SECRET must be set in .env before running auth.');
  process.exit(1);
}

async function main() {
  const client = new TwitterApi({ appKey: apiKey!, appSecret: apiSecret! });

  console.log('\n=== Truth Terminal Bot — OAuth PIN Auth ===\n');

  const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink('oob');

  console.log('1. Open this URL in the browser where you are logged in as @FartTruthTerm:');
  console.log(`\n   ${url}\n`);
  console.log('2. Authorize the app, then paste the PIN below.\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question('PIN: ', async (pin) => {
    rl.close();
    try {
      const loginClient = new TwitterApi({
        appKey: apiKey!,
        appSecret: apiSecret!,
        accessToken: oauth_token,
        accessSecret: oauth_token_secret,
      });

      const { accessToken, accessSecret, screenName } = await loginClient.login(pin.trim());

      console.log(`\nAuthorized as @${screenName}`);

      // Write tokens back to .env
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

      envContent = setEnvVar(envContent, 'X_ACCESS_TOKEN', accessToken);
      envContent = setEnvVar(envContent, 'X_ACCESS_SECRET', accessSecret);

      fs.writeFileSync(envPath, envContent);
      console.log('\nTokens saved to .env — you can now start the bot with: npm start\n');
    } catch (err) {
      console.error('Auth failed:', err);
      process.exit(1);
    }
  });
}

function setEnvVar(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  return regex.test(content) ? content.replace(regex, line) : content + `\n${line}`;
}

main();
