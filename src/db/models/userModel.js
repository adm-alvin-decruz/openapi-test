const pool = require('../connections/mysqlConn');
const { getCurrentUTCTimestamp, convertDateToMySQLFormat } = require('../../utils/dateUtils');
const commonService = require('../../services/commonService');

class User {
  static async create(userData) {
    const now = getCurrentUTCTimestamp();
    const sql = `
      INSERT INTO users
      (email, given_name, family_name, birthdate, mandai_id, source, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userData.email,
      userData.given_name,
      userData.family_name,
      convertDateToMySQLFormat(userData.birthdate),
      userData.mandai_id,
      userData.source,
      userData.active,
      now,
      now
    ];
    const result = await pool.execute(sql, params);

    return {
      sql_statement: commonService.replaceSqlPlaceholders(sql, params),
      user_id: result.insertId
    };
  }

  static async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const [rows] = await pool.query(sql, [id]);
    return rows[0];
  }

  static async findByEmail(email) {
    try{
      const sql = 'SELECT * FROM users WHERE email = ?';
      const rows = await pool.query(sql, [email]);
      return rows[0];
    }
    catch (error){
      return error;
    }
  }

  /** Find wild pass user full data */
  static async findWPFullData(email){
    try{
      const sql = `SELECT u.*, um.name,um.visual_id, un.type, un.subscribe FROM users u
                  INNER JOIN user_memberships um ON um.user_id = u.id
                  INNER JOIN user_newsletters un ON un.user_id = u.id
                  WHERE u.email = ? AND u.active=1`;
      const rows = await pool.query(sql, [email]);

      return {
        sql_statement: commonService.replaceSqlPlaceholders(sql, email),
        data: rows[0]
      }
    }
    catch (error){
      throw new Error(`Error queryWPUserByEmail: ${error}`);
    }
  }

  static async update(id, userData) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(userData)
      .filter(([key, value]) => value !== undefined)
      .map(([key, value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push('updated_at = ?');

    // Construct the SQL query
    const sql = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    // Prepare the params array
    const params = [
      ...Object.values(userData).filter(value => value !== undefined),
      now,
      id
    ];

    // Execute the query
    const result = await pool.execute(sql, params);

    return {
      sql_statement: commonService.replaceSqlPlaceholders(sql, params),
      user_id: result.insertId
    };
  }

  static async delete(id) {
    const now = getCurrentUTCTimestamp();
    const sql = 'UPDATE users SET active = false, updated_at = ? WHERE id = ?';
    await pool.execute(sql, [now, id]);
  }

  static async deletebyUserID(user_id){
    try{
      const sql = 'DELETE FROM users WHERE id = ?';
      var result = await pool.execute(sql, [user_id]);

      return JSON.stringify({
        sql_statement: commonService.replaceSqlPlaceholders(sql, [user_id]),
      });
    }
    catch (error){
      throw error;
    }
  }

  static async disableByUserID(user_id){
    try{
      const now = getCurrentUTCTimestamp();
      const sql = 'UPDATE users SET active = false, updated_at = ? WHERE id = ?';
      await pool.execute(sql, [now, user_id]);

      return JSON.stringify({
        sql_statement: commonService.replaceSqlPlaceholders(sql, [now, user_id]),
      });
    }
    catch (error){
      return error;
    }
  }

  static async queryUsersWithPagination(page = 1, pageSize, columns = ['*'], filters = {}) {
    const offset = (page - 1) * pageSize;
    try {
      // Validate and sanitize column names
      const validColumns = [
        'id', 'email', 'given_name', 'family_name', 'birthdate',
        'mandai_id', 'source', 'active', 'created_at', 'updated_at'
      ];

      // Ensure columns is an array
      let selectedColumns = Array.isArray(columns) ? columns : [columns];

      // Handle '*' case
      if (selectedColumns.includes('*') || selectedColumns[0] === '*') {
        selectedColumns = validColumns;
      } else {
        selectedColumns = selectedColumns.filter(col => validColumns.includes(col));
      }

      if (selectedColumns.length === 0) {
        throw new Error('No valid columns selected');
      }

      // Construct WHERE clause based on filters
      const whereConditions = [];
      const values = [];
      for (const [key, value] of Object.entries(filters)) {
        if (validColumns.includes(key)) {
          whereConditions.push(`${key} = ?`);
          values.push(value);
        }
      }
      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Construct the query
      const query = `
        SELECT ${selectedColumns.join(', ')}
        FROM users
        ${whereClause}
        ORDER BY id
        LIMIT ? OFFSET ?
      `;

      // Add LIMIT and OFFSET values
      values.push(pageSize + 1, offset);  // Fetch one extra to check for next page

      const rows = await pool.query(query, values);
      console.log(commonService.replaceSqlPlaceholders(query, values));

      const hasNextPage = rows.length > pageSize;
      const results = rows.slice(0, pageSize);  // Remove the extra item if it exists

      return {
        users: results,
        currentPage: page,
        nextPage: hasNextPage ? page + 1 : null,
        pageSize: pageSize,
        totalResults: results.length
      };
    } catch (error) {
      let logError = (new Error(`Error in userModel.queryUsersWithPagination: ${error}`));
      console.log(logError);
      return { error: logError };
    }
  }
}

module.exports = User;