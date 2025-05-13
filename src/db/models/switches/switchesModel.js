const pool = require('../../connections/mysqlConn');
const commonService = require('../../../services/commonService');
const loggerService = require('../../../logs/logger');

class Switch {
  /**
   * NOT tested function
   * @param {json} data
   * @returns
   */
  static async create(data) {
    const sql = `INSERT INTO switches (name, switch, description, created_at, updated_at)
                  VALUES (?, ?, ?, NOW(), NOW())`;
    const params = [data.name, data.switch, data.description];

    try {
      await pool.execute(sql, params);
      return {
        message: `create switches ${data.name} success`,
      };
    } catch (error) {
      console.error(`Error creating switch: ${commonService.replaceSqlPlaceholders(sql, params)}`);
      throw new Error(`Error insert switches: ${error}`);
    }
  }

  static async findByName(name) {
    const sql = 'SELECT * FROM switches WHERE name = ?';
    try {
      const rows = await pool.query(sql, [name]);
      return rows[0];
    } catch (error) {
      loggerService.error(`Error reading switches by name. SQL: ${sql}. Error: ${error}`);
    }
  }

  static async findAll() {
    const sql = 'SELECT * FROM switches';

    try {
      return await pool.query(sql);
    } catch (error) {
      console.error('Error reading all switches SQL:', sql);
      throw new Error(`Error reading all switches: ${error}`);
    }
  }

  static async update(id, data) {
    const sql = `UPDATE switches
                   SET name = ?, switch = ?, description = ?, updated_at = NOW()
                   WHERE id = ?`;

    try {
      const result = await pool.execute(sql, [data.name, data.switch, data.description, id]);
      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, data),
        newsletter_id: result.affectedRows
      };
    } catch (error) {
      console.error('Error updating switch:', commonService.replaceSqlPlaceholders(sql, data));
      throw new Error(`Error updating switch: ${error}`);
    }
  }

  static async updateMultiple(reqBody) {
    try {
      var queries = '';
      var result = [];
      var statement = [];
      var key = 0;
      let params = [];
      for (const record of reqBody) {
        params = [record.name, record.switch, record.description, record.id];
        key ++;
        queries = `UPDATE switches SET name = ?, switch = ?, description = ?, updated_at=now() WHERE id= ? `;
        result[key] = await pool.execute(queries, params);
        statement[key] = commonService.replaceSqlPlaceholders(queries, params);
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
    const sql = 'DELETE FROM switches WHERE id = ?';
    const params = [id];
    try {
      const result = await pool.execute(sql, params);
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
