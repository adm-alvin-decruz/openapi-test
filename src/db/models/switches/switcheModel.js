const pool = require('../../connections/mysqlConn');
const { getCurrentUTCTimestamp } = require('../../../utils/dateUtils');
const commonService = require('../../../services/commonService');

class Switch {
  /**
   * NOT tested function
   * @param {json} data
   * @returns
   */
  static async create(data) {
    try {
      const sql = `INSERT INTO switches (name, switch, description, created_at, updated_at)
                  VALUES (?, ?, ?, NOW(), NOW())`;
      const params = [data.name, data.switch, data.description];
      const result = await pool.execute(sql, params);
      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        newsletter_id: result.insertId
      };
    } catch (error) {
      console.error('Error creating switch:', commonService.replaceSqlPlaceholders(sql, params));
      throw new Error(`Error creating switch: ${error}`);
    }
  }

  static async findByName(name) {
    try {
      const sql = 'SELECT * FROM switches WHERE name = ?';
      const rows = await pool.query(sql, [name]);
      return rows[0];
    } catch (error) {
      console.error('Error reading switch by name:', commonService.replaceSqlPlaceholders(sql, params));
      throw new Error(`Error reading switch by name: ${error}`);
    }
  }

  static async findAll() {
    try {
      const sql = 'SELECT * FROM switches';
      return await pool.query(sql);
    } catch (error) {
      console.error('Error reading all switches:', commonService.replaceSqlPlaceholders(sql, params));
      throw new Error(`Error reading all switches: ${error}`);
    }
  }

  static async update(id, data) {
    try {
      const sql = `UPDATE switches
                   SET name = ?, switch = ?, description = ?, updated_at = NOW()
                   WHERE id = ?`;
      const result = await pool.execute(sql, [data.name, data.switch, data.description, id]);
      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        newsletter_id: result.affectedRows
      };
    } catch (error) {
      console.error('Error updating switch:', commonService.replaceSqlPlaceholders(sql, params));
      throw new Error(`Error updating switch: ${error}`);
    }
  }

  static async updateMultiple(reqBody) {
    try {
      var queries = '';
      var result = [];
      var statement = [];
      var key = 0;
      for (const record of reqBody) {
        key ++;
        queries = `UPDATE switches SET switch = ?, description = ?, updated_at=now() WHERE id= ? `;
        result[key] = await pool.execute(queries, [record.switch, record.description, record.id]);
        statement[key] = commonService.replaceSqlPlaceholders(queries, [record.switch, record.description, record.id]);
      }

      return {
        sql_statement: statement,
        switches: result
      };
    } catch (error) {
      console.error('Error updating switch:', error);
    }
  }

  static  async delete(id) {
    try {
      const sql = 'DELETE FROM switches WHERE id = ?';
      const result = await pool.execute(sql, [id]);
      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, params),
        newsletter_id: result.affectedRows
      };
    } catch (error) {
      console.error('Error updating switch:', commonService.replaceSqlPlaceholders(sql, params));
      throw new Error(`Error updating switch: ${error}`);
    }
  }
}

module.exports = Switch;