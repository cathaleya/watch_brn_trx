require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');

// Logging configuration
const { createLogger, format, transports } = require('winston');
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
            return `${timestamp} - ${level}: ${message}`;
        })
    ),
    transports: [
        new transports.File({ filename: 'blockchain_telegram_bot.log' }),
        new transports.Console()
    ]
});

class BlockchainMonitorBot {
    constructor() {
        // Load configuration from .env
        this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
        this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
        this.alchemyApiKey = process.env.ALCHEMY_API_KEY;
        this.address = process.env.WALLET_ADDRESS;
        
        // Monitoring state
        this.monitoringActive = false;
        this.monitoringInterval = '*/10 * * * *'; // Every 10 minutes
        this.monitoringTask = null;
        
        // Initialize Telegram Bot
        try {
            this.bot = new TelegramBot(this.telegramBotToken, { polling: true });
            this.setupCommands();
            this.showBanner();
            logger.info('Telegram Bot Initialized');
        } catch (initError) {
            logger.error(`Telegram Bot Initialization Error: ${initError}`);
            this.bot = null;
        }
        
        // Chain configurations
        this.chains = {
            'ARB Sepolia': {
                apiUrl: `https://arb-sepolia.g.alchemy.com/v2/${this.alchemyApiKey}`,
                symbol: 'ARB',
                type: 'native'
            },
            'Base Sepolia': {
                apiUrl: `https://base-sepolia.g.alchemy.com/v2/${this.alchemyApiKey}`,
                symbol: 'BASE',
                type: 'native'
            },
            'Unichain Sepolia': {
                apiUrl: `https://unichain-sepolia.g.alchemy.com/v2/19g7XfRolp7-wX7NvTE7_ojyjd3Gvypr`,
                symbol: 'UNI',
                type: 'native'
            },
            'Blast Sepolia': {
                apiUrl: `https://blast-sepolia.g.alchemy.com/v2/${this.alchemyApiKey}`,
                symbol: 'BLAST',
                type: 'native'
            },
            'BRN Token': {
                apiUrl: `https://b2n.explorer.caldera.xyz/api/v2/addresses/${this.address}`,
                symbol: 'BRN',
                type: 'token',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        };
    }

    async showBanner() {
        const banner = `
  ¦¦¦¦¦¦+ ¦¦¦¦¦+ ¦¦¦¦¦¦¦¦+¦¦+  ¦¦+ ¦¦¦¦¦+ ¦¦+     ¦¦¦¦¦¦¦+¦¦+   ¦¦+ ¦¦¦¦¦+ 
 ¦¦+----+¦¦+--¦¦++--¦¦+--+¦¦¦  ¦¦¦¦¦+--¦¦+¦¦¦     ¦¦+----++¦¦+ ¦¦++¦¦+--¦¦+
 ¦¦¦     ¦¦¦¦¦¦¦¦   ¦¦¦   ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦     ¦¦¦¦¦+   +¦¦¦¦++ ¦¦¦¦¦¦¦¦
 ¦¦¦     ¦¦+--¦¦¦   ¦¦¦   ¦¦+--¦¦¦¦¦+--¦¦¦¦¦¦     ¦¦+--+    +¦¦++  ¦¦+--¦¦¦
 +¦¦¦¦¦¦+¦¦¦  ¦¦¦   ¦¦¦   ¦¦¦  ¦¦¦¦¦¦  ¦¦¦¦¦¦¦¦¦¦+¦¦¦¦¦¦¦+   ¦¦¦   ¦¦¦  ¦¦¦
  +-----++-+  +-+   +-+   +-+  +-++-+  +-++------++------+   +-+   +-+  +-+
  
 MULTI-CHAIN BALANCE MONITOR
 v1.1 | 4 Testnets + BRN Token Support
`;
        console.log(banner);
        try {
            await this.sendTelegramMessage(`<pre>${banner}</pre>`);
        } catch (error) {
            logger.error(`Error sending banner: ${error}`);
        }
    }

    async getChainBalance(chainName) {
        const chain = this.chains[chainName];
        if (!chain) {
            logger.error(`Unknown chain: ${chainName}`);
            return null;
        }

        try {
            if (chain.type === 'native') {
                const response = await axios.post(chain.apiUrl, {
                    jsonrpc: "2.0",
                    method: "eth_getBalance",
                    params: [this.address, "latest"],
                    id: 1
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });

                const rawBalance = parseInt(response.data.result, 16);
                const formattedBalance = (rawBalance / Math.pow(10, 18)).toFixed(4);
                
                return {
                    rawBalance: rawBalance,
                    formattedBalance: formattedBalance,
                    symbol: chain.symbol
                };
            } else if (chain.type === 'token') {
                return await this.getBRNBalance();
            }
        } catch (error) {
            logger.error(`Error fetching ${chainName} balance: ${error.message}`);
            if (error.response) {
                logger.error(`API Response: ${JSON.stringify(error.response.data)}`);
            }
            return null;
        }
    }

    async getBRNBalance() {
        const chain = this.chains['BRN Token'];
        try {
            const response = await axios.get(chain.apiUrl, {
                headers: chain.headers,
                timeout: 10000
            });
            
            logger.debug(`BRN API Response: ${JSON.stringify(response.data)}`);
            
            // Handle BRN balance from Caldera API
            const rawBalance = Number(response.data.coin_balance);
            const formattedBalance = (rawBalance / Math.pow(10, 18)).toFixed(4);
            
            return {
                rawBalance: rawBalance,
                formattedBalance: formattedBalance,
                symbol: chain.symbol
            };
        } catch (error) {
            logger.error(`BRN Balance Error: ${error.message}`);
            if (error.response) {
                logger.error(`BRN API Error Response: ${JSON.stringify(error.response.data)}`);
            }
            return null;
        }
    }

    async sendTelegramMessage(message) {
        if (!this.bot) {
            logger.error("Telegram Bot not initialized");
            return false;
        }

        try {
            await this.bot.sendMessage(this.telegramChatId, message, { parse_mode: 'HTML' });
            return true;
        } catch (error) {
            logger.error(`Telegram Message Error: ${error}`);
            return false;
        }
    }

    async monitorBalances() {
        if (!this.monitoringActive) return;

        logger.info("Starting balance monitoring");
        
        try {
            const currentTime = new Date().toLocaleString();
            let message = `* CATHALEYA BALANCE MONITOR *\n\n`;
            message += `* Time: ${currentTime}\n`;
            message += `* Address: <code>${this.address.substring(0, 6)}...${this.address.substring(38)}</code>\n\n`;
            message += `<b>BALANCES:</b>\n`;

            // Check balances for all chains
            for (const [chainName, chainConfig] of Object.entries(this.chains)) {
                const balanceInfo = await this.getChainBalance(chainName);
                if (balanceInfo) {
                    message += `* ${chainName}: <b>${balanceInfo.formattedBalance}</b> ${balanceInfo.symbol}\n`;
                } else {
                    message += `* ${chainName}: <i>Failed to fetch</i>\n`;
                }
            }

            message += `\n<code>Next update: 10 minutes</code>`;
            await this.sendTelegramMessage(message);
            logger.info("Balance updates sent");
        } catch (error) {
            logger.error(`Monitoring Error: ${error}`);
            this.monitoringActive = false;
        }
    }

    setupCommands() {
        this.bot.onText(/\/start/, async (msg) => {
            const user = msg.from;
            
            if (this.monitoringActive) {
                await this.bot.sendMessage(msg.chat.id, "* Monitoring is already active! Use /stop first.");
                return;
            }
            
            this.monitoringActive = true;
            this.telegramChatId = msg.chat.id;
            
            this.monitoringTask = cron.schedule(this.monitoringInterval, () => {
                this.monitorBalances();
            }, {
                scheduled: true,
                timezone: "UTC"
            });
            
            this.monitorBalances();
            
            const startupMessage = `* <b>Monitoring Activated!</b>\n\n` +
                                 `* Address: <code>${this.address}</code>\n` +
                                 `* Interval: 10 minutes\n` +
                                 `* Started By: @${user.username}`;
            
            await this.bot.sendMessage(msg.chat.id, startupMessage, { parse_mode: 'HTML' });
            logger.info(`Monitoring started by @${user.username}`);
        });
        
        this.bot.onText(/\/stop/, async (msg) => {
            const user = msg.from;
            
            if (this.monitoringActive) {
                this.monitoringActive = false;
                if (this.monitoringTask) {
                    this.monitoringTask.stop();
                }
                
                const shutdownMessage = `* <b>Monitoring Stopped</b>\n\n` +
                                      `* Address: <code>${this.address}</code>\n` +
                                      `* Stopped By: @${user.username}`;
                
                await this.bot.sendMessage(msg.chat.id, shutdownMessage, { parse_mode: 'HTML' });
                logger.info(`Monitoring stopped by @${user.username}`);
            } else {
                await this.bot.sendMessage(msg.chat.id, "* No active monitoring.");
            }
        });

        this.bot.onText(/\/status/, async (msg) => {
            const statusMessage = this.monitoringActive 
                ? `* <b>CATHALEYA is actively monitoring</b>\n` +
                  `Next update in ${this.getNextUpdateTime()}`
                : `* <b>CATHALEYA is currently inactive</b>\n` +
                  `Use /start to begin monitoring`;
            
            await this.bot.sendMessage(msg.chat.id, statusMessage, { parse_mode: 'HTML' });
        });
    }

    getNextUpdateTime() {
        if (!this.monitoringActive) return "N/A";
        const now = new Date();
        const nextUpdate = new Date(now.getTime() + 10 * 60 * 1000);
        return nextUpdate.toLocaleTimeString();
    }
}

// Main execution
const bot = new BlockchainMonitorBot();

// Handle process termination
process.on('SIGINT', () => {
    logger.info('Bot stopped by user.');
    process.exit();
});
