const mysql = require('mysql2/promise');

class Database {
  constructor(config) {
    this.masterPool = mysql.createPool(config.master);
    this.slavePool = mysql.createPool(config.slave);
  }

  async query(sql, values, isWrite = false) {
    const pool = isWrite ? this.masterPool : this.slavePool;
    const [rows] = await pool.promise().execute(sql, values);
    return rows;
  }

  async create(table, data) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    data.created_at = now;
    data.updated_at = now;

    const keys = Object.keys(data);
    const values = Object.values(data);
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;

    const result = await this.query(sql, values, true);
    return result.insertId;
  }

  async read(table, conditions = {}, fields = '*') {
    const where = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    const sql = `SELECT ${fields} FROM ${table}${where ? ` WHERE ${where}` : ''}`;
    return this.query(sql, Object.values(conditions));
  }

  async update(table, data, conditions) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    data.updated_at = now;

    const set = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const where = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    const sql = `UPDATE ${table} SET ${set} WHERE ${where}`;

    const values = [...Object.values(data), ...Object.values(conditions)];
    return this.query(sql, values, true);
  }

  async delete(table, conditions) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const where = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    const sql = `UPDATE ${table} SET updated_at = ? WHERE ${where}; DELETE FROM ${table} WHERE ${where}`;

    const values = [now, ...Object.values(conditions), ...Object.values(conditions)];
    return this.query(sql, values, true);
  }
}

class UserModel extends Database {
  constructor(config) {
    super(config);
    this.table = 'users';
  }

  async createUser(userData) {
    return this.create(this.table, userData);
  }

  async getUserById(id) {
    return this.read(this.table, { id });
  }

  async updateUser(id, userData) {
    return this.update(this.table, userData, { id });
  }

  async deleteUser(id) {
    return this.delete(this.table, { id });
  }
}

class UserMembershipModel extends Database {
  constructor(config) {
    super(config);
    this.table = 'user_memberships';
  }

  async createMembership(membershipData) {
    return this.create(this.table, membershipData);
  }

  async getMembershipsByUserId(userId) {
    return this.read(this.table, { user_id: userId });
  }

  async updateMembership(id, membershipData) {
    return this.update(this.table, membershipData, { id });
  }

  async deleteMembership(id) {
    return this.delete(this.table, { id });
  }
}

class UserNewsletterModel extends Database {
  constructor(config) {
    super(config);
    this.table = 'user_newsletters';
  }

  async createNewsletter(newsletterData) {
    return this.create(this.table, newsletterData);
  }

  async getNewslettersByUserId(userId) {
    return this.read(this.table, { user_id: userId });
  }

  async updateNewsletter(id, newsletterData) {
    return this.update(this.table, newsletterData, { id });
  }

  async deleteNewsletter(id) {
    return this.delete(this.table, { id });
  }
}

class UserDetailModel extends Database {
  constructor(config) {
    super(config);
    this.table = 'user_details';
  }

  async createUserDetail(detailData) {
    return this.create(this.table, detailData);
  }

  async getUserDetailByUserId(userId) {
    return this.read(this.table, { user_id: userId });
  }

  async updateUserDetail(id, detailData) {
    return this.update(this.table, detailData, { id });
  }

  async deleteUserDetail(id) {
    return this.delete(this.table, { id });
  }
}

class UserCredentialModel extends Database {
  constructor(config) {
    super(config);
    this.table = 'user_credentials';
  }

  async createCredential(credentialData) {
    return this.create(this.table, credentialData);
  }

  async getCredentialByUsername(username) {
    return this.read(this.table, { username });
  }

  async updateCredential(id, credentialData) {
    return this.update(this.table, credentialData, { id });
  }

  async deleteCredential(id) {
    return this.delete(this.table, { id });
  }
}

module.exports = {
  UserModel,
  UserMembershipModel,
  UserNewsletterModel,
  UserDetailModel,
  UserCredentialModel
};