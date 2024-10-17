const awsRegion = () => {
  const env = process.env.AWS_REGION_NAME;
  if (!env) return 'ap-southeast-1';
  if (env === "false") return 'ap-southeast-1';
  return env;
}

const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  ListUsersCommand
} = require("@aws-sdk/client-cognito-identity-provider");

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
      limit = Infinity  // Default to no limit if not specified
    } = input;

    let patchToRecords;
    try {
    if (patchTo === 'DB') {
      patchToRecords = await this.queryDB(patchToQueryConditions, limit);
    } else if (patchTo === 'Cognito') {
      patchToRecords = await this.queryCognito(patchToQueryConditions, limit);
    } else {
      throw new Error('Invalid patchTo source');
    }
    } catch (error) {
      console.log(`No records found in ${patchTo} to patch. Skipping.`);
      return;
    }
    const affectedEmails = [];

    for (const record of patchToRecords) {
      const email = record.email || record.Username;
      let patchFromData;

      try {
      if (patchFrom === 'DB') {
        patchFromData = await this.queryDB({ ...patchFromQueryConditions, email });
      } else if (patchFrom === 'Cognito') {
        patchFromData = await this.queryCognito({ Username: email });
      } else {
        throw new Error('Invalid patchFrom source');
      }

        if (!patchFromData || (Array.isArray(patchFromData) && patchFromData.length === 0)) {
          console.log(`No data found in ${patchFrom} for email: ${email}. Skipping this record.`);
          continue;
        }

      const updateData = this.prepareUpdateData(patchFromData[0], patchFieldsFrom, patchFieldsTo);

      if (patchTo === 'DB') {
        await this.updateDB(updateData, email);
      } else if (patchTo === 'Cognito') {
        await this.updateCognito(updateData, email);
      }

      affectedEmails.push(email);

      console.log('Patch operation:', {
        patchDataFrom: patchFromData[0],
        patchDataTo: record,
        updatedData: updateData
        });
      } catch (error) {
        console.error(`Error processing record for email ${email}:`, error);
        continue;
      }
    }
    return affectedEmails;
  }

  async queryDB(conditions, limit) {
    const { table, ...whereConditions } = conditions;
    const whereClause = Object.entries(whereConditions)
      .map(([key, value]) => `${key} = ?`)
      .join(' AND ');

    const sql = `SELECT * FROM ${table} WHERE ${whereClause} LIMIT ?`;
    const params = [...Object.values(whereConditions), limit];

    const results = await db.query(sql, params);
    if (results.length === 0) {
      throw new Error('No user found in DB');
    }
    return results;
  }

  async queryCognito(conditions, limit) {
    if (conditions.Username) {
      const params = {
        UserPoolId: process.env.USER_POOL_ID,
        Username: conditions.Username
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
        UserPoolId: process.env.USER_POOL_ID,
        Filter: Object.entries(conditions)
          .map(([key, value]) => `${key} = "${value}"`)
          .join(' and ')
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
    const userAttributes = user.UserAttributes || user.Attributes;

    if (userAttributes && Array.isArray(userAttributes)) {
      userAttributes.forEach(attr => {
        attributes[attr.Name] = attr.Value;
      });
    }

    return {
      ...user,
      ...attributes,
      Username: user.Username || attributes.email || attributes.sub
    };
  }

  prepareUpdateData(patchFromData, patchFieldsFrom, patchFieldsTo) {
    const updateData = {};
    patchFieldsFrom.forEach((field, index) => {
      updateData[patchFieldsTo[index]] = patchFromData[field];
    });
    return updateData;
  }

  async updateDB(updateData, email) {
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

    const sql = `UPDATE users SET ${setClause.join(', ')} WHERE email = ?`;
    params.push(email);

    return await db.execute(sql, params);
  }


  async updateCognito(updateData, email) {
    const params = {
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
      UserAttributes: Object.entries(updateData).map(([Name, Value]) => ({ Name, Value: Value?.toString() ?? '' }))
    };

    const command = new AdminUpdateUserAttributesCommand(params);
    await this.cognitoClient.send(command);
  }
}

module.exports = DataPatcher;