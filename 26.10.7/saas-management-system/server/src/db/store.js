'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * 极简数据层：内存对象 + JSON 文件持久化。
 *
 * 这是一个刻意做的取舍 —— 为了让示例代码零依赖、开箱即跑。
 * 它对上层暴露的只有 collection / insert / update / remove / query 这几个语义，
 * 因此替换成 Prisma、TypeORM 或任何 SQL 客户端时，只需要重写本文件，
 * service 层与 route 层完全不用动。
 */

const EMPTY = () => ({
  tenants: [],
  users: [],
  roles: [],
  plans: [],
  subscriptions: [],
  invoices: [],
  usage: [],
  auditLogs: [],
});

let state = EMPTY();
let saveTimer = null;

function ensureDir(file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
  ensureDir(config.db.file);
  if (fs.existsSync(config.db.file)) {
    try {
      const raw = fs.readFileSync(config.db.file, 'utf8');
      const parsed = JSON.parse(raw);
      state = Object.assign(EMPTY(), parsed);
      return { seeded: false };
    } catch (err) {
      console.warn('[db] 数据文件解析失败，将重新播种：', err.message);
    }
  }
  // 懒加载 seed，避免 store <-> seed 的循环依赖
  const seedDatabase = require('./seed');
  state = seedDatabase();
  persistNow();
  return { seeded: true };
}

function persistNow() {
  ensureDir(config.db.file);
  fs.writeFileSync(config.db.file, JSON.stringify(state, null, 2), 'utf8');
}

function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      persistNow();
    } catch (err) {
      console.error('[db] 持久化失败：', err.message);
    }
  }, 120);
}

function collection(name) {
  if (!state[name]) state[name] = [];
  return state[name];
}

function insert(name, entity) {
  collection(name).push(entity);
  persist();
  return entity;
}

function insertMany(name, entities) {
  collection(name).push(...entities);
  persist();
  return entities;
}

function update(name, id, patch) {
  const list = collection(name);
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  list[idx] = Object.assign({}, list[idx], patch);
  persist();
  return list[idx];
}

function remove(name, id) {
  const list = collection(name);
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  const [removed] = list.splice(idx, 1);
  persist();
  return removed;
}

function findById(name, id) {
  return collection(name).find((item) => item.id === id) || null;
}

function findOne(name, predicate) {
  return collection(name).find(predicate) || null;
}

function filter(name, predicate) {
  return collection(name).filter(predicate);
}

function reset() {
  state = seedDatabase();
  persistNow();
  return true;
}

function raw() {
  return state;
}

module.exports = {
  load,
  reset,
  persist,
  persistNow,
  raw,
  collection,
  insert,
  insertMany,
  update,
  remove,
  findById,
  findOne,
  filter,
};
