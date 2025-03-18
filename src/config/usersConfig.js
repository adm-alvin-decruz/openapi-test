const resConfig = {
  // source mapping
  SOURCE_MAPPING:'{"aemDev.com.mandaiapi.ciam":"ORGANIC","aemUat.com.mandaiapi.ciam":"ORGANIC","aemProd.com.mandaiapi.ciam":"ORGANIC","gltDev.com.mandaiapi.ciam":"GLOBALTIX","gltUat.com.mandaiapi.ciam":"GLOBALTIX","gltProd.com.mandaiapi.ciam":"GLOBALTIX","tktDev.com.mandaiapi.ciam":"TICKETING","tktUat.com.mandaiapi.ciam":"TICKETING","tktProd.com.mandaiapi.ciam":"TICKETING"}',

  // users wildpass source - cognito mapping
  WILDPASS_SOURCE_COGNITO_MAPPING:'{"given_name":"firstName","family_name":"lastName","birthdate":"dob","custom:newsletter":"newsletter"}',

  // validation
  SIGNUP_VALIDATE_PARAMS:'{"email":{"invalid":"The %s is invalid.","exist":"This address is already being used for a Mandai %s Account."},"firstName":{"invalid":"The %s is invalid."},"lastName":{"invalid":"The %s is invalid."},"dob":{"invalid":"The %s is invalid.","range_error":"The dob must between 13 and 99 years old."},"group":{"invalid":"The %s is invalid."},"newsletter":{"invalid":"The %s is invalid.","subscribe_error":"Must agree and subscribe to the newsletter."}}',
  RESEND_VALIDATE_PARAMS:'{"email":{"invalid":"The %s is invalid.","exist":"This address is already being used for a Mandai %s Account."},"group":{"invalid":"The %s is invalid."}}',
  UPDATE_WP_VALIDATE_PARAMS:'{"email":{"invalid":"The %s is invalid.","not_exist":"This email address does not have a Mandai Account."},"dob":{"range_error":"The dob must between 13 and 99 years old."},"group":{"invalid":"The %s is invalid."}}',

  GET_USER_VALIDATE_PARAMS:'{"email":{"invalid":"The %s is invalid."},"group":{"invalid":"The %s is invalid."}}',

  // users
  USERS_SIGNUP_API_RESPONSE_CONFIG:'{"MWG_CIAM_USER_SIGNUP_SUCCESS":{"mwgCode":"MWG_CIAM_USER_SIGNUP_SUCCESS","code":200,"message":"New user signup successfully.","status":"success"},"MWG_CIAM_USER_SIGNUP_ERR":{"mwgCode":"MWG_CIAM_USER_SIGNUP_ACCOUNT_EXIST_ERR","code":200,"message":"New user signup error.","status":"failed"},"MWG_CIAM_PARAMS_ERR":{"mwgCode":"MWG_CIAM_PARAMS_ERR","code":400,"message":"Wrong parameters.","status":"failed"},"MWG_CIAM_501_ERR":{"mwgCode":"MWG_CIAM_501_ERR","code":501,"message":"Not implemented.","status":"failed"}}',
  USERS_UPDATE_API_RESPONSE_CONFIG:'{"MWG_CIAM_USER_UPDATE_SUCCESS":{"mwgCode":"MWG_CIAM_USER_UPDATE_SUCCESS","code":200,"message":"User info updated successfully.","status":"success"},"MWG_CIAM_USER_UPDATE_ERR":{"mwgCode":"MWG_CIAM_USER_UPDATE_ERR","code":200,"message":"User info update error.","status":"failed"},"MWG_CIAM_PARAMS_ERR":{"mwgCode":"MWG_CIAM_PARAMS_ERR","code":400,"message":"Wrong parameters.","status":"failed"},"MWG_CIAM_501_ERR":{"mwgCode":"MWG_CIAM_501_ERR","code":501,"message":"Not implemented.","status":"failed"}}',
  RESEND_MEMBERSHIP_API_RESPONSE_CONFIG:'{"MWG_CIAM_RESEND_MEMBERSHIP_SUCCESS":{"mwgCode":"MWG_CIAM_RESEND_MEMBERSHIP_SUCCESS","code":200,"message":"Resend %s membership success.","status":"success"},"MWG_CIAM_RESEND_MEMBERSHIPS_ERR":{"mwgCode":"MWG_CIAM_RESEND_MEMBERSHIPS_ERR","code":200,"message":"Resend %s membership failed.","status":"failed"},"MWG_CIAM_PARAMS_ERR":{"mwgCode":"MWG_CIAM_PARAMS_ERR","code":400,"message":"Wrong parameters.","status":"failed"},"MWG_CIAM_USERS_MEMBERSHIP_NULL":{"mwgCode":"MWG_CIAM_USERS_MEMBERSHIP_NULL","code":200,"message":"No record found","status":"failed"}}',
  DELETE_MEMBERSHIP_API_RESPONSE_CONFIG:'{"MWG_CIAM_USER_DELETE_SUCCESS":{"mwgCode":"MWG_CIAM_USER_DELETE_SUCCESS","code":200,"message":"Delete membership success.","status":"success"},"MWG_CIAM_USER_DELETE_ERR":{"mwgCode":"MWG_CIAM_USER_DELETE_ERR","code":200,"message":"Delete membership failed.","status":"failed"}}',
  GET_USER_MEMBERSHIPS_API_RESPONSE_CONFIG:'{"MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS":{"mwgCode":"MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS","code":200,"message":"Get memberships success.","status":"success"},"MWG_CIAM_USERS_MEMBERSHIPS_NULL":{"mwgCode":"MWG_CIAM_USERS_MEMBERSHIPS_NULL","code":200,"message":"No record found.","status":"failed"},"MWG_CIAM_USERS_MEMBERSHIPS_GET_ERROR":{"mwgCode":"MWG_CIAM_USERS_MEMBERSHIPS_GET_ERROR","code":200,"message":"Get membership error","status":"failed"},"MWG_CIAM_PARAMS_ERR":{"mwgCode":"MWG_CIAM_PARAMS_ERR","code":400,"message":"Wrong parameters.","status":"failed"},"MWG_CIAM_501_ERR":{"mwgCode":"MWG_CIAM_501_ERR","code":501,"message":"Not implemented.","status":"failed"},"MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR":{"mwgCode":"MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR","code":200,"message":"Requested email is invalid or empty.","status":"failed"}}',

  GET_USER_API_RESPONSE_MAPPING_WILDPASS_PASSKIT: '{"email":"email","firstName":"given_name","lastName":"family_name","mandaiId":"mandai_id","visualId":"visual_id","dateOfBirth":"birthdate","postalCode":""}',

  // user model fields for prepare DB update data
  DB_USERS_MODEL_MAPPING: '{"given_name":"","family_name":"","birthdate":""}',
  DB_USER_NEWSLETTER_MAPPING: '{"name":"","type":"","subscribe":""}',

  // update parameters that can trigger Galaxy update:
  TRIGGER_GALAXY_UPDATE_PARAMS_WILDPASS:'["given_name","family_name","birthdate","custom:newsletter"]',

  // db page size limit
  DEFAULT_PAGE_SIZE: 250
};

module.exports = resConfig;