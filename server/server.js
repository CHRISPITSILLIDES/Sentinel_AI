import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const database = new Database(path.join(directory, 'nataconnect.db'));
const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors({ origin: true }));
app.use(express.json({ limit: '256kb' }));

database.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, pin TEXT DEFAULT '',
    last_login TEXT, phone_locked INTEGER DEFAULT 0, health_score INTEGER DEFAULT 80,
    net_worth REAL DEFAULT 0, color TEXT DEFAULT '#3b82f6', country TEXT DEFAULT 'CY'
  );
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY, member_id TEXT NOT NULL, type TEXT, last_four TEXT,
    balance REAL DEFAULT 0, currency TEXT DEFAULT 'EUR', label TEXT, brand TEXT,
    color TEXT DEFAULT '#3b82f6', locked INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, card_id TEXT NOT NULL, merchant TEXT, seller_url TEXT,
    amount REAL, currency TEXT DEFAULT 'EUR', category TEXT, status TEXT,
    timestamp TEXT, blocked_reason TEXT, is_scam_report INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY, member_id TEXT NOT NULL, name TEXT, target REAL,
    current REAL, category TEXT, deadline TEXT, protected INTEGER DEFAULT 0,
    color TEXT DEFAULT '#10b981'
  );
  CREATE TABLE IF NOT EXISTS shield_rules (
    id TEXT PRIMARY KEY, member_id TEXT NOT NULL, card_id TEXT DEFAULT 'all',
    rule TEXT, rule_type TEXT DEFAULT 'custom', active INTEGER DEFAULT 1,
    scope TEXT DEFAULT 'personal'
  );
  CREATE TABLE IF NOT EXISTS scam_domains (
    domain TEXT PRIMARY KEY, reports INTEGER DEFAULT 1, category TEXT,
    first_seen TEXT, last_seen TEXT, verified INTEGER DEFAULT 0
  );
`);

const seed = database.transaction(() => {
  const addMember = database.prepare(`INSERT OR IGNORE INTO members
    (id, name, role, pin, last_login, health_score, net_worth, color, country)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  addMember.run('zack', 'Zack', 'admin', '', new Date().toISOString(), 84, 8960.5, '#3b82f6', 'CY');
  addMember.run('sarah', 'Sarah', 'member', '', new Date().toISOString(), 79, 4200, '#ec4899', 'CY');
  addMember.run('george', 'George', 'protected', '', new Date().toISOString(), 81, 1750, '#10b981', 'CY');

  const addCard = database.prepare(`INSERT OR IGNORE INTO cards
    (id, member_id, type, last_four, balance, currency, label, brand, color)
    VALUES (?, ?, ?, ?, ?, 'EUR', ?, ?, ?)`);
  addCard.run('card-zack-1', 'zack', 'debit', '4821', 2840.5, 'Everyday card', 'Visa', '#3b82f6');
  addCard.run('card-zack-2', 'zack', 'debit', '7314', 6120, 'Family savings', 'Mastercard', '#10b981');
  addCard.run('card-sarah-1', 'sarah', 'debit', '2048', 4200, 'Main card', 'Visa', '#ec4899');
  addCard.run('card-george-1', 'george', 'debit', '1160', 1750, 'Protected card', 'Visa', '#10b981');

  const addGoal = database.prepare(`INSERT OR IGNORE INTO goals
    (id, member_id, name, target, current, category, deadline, protected, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  addGoal.run('goal-zack-1', 'zack', 'Emergency buffer', 5000, 1850, 'emergency', '2026-12-31', 1, '#10b981');
  addGoal.run('goal-zack-2', 'zack', 'Summer trip', 2400, 900, 'vacation', '2027-06-01', 0, '#f59e0b');

  const addRule = database.prepare(`INSERT OR IGNORE INTO shield_rules
    (id, member_id, card_id, rule, rule_type, active, scope) VALUES (?, ?, ?, ?, ?, 1, ?)`);
  addRule.run('rule-zack-1', 'zack', 'card-zack-1', 'Review online purchases above EUR 250', 'spending_limit', 'personal');
  addRule.run('rule-family-1', 'family', 'all', 'Ask for confirmation on unusual family payments', 'seller_verification', 'family');

  const addTransaction = database.prepare(`INSERT OR IGNORE INTO transactions
    (id, card_id, merchant, seller_url, amount, category, status, timestamp, blocked_reason, is_scam_report)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  addTransaction.run('tx-zack-1', 'card-zack-1', 'Local Market', null, 64.3, 'Food', 'approved', new Date().toISOString(), null, 0);
  addTransaction.run('tx-zack-2', 'card-zack-1', 'Unknown Electronics', 'unknown-electronics.example', 499, 'Shopping', 'flagged', new Date(Date.now() - 86400000).toISOString(), 'New merchant and unusually high amount', 0);
});
seed();

const mapMember = row => ({
  id: row.id, name: row.name, role: row.role, pin: row.pin || '', last_login: row.last_login,
  phone_locked: Boolean(row.phone_locked), health_score: row.health_score, net_worth: row.net_worth,
  color: row.color, country: row.country,
});

app.get('/health', (_request, response) => response.json({ online: true, mode: 'pi-server', database: 'sqlite' }));
app.get('/family/members', (_request, response) => response.json(database.prepare('SELECT * FROM members ORDER BY rowid').all().map(mapMember)));
app.post('/family/members/:id/verify-pin', (request, response) => {
  const member = database.prepare('SELECT pin FROM members WHERE id = ?').get(request.params.id);
  response.json({ success: Boolean(member && (!member.pin || member.pin === String(request.body?.pin || ''))) });
});
app.get('/members/:id/cards', (request, response) => {
  const rows = database.prepare('SELECT * FROM cards WHERE member_id = ? ORDER BY rowid').all(request.params.id);
  response.json(rows.map(row => ({ id: row.id, name: row.label, cardType: row.type, lastFour: row.last_four, brand: row.brand, balance: row.balance, currency: row.currency, color: row.color, isActive: !row.locked })));
});
app.get('/members/:id/goals', (request, response) => {
  const rows = database.prepare('SELECT * FROM goals WHERE member_id = ? ORDER BY rowid').all(request.params.id);
  response.json(rows.map(row => ({ id: row.id, name: row.name, targetAmount: row.target, currentAmount: row.current, category: row.category, deadline: row.deadline, isShieldProtected: Boolean(row.protected), icon: row.category, color: row.color })));
});
app.get('/members/:id/shield-rules', (request, response) => {
  const rows = database.prepare("SELECT * FROM shield_rules WHERE member_id IN (?, 'family') ORDER BY rowid").all(request.params.id);
  response.json(rows.map(row => ({ id: row.id, cardId: row.card_id, ruleText: row.rule, ruleType: row.rule_type, isActive: Boolean(row.active), parameters: {}, scope: row.scope })));
});
app.get('/members/:id/transactions', (request, response) => {
  const rows = database.prepare(`SELECT transactions.* FROM transactions JOIN cards ON cards.id = transactions.card_id
    WHERE cards.member_id = ? ORDER BY timestamp DESC`).all(request.params.id);
  response.json(rows.map(row => ({ id: row.id, cardId: row.card_id, sellerName: row.merchant, merchant: row.merchant, sellerUrl: row.seller_url, amount: row.amount, currency: row.currency, category: row.category, status: row.status, createdAt: row.timestamp, timestamp: row.timestamp, blockReason: row.blocked_reason, isScamReport: Boolean(row.is_scam_report) })));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`NataConnect Pi Server running on port ${port}`);
});
