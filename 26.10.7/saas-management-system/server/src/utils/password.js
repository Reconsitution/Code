'use strict';

const bcrypt = require('bcryptjs');
const config = require('../config');

function hashPassword(plain) {
  return bcrypt.hashSync(plain, config.bcryptRounds);
}

function comparePassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compareSync(plain, hash);
}

module.exports = { hashPassword, comparePassword };
