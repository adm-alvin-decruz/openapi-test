#data "aws_s3_bucket" "billing" {
#  bucket = var.s3_bucket
#}

#data "aws_s3_object" "billing" {
#  bucket = data.aws_s3_bucket.billing.id
#  key    = var.s3_key
#}

module "lambda_function_ciam_membership" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "${var.project}-${var.env}-lambda"
  description   = "${var.project} ${var.env} lambda"
  handler       = var.newrelic_handler
  runtime       = "nodejs20.x"
  timeout       = 30
  create_package      = false
  local_existing_package = "files/app.zip"
  ignore_source_code_hash = false
  cloudwatch_logs_retention_in_days = var.cloudwatch_logs_retention_in_days
#  s3_existing_package = {
#    bucket         = data.aws_s3_object.billing.bucket
#    key            = data.aws_s3_object.billing.key
#  }
  environment_variables = {
    LAMBDA_CIAM_SIGNUP_TRIGGER_MAIL_FUNCTION = data.terraform_remote_state.email_trigger_function.outputs.lambda_name
    LAMBDA_CIAM_SIGNUP_CREATE_WILDPASS_FUNCTION = data.terraform_remote_state.card_face_generator_function.outputs.lambda_name
    APP_ENV = var.env
    APP_LOG_SWITCH = var.APP_LOG_SWITCH
    USER_POOL_ID = var.USER_POOL_ID
    USER_POOL_CLIENT_ID = var.USER_POOL_CLIENT_ID
    USER_POOL_CLIENT_SECRET = var.USER_POOL_CLIENT_SECRET
    SOURCE_MAPPING = jsonencode(var.SOURCE_MAPPING)
    WILDPASS_SOURCE_COGNITO_MAPPING = jsonencode(var.WILDPASS_SOURCE_COGNITO_MAPPING)
    SIGNUP_VALIDATE_PARAMS = jsonencode(var.SIGNUP_VALIDATE_PARAMS)
    RESEND_VALIDATE_PARAMS = jsonencode(var.RESEND_VALIDATE_PARAMS)
    USERS_SIGNUP_API_RESPONSE_CONFIG = jsonencode(var.USERS_SIGNUP_API_RESPONSE_CONFIG)
    USERS_UPDATE_API_RESPONSE_CONFIG = jsonencode(var.USERS_UPDATE_API_RESPONSE_CONFIG)
    RESEND_MEMBERSHIP_API_RESPONSE_CONFIG = jsonencode(var.RESEND_MEMBERSHIP_API_RESPONSE_CONFIG)
    DELETE_MEMBERSHIP_API_RESPONSE_CONFIG = jsonencode(var.DELETE_MEMBERSHIP_API_RESPONSE_CONFIG)
    GALAXY_URL_IMPORT_PASS = var.GALAXY_URL_IMPORT_PASS
    GALAXY_URL_UPDATE_PASS = var.GALAXY_URL_UPDATE_PASS
    MEMBERSHIPS_API_RESPONSE_CONFIG = jsonencode(var.MEMBERSHIPS_API_RESPONSE_CONFIG)
    NEW_RELIC_LAMBDA_EXTENSION_ENABLED = "true"
    AEM_WILDPASS_EMAILCHECK_ROUTE = var.AEM_WILDPASS_EMAILCHECK_ROUTE
    AEM_URL = var.AEM_URL
    AEM_PATH_WILDPASS_CHECK_EMAIL = var.AEM_PATH_WILDPASS_CHECK_EMAIL
    AEM_PATH_RESEND_WILDPASS = var.AEM_PATH_RESEND_WILDPASS
    AEM_APP_ID = var.AEM_APP_ID
    NEW_RELIC_ACCOUNT_ID = var.NEW_RELIC_ACCOUNT_ID
    NEW_RELIC_LAMBDA_HANDLER = var.handler
    NEW_RELIC_USE_ESM = var.NEW_RELIC_USE_ESM
    NEW_RELIC_LICENSE_KEY_SECRET = var.NEW_RELIC_LICENSE_KEY_SECRET
  }
#  allowed_triggers = {
#    apigateway = {
#      service  = "apigateway"
#      source_arn = aws_cloudwatch_event_rule.schedule.arn
#    }
#  }
  create_current_version_allowed_triggers = false
  lambda_role = aws_iam_role.lambda.arn
  create_role = false
  layers = var.layers

### VPC ####
  vpc_subnet_ids         = data.terraform_remote_state.network.outputs.private_subnets
  vpc_security_group_ids = [aws_security_group.lambda.id]
  attach_network_policy = true
}

