project = "ciam-membership"
env = "dev"
layers = ["arn:aws:lambda:ap-southeast-1:451483290750:layer:NewRelicNodeJS20X:25"]
NEW_RELIC_ACCOUNT_ID = "4510480"
NEW_RELIC_USE_ESM = "true"
newrelic_handler = "newrelic-lambda-wrapper.handler"

AEM_PATH_RESEND_WILDPASS = "/bin/wrs/wildpass/wildpassresendecard"
AEM_PATH_WILDPASS_CHECK_EMAIL = "/bin/wrs/wildpass/checkemail"
AEM_URL = "https://uat-www.mandai.com"
AEM_WILDPASS_EMAILCHECK_ROUTE = "true"
AEM_APP_ID = "aemDev.com.mandaiapi.ciam"
APP_LOG_SWITCH = "true"

MEMBERSHIPS_API_RESPONSE_CONFIG = {"MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS":{"mwgCode":"MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS","code":200,"message":"Get memberships success.","status":"success"},"MWG_CIAM_USERS_MEMBERSHIPS_NULL":{"mwgCode":"MWG_CIAM_USERS_MEMBERSHIPS_NULL","code":200,"message":"No record found.","status":"failed"},"MWG_CIAM_PARAMS_ERR":{"mwgCode":"MWG_CIAM_PARAMS_ERR","code":400,"message":"Wrong parameters.","status":"failed"},"MWG_CIAM_501_ERR":{"mwgCode":"MWG_CIAM_501_ERR","code":501,"message":"Not implemented.","status":"failed"},"MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR":{"mwgCode":"MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR","code":200,"message":"Requested email is invalid or empty.","status":"failed"}}

#source mapping
SOURCE_MAPPING = {"aemDev.com.mandaiapi.ciam":"ORGANIC"}

#users wildpass source - cognito mapping
WILDPASS_SOURCE_COGNITO_MAPPING = {"given_name":"firstName","family_name":"lastName","birthdate":"dob","custom:newsletter":"newsletter"}

#validation
SIGNUP_VALIDATE_PARAMS = {"email":{"invalid":"The %s is invalid.","exist":"This address is already being used for a Mandai %s Account."},"firstName":{"invalid":"The %s is invalid."},"lastName":{"invalid":"The %s is invalid."},"dob":{"invalid":"The %s is invalid.","range_error":"The dob must between 13 and 99 years old."},"group":{"invalid":"The %s is invalid."},"newsletter":{"invalid":"The %s is invalid.","subscribe_error":"Must agree and subscribe to the newsletter."}}
RESEND_VALIDATE_PARAMS = {"email":{"invalid":"The %s is invalid.","exist":"This address is already being used for a Mandai %s Account."},"group":{"invalid":"The %s is invalid."}}

#users
USER_POOL_ID = "ap-southeast-1_7KXtK9lOe"
USER_POOL_CLIENT_ID = "36kv68nfvaotpbgia2kdv5ddsj"
USERS_SIGNUP_API_RESPONSE_CONFIG = {"MWG_CIAM_USER_SIGNUP_SUCCESS":{"code":200,"message":"New user signup successfully.","status":"success"},"MWG_CIAM_USER_SIGNUP_ERR":{"mwgCode":"MWG_CIAM_USER_SIGNUP_ERR","code":200,"message":"New user signup error.","status":"failed"},"MWG_CIAM_PARAMS_ERR":{"mwgCode":"MWG_CIAM_PARAMS_ERR","code":400,"message":"Wrong parameters.","status":"failed"},"MWG_CIAM_501_ERR":{"mwgCode":"MWG_CIAM_501_ERR","code":501,"message":"Not implemented.","status":"failed"}}
USERS_UPDATE_API_RESPONSE_CONFIG = {"MWG_CIAM_USER_UPDATE_SUCCESS":{"code":200,"message":"User info updated successfully.","status":"success"},"MWG_CIAM_USER_UPDATE_ERR":{"code":200,"message":"User info update error.","status":"failed"},"MWG_CIAM_PARAMS_ERR":{"code":400,"message":"Wrong parameters.","status":"failed"},"MWG_CIAM_501_ERR":{"mwgCode":"MWG_CIAM_501_ERR","code":501,"message":"Not implemented.","status":"failed"}}
RESEND_MEMBERSHIP_API_RESPONSE_CONFIG = {"MWG_CIAM_RESEND_MEMBERSHIP_SUCCESS":{"code":200,"message":"Resend %s membership success.","status":"success"},"MWG_CIAM_RESEND_MEMBERSHIPS_ERR":{"code":200,"message":"Resend %s membership failed.","status":"failed"},"MWG_CIAM_PARAMS_ERR":{"code":400,"message":"Wrong parameters.","status":"failed"},"MWG_CIAM_USERS_MEMBERSHIP_NULL":{"code":200,"message":"No record found","status":"failed"}}
DELETE_MEMBERSHIP_API_RESPONSE_CONFIG = {"MWG_CIAM_USER_DELETE_SUCCESS":{"code":200,"message":"Delete membership success.","status":"success"},"MWG_CIAM_USER_DELETE_ERR":{"code":200,"message":"Delete membership failed.","status":"failed"}}

#Galaxy
GALAXY_URL_IMPORT_PASS = "http://uat-int-eglx1.wrs.com.sg:3051"
GALAXY_URL_UPDATE_PASS = "http://uat-int-eglx1.wrs.com.sg:3051"


