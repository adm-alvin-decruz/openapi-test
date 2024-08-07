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
    APP_ENV = var.env
    APP_LOG_SWITCH = var.APP_LOG_SWITCH
    USER_POOL_ID = var.USER_POOL_ID
    MEMBERSHIPS_API_RESPONSE_CONFIG = jsonencode(var.MEMBERSHIPS_API_RESPONSE_CONFIG)
    NEW_RELIC_LAMBDA_EXTENSION_ENABLED = "true"
    AEM_WILDPASS_EMAILCHECK_ROUTE = var.AEM_WILDPASS_EMAILCHECK_ROUTE
    AEM_URL = var.AEM_URL
    AEM_PATH_WILDPASS_CHECK_EMAIL = var.AEM_PATH_WILDPASS_CHECK_EMAIL
    AEM_PATH_RESEND_WILDPASS = var.AEM_PATH_RESEND_WILDPASS
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

