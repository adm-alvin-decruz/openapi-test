

const pool = require('../../db/connections/mysqlConn');
const userModel = require('../../db/models/userModel');
const userMembershipModel = require('../../db/models/userMembershipModel');
const userNewsletterModel = require('../../db/models/userNewletterModel');
const userCredentialModel = require('../../db/models/userCredentialModel');
const userDetailModel = require('../../db/models/userDetailsModel');
const userConfig = require('../../config/usersConfig');
const { getCurrentUTCTimestamp, convertDateToMySQLFormat } = require('../../utils/dateUtils');

async function getUserFullInfoByEmail(email) {
  const query = `
    SELECT
      u.id AS user_id, u.email, u.given_name, u.family_name, u.birthdate,
      u.mandai_id, u.source, u.active, u.created_at AS user_created_at,
      u.updated_at AS user_updated_at,

      um.id AS membership_id, um.name AS membership_name, um.visual_id AS membership_visual_id,
      um.expires_at AS membership_expires_at, um.created_at AS membership_created_at,
      um.updated_at AS membership_updated_at,

      un.id AS newsletter_id, un.name AS newsletter_name, un.type AS newsletter_type,
      un.subscribe AS newsletter_subscribed, un.created_at AS newsletter_created_at,
      un.updated_at AS newsletter_updated_at,

      ud.id AS details_id, ud.phone_number, ud.zoneinfo, ud.address, ud.picture,
      ud.vehicle_iu, ud.vehicle_plate, ud.extra AS user_extra,
      ud.created_at AS details_created_at, ud.updated_at AS details_updated_at,

      uc.id AS credentials_id, uc.username, uc.tokens, uc.last_login,
      uc.created_at AS credentials_created_at, uc.updated_at AS credentials_updated_at
    FROM
      users u
    LEFT JOIN
      user_memberships um ON u.id = um.user_id
    LEFT JOIN
      user_newsletters un ON u.id = un.user_id
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

    // Initialize the response object
    const response = {
      user: {},
      memberships: [],
      newsletters: [],
      details: {},
      credentials: {}
    };

    // Process the results
    results.forEach(row => {
      // User info (only need to do this once)
      if (Object.keys(response.user).length === 0) {
        response.user = {
          id: row.user_id,
          email: row.email,
          given_name: row.given_name,
          family_name: row.family_name,
          birthdate: row.birthdate,
          mandai_id: row.mandai_id,
          source: row.source,
          active: row.active,
          created_at: row.user_created_at,
          updated_at: row.user_updated_at
        };
      }

      // Memberships (can be multiple)
      if (row.membership_id) {
        response.memberships.push({
          id: row.membership_id,
          name: row.membership_name,
          visual_id: row.membership_visual_id,
          expires_at: row.membership_expires_at,
          created_at: row.membership_created_at,
          updated_at: row.membership_updated_at
        });
      }

      // Newsletters (can be multiple)
      if (row.newsletter_id) {
        response.newsletters.push({
          id: row.newsletter_id,
          name: row.newsletter_name,
          type: row.newsletter_type,
          subscribed: row.newsletter_subscribed,
          created_at: row.newsletter_created_at,
          updated_at: row.newsletter_updated_at
        });
      }

      // User details (only need to do this once)
      if (Object.keys(response.details).length === 0 && row.details_id) {
        response.details = {
          id: row.details_id,
          phone_number: row.phone_number,
          zoneinfo: row.zoneinfo,
          address: row.address,
          picture: row.picture,
          vehicle_iu: row.vehicle_iu,
          vehicle_plate: row.vehicle_plate,
          extra: row.user_extra,
          created_at: row.details_created_at,
          updated_at: row.details_updated_at
        };
      }

      // User credentials (only need to do this once)
      if (Object.keys(response.credentials).length === 0 && row.credentials_id) {
        response.credentials = {
          id: row.credentials_id,
          username: row.username,
          tokens: row.tokens,
          last_login: row.last_login,
          created_at: row.credentials_created_at,
          updated_at: row.credentials_updated_at
        };
      }
    });

    console.log(response);
    return response;
  } catch (error) {
    console.error('Error fetching user info:', error);
    throw error;
  }
}

module.exports = {
  getUserFullInfoByEmail
}