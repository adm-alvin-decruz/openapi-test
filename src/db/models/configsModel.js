const pool = require('../connections/mysqlConn');
const loggerService = require('../../logs/logger');
const commonService = require('../../services/commonService');
const { getCurrentUTCTimestamp } = require('../../utils/dateUtils');

class Configs {
  static async findByConfigKey(config, key) {
    const params = [config, key];
    const sql = 'SELECT * FROM configs WHERE config = ? AND `key` = ?';
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (error) {
      loggerService.error(
        {
          configModel: {
            config,
            key,
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        '[CIAM-MAIN] ConfigsModel.findByConfigKey - Failed',
      );
    }
  }

  static async findAll() {
    const sql = 'SELECT * FROM configs';

    try {
      return await pool.query(sql);
    } catch (error) {
      loggerService.error(
        {
          configModel: {
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql),
          },
        },
        {},
        '[CIAM-MAIN] ConfigsModel.findAll - Failed',
      );
      throw new Error(`Error reading all configs: ${error}`);
    }
  }

  static async findByConfig(config) {
    const sql = 'SELECT * FROM configs where config = ?';

    try {
      return await pool.query(sql, [config]);
    } catch (error) {
      loggerService.error(
        {
          configModel: {
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, [config]),
          },
        },
        {},
        '[CIAM-MAIN] ConfigsModel.findByConfig - Failed',
      );
      throw new Error(`Error reading all configs: ${error}`);
    }
  }

  static async delete(id) {
    const sql = 'DELETE FROM configs WHERE id = ?';

    try {
      await pool.execute(sql, [id]);
      return {
        message: 'delete config successfully!',
      };
    } catch (error) {
      loggerService.error(
        {
          configModel: {
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, [id]),
          },
        },
        {},
        '[CIAM-MAIN] ConfigsModel.delete - Failed',
      );
      throw new Error(`Error delete configs: ${error}`);
    }
  }

  static async create(data) {
    const sql =
      'INSERT INTO configs (config, `key`, value, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())';
    const params = [data.config, data.key, data.value];

    try {
      await pool.execute(sql, params);
      return {
        message: 'create config successfully!',
      };
    } catch (error) {
      loggerService.error(
        {
          configModel: {
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, JSON.stringify(params)),
          },
        },
        {},
        '[CIAM-MAIN] ConfigsModel.create - Failed',
      );
      throw new Error(`Error create configs: ${error}`);
    }
  }

  static async update(id, data) {
    const now = getCurrentUTCTimestamp();

    // Filter out undefined values and create SET clauses
    const updateFields = Object.entries(data)
      .filter(([_key, value]) => value !== undefined)
      .map(([key, _value]) => `${key} = ?`);

    // Add updated_at to the SET clauses
    updateFields.push('updated_at = ?');

    // Construct the SQL query
    const sql = `
      UPDATE configs
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    // Prepare the params array
    const params = [...Object.values(data).filter((value) => value !== undefined), now, id];

    try {
      await pool.execute(sql, params);
      return {
        message: 'update config successfully!',
      };
    } catch (error) {
      loggerService.error(
        {
          configModel: {
            error: new Error(error),
            sql_statement: commonService.replaceSqlPlaceholders(sql, params),
          },
        },
        {},
        '[CIAM-MAIN] ConfigsModel.update - Failed',
      );
      throw new Error(`Error update configs: ${error}`);
    }
  }

  static async getValueByConfigValueName(config, key, valueName) {
    try {
      const cfg = await this.findByConfigKey(config, key);

      if (!cfg || cfg.length === 0) {
        throw new Error(`Config not found: ${config}/${key}`);
      }

      const value = cfg[0].value;
      if (!(valueName in value)) {
        throw new Error(`Value name '${valueName}' not found in config ${config}/${key}`);
      }

      return value[valueName];
    } catch (err) {
      loggerService.error(
        {
          configModel: {
            config,
            key,
            valueName,
            error: new Error(err),
          },
        },
        {},
        '[CIAM] ConfigsModel.getValueByConfigValueName - Failed',
      );
      throw err;
    }
  }
}

module.exports = Configs;
