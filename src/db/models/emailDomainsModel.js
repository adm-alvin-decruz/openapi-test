const db = require('../connections/mysqlConn');

class EmailDomainModel {
  // Helper function for datetime formatting
  static getMySQLDateTime() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  static async findById(id) {
    const sql = 'SELECT * FROM email_domains WHERE id = ?';
    return await db.query(sql, [id]);
  }

  static async findByDomain(domain) {
    const sql = 'SELECT * FROM email_domains WHERE domain = ?';
    return await db.query(sql, [domain]);
  }

  static async create(domain, valid = 0) {
    const now = this.getMySQLDateTime();
    const sql = `
      INSERT INTO email_domains (domain, valid, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `;
    return await db.execute(sql, [domain, valid, now, now]);
  }

  static async update(id, data) {
    const allowedFields = ['domain', 'valid'];
    const updates = [];
    const values = [];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (updates.length === 0) return null;

    updates.push('updated_at = now()');
    values.push(id);

    const sql = `
      UPDATE email_domains
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    return await db.execute(sql, values);
  }

  static async delete(id) {
    const sql = 'DELETE FROM email_domains WHERE id = ?';
    return await db.execute(sql, [id]);
  }

  static async listDomains(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const sql = `
      SELECT * FROM email_domains
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    return await db.query(sql, [limit, offset]);
  }

  static async upsert(domain, valid = 0) {
    const now = this.getMySQLDateTime();

    // Using ON DUPLICATE KEY UPDATE with the UNIQUE constraint on domain
    const sql = `
      INSERT INTO email_domains (domain, valid, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        valid = VALUES(valid),
        updated_at = ?
    `;

    try {
      const result = await db.execute(sql, [
        domain.toLowerCase().trim(), // Ensure domain is lowercase and trimmed
        valid,
        now,
        now,
        now
      ]);

      // Return object with operation details
      console.log({
        id: result.insertId || result.insertId === 0 ? result.insertId : null,
        affectedRows: result.affectedRows,
        isInsert: result.insertId > 0,
        isUpdate: result.affectedRows === 2, // MySQL returns 2 for update, 1 for insert
        changedRows: result.changedRows || 0
      });
    } catch (error) {
      throw new Error(`Upsert failed: ${error.message}`);
    }
  }
}

module.exports = {
  EmailDomainModel
};