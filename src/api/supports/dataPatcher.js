const awsRegion = () => {
  const env = process.env.AWS_REGION_NAME;
  if (!env) return 'ap-southeast-1';
  if (env === 'false') return 'ap-southeast-1';
  return env;
};

const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  ListUsersCommand,
  UserNotFoundException,
} = require('@aws-sdk/client-cognito-identity-provider');

const db = require('../../db/connections/mysqlConn');
const commonService = require('../../services/commonService');

class DataPatcher {
  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({ region: awsRegion });
  }

  async patchData(input) {
    const {
      patchFrom,
      patchFromQueryConditions,
      patchTo,
      patchFieldsFrom,
      patchFieldsTo,
      patchToQueryConditions,
    } = input;

    // Validate input parameters
    this.validateQueryConditions(patchFromQueryConditions);
    this.validateQueryConditions(patchToQueryConditions);
    this.validateFieldArrays(patchFieldsFrom, patchFieldsTo);

    let patchToRecords;
    let patchTarget = patchTo;
    try {
      if (patchTarget === 'DB') {
        const { sql, params } = this.buildSelectQuery(patchToQueryConditions);
        patchToRecords = await this.queryDB(sql, params);
      } else if (patchTarget === 'Cognito') {
        patchToRecords = await this.queryCognito(patchToQueryConditions);
      } else {
        throw new Error('Invalid patchTo source');
      }

      if (!patchToRecords || patchToRecords.length === 0) {
        console.log(`No records found in ${patchTarget} to patch. Skipping.`);
        return;
      }
    } catch (error) {
      console.error('Error querying patch target: %s', patchTarget, error);
      return;
    }

    for (const record of patchToRecords) {
      const email = record.email;
      let patchFromData;

      try {
        if (patchFrom === 'DB') {
          const conditions = { ...patchFromQueryConditions, email };
          const { sql, params } = this.buildSelectQuery(conditions);
          patchFromData = await this.queryDB(sql, params);
        } else if (patchFrom === 'Cognito') {
          patchFromData = await this.queryCognito({ ...patchFromQueryConditions, Username: email });
        } else {
          throw new Error('Invalid patchFrom source');
        }

        if (!patchFromData || (Array.isArray(patchFromData) && patchFromData.length === 0)) {
          console.log(`No data found in ${patchFrom} for email: ${email}. Skipping this record.`);
          continue;
        }

        const updateData = this.prepareUpdateData(patchFromData, patchFieldsFrom, patchFieldsTo);

        if (patchTo === 'DB') {
          const { sql, params } = this.buildUpdateQuery(updateData, email);
          await this.executeDB(sql, params);
        } else if (patchTo === 'Cognito') {
          await this.updateCognito(updateData, email);
        }

        console.log('Patch operation successful:', {
          email,
          source: patchFrom,
          destination: patchTo,
          updatedFields: Object.keys(updateData),
        });
        return email;
      } catch (error) {
        console.error(`Error processing record for email ${email}:`, error);
        continue;
      }
    }
  }

  validateQueryConditions(conditions) {
    if (!conditions || typeof conditions !== 'object') {
      throw new Error('Query conditions must be an object');
    }

    if (conditions.table) {
      // Validate table name - only allow alphanumeric and underscore
      if (!/^[a-zA-Z0-9_]+$/.test(conditions.table)) {
        throw new Error('Invalid table name format');
      }
    }

    // Validate condition values
    Object.values(conditions).forEach((value) => {
      if (value === undefined || value === null) {
        throw new Error('Query conditions cannot contain null or undefined values');
      }
    });
  }

  validateFieldArrays(fromFields, toFields) {
    if (!Array.isArray(fromFields) || !Array.isArray(toFields)) {
      throw new Error('Field mappings must be arrays');
    }
    if (fromFields.length !== toFields.length) {
      throw new Error('Field mapping arrays must have the same length');
    }
    if (fromFields.length === 0) {
      throw new Error('Field mapping arrays cannot be empty');
    }
  }

  buildSelectQuery(conditions) {
    const { table, ...whereConditions } = conditions;
    const whereClause = [];
    const params = [];

    for (const [key, value] of Object.entries(whereConditions)) {
      whereClause.push(`${key} = ?`);
      params.push(value);
    }

    const sql = `SELECT * FROM ${table} WHERE ${whereClause.join(' AND ')}`;
    return { sql, params };
  }

  buildUpdateQuery(updateData, email) {
    const setClause = [];
    const params = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (key === 'birthdate' && value) {
        // Parse the date and format it correctly for MySQL
        const parsedDate = commonService.convertDateHyphenFormat(value);
        setClause.push(`${key} = ?`);
        params.push(parsedDate);
      } else {
        setClause.push(`${key} = ?`);
        params.push(value);
      }
    }

    params.push(email); // Add email parameter for WHERE clause
    const sql = `UPDATE users SET ${setClause.join(', ')} WHERE email = ?`;

    return { sql, params };
  }

  async queryDB(sql, params) {
    const results = await db.query(sql, params);
    if (results.length === 0) {
      throw new Error('No user found in DB');
    }
    return results;
  }

  async executeDB(sql, params) {
    return await db.execute(sql, params);
  }

  async queryCognito(conditions) {
    if (conditions.Username) {
      const params = {
        UserPoolId: process.env.USER_POOL_ID,
        Username: conditions.Username,
      };
      try {
        const command = new AdminGetUserCommand(params);
        const response = await this.cognitoClient.send(command);
        return [this.formatCognitoUser(response)];
      } catch (error) {
        if (error instanceof UserNotFoundException) {
          throw new Error('No user found in Cognito');
        }
        throw error;
      }
    } else {
      const params = {
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Filter: Object.entries(conditions)
          .filter(([key]) => key !== 'table') // Exclude table property from Cognito filter
          .map(([key, value]) => `${key} = "${value}"`)
          .join(' and '),
      };
      const command = new ListUsersCommand(params);
      const response = await this.cognitoClient.send(command);
      if (response.Users.length === 0) {
        throw new Error('No users found in Cognito');
      }
      return response.Users.map(this.formatCognitoUser);
    }
  }

  formatCognitoUser(user) {
    const attributes = {};
    user.UserAttributes.forEach((attr) => {
      attributes[attr.Name] = attr.Value;
    });
    return { ...user, ...attributes };
  }

  prepareUpdateData(patchFromData, patchFieldsFrom, patchFieldsTo) {
    const updateData = {};
    const sourceData = Array.isArray(patchFromData) ? patchFromData[0] : patchFromData;
    patchFieldsFrom.forEach((field, index) => {
      if (sourceData[field] !== undefined) {
        updateData[patchFieldsTo[index]] = sourceData[field];
      }
    });
    return updateData;
  }

  async updateCognito(updateData, email) {
    const params = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      UserAttributes: Object.entries(updateData)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([Name, Value]) => ({
          Name,
          Value: Value.toString(),
        })),
    };

    const command = new AdminUpdateUserAttributesCommand(params);
    await this.cognitoClient.send(command);
  }
}

module.exports = DataPatcher;
