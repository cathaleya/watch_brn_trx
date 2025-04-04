# CATHALEYA Blockchain Monitor Bot

![Banner](https://i.imgur.com/JQ7w3Zn.png)

A Telegram bot that monitors cryptocurrency balances across multiple blockchain testnets and reports them at regular intervals.

## Features

- 🚀 **Multi-chain monitoring**: Supports 4 testnets (ARB Sepolia, Base Sepolia, Unichain Sepolia, Blast Sepolia)
- ⏱ **Scheduled updates**: Checks balances every 10 minutes
- 📊 **Clean reporting**: Formatted messages with emoji indicators
- 🔔 **Instant alerts**: Immediate notifications via Telegram
- 📝 **Comprehensive logging**: Both console and file logging

## Prerequisites

- Node.js v16+
- Telegram bot token
- Alchemy API key
- Ethereum wallet address

## Installation

1. Clone the repository:
```bash
git clone https://github.com/cathaleya/watch_brn_trx.git
cd watch_brn

Install dependencies:

npm install

Create .env file:

bash
Copy
cp .env.example .env
Edit .env with your credentials:

env
Copy this and paste to your .env

TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
ALCHEMY_API_KEY=your_alchemy_key
WALLET_ADDRESS=0xYourWalletAddress
Usage
Start the bot:

bash
Copy
node bot.js / npm start
after start bot on your vps go to your telegram bot aftter banner use
Telegram Commands
/start - Begin monitoring

/stop - Stop monitoring

/status - Check current status

Sample Output
Copy
* CATHALEYA BALANCE MONITOR *

* Time: 6/15/2023, 10:30:45 AM
* Address: 0x1cb7...9383

BALANCES:
* ARB Sepolia: 1.9184 ARB
* Base Sepolia: 36.0104 BASE
* Unichain Sepolia: you must edit in watch_brn.js and use RPC UNIchain with your alchemy rpc
* Blast Sepolia: 13.2091 BLAST

Next update: 10 minutes
Configuration
Customize monitoring in bot.js:

javascript
Copy
// Change update interval (cron syntax)
this.monitoringInterval = '*/10 * * * *'; 

// Add new chains
this.chains['New Chain'] = {
    apiUrl: 'https://new-chain.api',
    symbol: 'NEW'
};
Troubleshooting
Check logs in:

Console output

blockchain_telegram_bot.log file

Common issues:

Ensure all API keys are valid

Verify Telegram bot has message permissions

Check wallet address is correct

License
MIT License

Support
For issues or feature requests, please open an issue.

