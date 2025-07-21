project = "ciam-membership"
env = "dev"
memory_size = 1024
layers = ["arn:aws:lambda:ap-southeast-1:451483290750:layer:NewRelicNodeJS20X:25"]
NEW_RELIC_ACCOUNT_ID = "4510480"
NEW_RELIC_USE_ESM = "true"
newrelic_handler = "newrelic-lambda-wrapper.handler"

AEM_PATH_RESEND_WILDPASS = "/bin/wrs/wildpass/wildpassresendecard"
AEM_PATH_WILDPASS_CHECK_EMAIL = "/bin/wrs/wildpass/checkemail"
AEM_URL = "https://uat-www.mandai.com"
AEM_WILDPASS_EMAILCHECK_ROUTE = "false"
APP_LOG_SWITCH = "true"

#users
USER_POOL_ID = "ap-southeast-1_7KXtK9lOe"
USER_POOL_CLIENT_ID = "36kv68nfvaotpbgia2kdv5ddsj"

#Galaxy
GALAXY_URL = "https://uat-connect.mandaiapi.com"

#API Keys
PASSKIT_API_KEY = ""
EMAIL_SERVICE_API_KEY = ""
AEM_REQ_API_KEY = ""
NOPCOMMERCE_REQ_API_KEY = ""
NOPCOMMERCE_REQ_PRIVATE_API_KEY = ""
MFA_MOBILE_REQ_PUBLIC_API_KEY = ""
CIAMSP_REQ_PRIVATE_API_KEY = ""