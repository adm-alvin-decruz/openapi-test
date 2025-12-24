const pool = require('../../db/connections/mysqlConn');
const userModel = require('../../db/models/userModel');
const userConfig = require('../../config/usersConfig');
const { parseJsonColumn } = require('../../helpers/dbHelpers');

async function getUserFullInfoByEmail(req) {
  const email = req.body?.email;

  const query = `
    SELECT
      u.id AS user_id, u.email, u.given_name, u.family_name, u.birthdate,
      u.mandai_id, u.source, u.status, u.created_at AS user_created_at,
      u.updated_at AS user_updated_at,

      (SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', um.id,
          'user_id', um.user_id,
          'name', um.name,
          'visual_id', um.visual_id,
          'expires_at', um.expires_at,
          'created_at', um.created_at,
          'updated_at', um.updated_at
        )
      ) FROM user_memberships um WHERE um.user_id = u.id) AS memberships,

      (SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', un.id,
          'user_id', un.user_id,
          'name', un.name,
          'type', un.type,
          'subscribed', un.subscribe,
          'created_at', un.created_at,
          'updated_at', un.updated_at
        )
      ) FROM user_newsletters un WHERE un.user_id = u.id) AS newsletters,

      ud.id AS details_id, ud.phone_number, ud.zoneinfo, ud.address, ud.picture,
      ud.vehicle_iu, ud.vehicle_plate, ud.extra AS user_extra,
      ud.created_at AS details_created_at, ud.updated_at AS details_updated_at,

      uc.id AS credentials_id, uc.username, uc.tokens, uc.last_login,
      uc.created_at AS credentials_created_at, uc.updated_at AS credentials_updated_at
    FROM
      users u
    LEFT JOIN
      user_details ud ON u.id = ud.user_id
    LEFT JOIN
      user_credentials uc ON u.id = uc.user_id
    WHERE
      u.email = ?
  `;

  try {
    const results = await pool.query(query, [email]);

    if (results.length === 0) {
      return null; // User not found
    }

    const row = results[0];

    const memberships = parseJsonColumn(row.memberships);
    const newsletters = parseJsonColumn(row.newsletters);

    const response = {
      user: {
        id: row.user_id,
        email: row.email,
        given_name: row.given_name,
        family_name: row.family_name,
        birthdate: row.birthdate,
        mandai_id: row.mandai_id,
        source: row.source,
        status: row.status,
        created_at: row.user_created_at,
        updated_at: row.user_updated_at,
      },
      memberships,
      newsletters,
      details: row.details_id
        ? {
            id: row.details_id,
            user_id: row.user_id,
            phone_number: row.phone_number,
            zoneinfo: row.zoneinfo,
            address: row.address,
            picture: row.picture,
            vehicle_iu: row.vehicle_iu,
            vehicle_plate: row.vehicle_plate,
            extra: row.user_extra,
            created_at: row.details_created_at,
            updated_at: row.details_updated_at,
          }
        : {},
      credentials: row.credentials_id
        ? {
            id: row.credentials_id,
            user_id: row.user_id,
            username: row.username,
            tokens: row.tokens,
            last_login: row.last_login,
            created_at: row.credentials_created_at,
            updated_at: row.credentials_updated_at,
          }
        : {},
    };

    return response;
  } catch (error) {
    console.error('Error fetching user info:', error);
    throw error;
  }
}

async function getUserPageCustomField(req) {
  try {
    const data = req.method === 'POST' ? req.body : req.query;
    // Parse parameters
    const page = parseInt(data.page) || 1;
    const columns = parseColumns(data.columns);
    const filters = parseFilters(data.filters);

    const maxPageSize = userConfig.DEFAULT_PAGE_SIZE;
    let pageSize = parseInt(data.pageSize) || maxPageSize;
    pageSize = pageSize < maxPageSize ? pageSize : maxPageSize;

    const result = await userModel.queryUsersWithPagination(page, pageSize, columns, filters);

    return result;
  } catch (error) {
    let logError = new Error(`Error in suppportDBServices.getUserPageCustomField: ${error}`);
    console.log(logError);
    return { error: logError };
  }
}

function parseColumns(columns) {
  if (Array.isArray(columns)) {
    return columns;
  }
  if (typeof columns === 'string') {
    return columns.split(',').map((col) => col.trim());
  }
  return ['*'];
}

function parseFilters(filters) {
  if (typeof filters === 'string') {
    try {
      return JSON.parse(filters);
    } catch (error) {
      console.error('Error parsing filters:', error);
      return {};
    }
  }
  if (typeof filters === 'object' && filters !== null) {
    return filters;
  }
  return {};
}

async function findUserWithEmptyVisualID(req) {
  const maxLimit = 90;
  let limit = req.body.limit || maxLimit;
  if (req.body.limit > maxLimit) {
    limit = maxLimit;
  }

  const query = `
    SELECT u.id, u.email, u.given_name AS firstName, u.family_name AS lastName, DATE_FORMAT(u.birthdate,'%d/%m/%Y') AS dob,
      u.mandai_id AS mandaiID, u.source, um2.signup_sqs as migrations, UNIX_TIMESTAMP(um2.batch_no) AS batchNo,
      json_object('name', un.name, 'type', un.type, 'subscribe', un.subscribe) AS newsletter
    FROM users u
    LEFT JOIN user_memberships um ON u.id = um.user_id
    LEFT JOIN user_newsletters un ON u.id = un.user_id
    LEFT JOIN user_migrations um2 ON u.id = um2.user_id
    WHERE um.visual_id IS NULL OR um.visual_id = '' ORDER BY id LIMIT ${limit};
  `;

  try {
    const results = await pool.query(query);
    return results;
  } catch (error) {
    console.error('Error finding users with empty visual ID:', error);
    throw error;
  }
}

module.exports = {
  getUserFullInfoByEmail,
  getUserPageCustomField,
  findUserWithEmptyVisualID,
};
