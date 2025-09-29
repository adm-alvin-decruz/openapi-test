locals {
  parameters_secrets_extension_arn = var.parameters_secrets_extension_arn
  # Combine existing layers with extension layer
  all_layers = var.enable_parameters_secrets_extension ? concat(
    var.layers,
    [local.parameters_secrets_extension_arn]
  ) : var.layers
}

data "aws_kms_alias" "s3" {
  name = "alias/aws/s3"
}

resource "aws_s3_bucket" "ciam" {
  bucket = "${var.project}-${var.env}"
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "aws:kms"
      }
    }
  }
}

resource "aws_s3_bucket_ownership_controls" "ciam" {
  bucket = aws_s3_bucket.ciam.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "ciam" {
  depends_on = [aws_s3_bucket_ownership_controls.ciam]

  bucket = aws_s3_bucket.ciam.id
  acl    = "private"
}

resource "aws_s3_bucket_public_access_block" "ciam" {
  bucket                  = aws_s3_bucket.ciam.id
  ignore_public_acls      = true
  restrict_public_buckets = true
  block_public_policy     = true
  block_public_acls       = true
}

resource "aws_s3_object" "ciam" {
  bucket                 = aws_s3_bucket.ciam.id
  key                    = "packages/app-${var.github_hash}.zip"
  source                 = "files/app-${var.github_hash}.zip"
  server_side_encryption = "aws:kms"

  # The filemd5() function is available in Terraform 0.11.12 and later
  # For Terraform 0.11.11 and earlier, use the md5() function and the file() function:
  # etag = "${md5(file("path/to/file"))}"
  etag = filemd5("files/app-${var.github_hash}.zip")
}

module "lambda_function_ciam_membership" {
  source = "terraform-aws-modules/lambda/aws"

  function_name                     = "${var.project}-${var.env}-lambda"
  description                       = "${var.project} ${var.env} lambda"
  handler                           = var.newrelic_handler
  runtime                           = "nodejs20.x"
  timeout                           = 50
  memory_size                       = var.memory_size
  create_package                    = false
  ignore_source_code_hash           = false
  cloudwatch_logs_retention_in_days = var.cloudwatch_logs_retention_in_days
  publish                           = true # Enables Lambda versioning
  s3_existing_package = {
    bucket = aws_s3_object.ciam.bucket
    key    = aws_s3_object.ciam.key
  }
  environment_variables = merge({
    LAMBDA_CIAM_SIGNUP_TRIGGER_MAIL_FUNCTION         = data.terraform_remote_state.signup_email_trigger_function.outputs.lambda_name
    LAMBDA_CIAM_SIGNUP_CREATE_WILDPASS_FUNCTION      = data.terraform_remote_state.card_face_generator_function.outputs.lambda_name
    LAMBDA_EMAIL_TRIGGER_SERVICE_FUNCTION            = data.terraform_remote_state.email_trigger_microservice_function.outputs.lambda_name
    APP_ENV                                          = var.env
    APP_LOG_SWITCH                                   = var.APP_LOG_SWITCH
    USER_POOL_ID                                     = var.USER_POOL_ID
    GALAXY_URL                                       = var.GALAXY_URL
    GALAXY_IMPORT_PASS_PATH                          = var.GALAXY_IMPORT_PASS_PATH
    GALAXY_UPDATE_PASS_PATH                          = var.GALAXY_UPDATE_PASS_PATH
    GALAXY_QUERY_TICKET_PATH                         = var.GALAXY_QUERY_TICKET_PATH
    MYSQL_MASTER_HOST                                = data.terraform_remote_state.rds.outputs.cluster_endpoint
    MYSQL_MASTER_DATABASE                            = var.MYSQL_MASTER_DATABASE
    MYSQL_MASTER_PORT                                = data.terraform_remote_state.rds.outputs.cluster_port
    MYSQL_SLAVE_HOST                                 = data.terraform_remote_state.rds.outputs.cluster_endpoint
    MYSQL_SLAVE_DATABASE                             = var.MYSQL_SLAVE_DATABASE
    MYSQL_SLAVE_PORT                                 = data.terraform_remote_state.rds.outputs.cluster_port
    NEW_RELIC_LAMBDA_EXTENSION_ENABLED               = "true"
    AEM_WILDPASS_EMAILCHECK_ROUTE                    = var.AEM_WILDPASS_EMAILCHECK_ROUTE
    AEM_URL                                          = var.AEM_URL
    AEM_PATH_WILDPASS_CHECK_EMAIL                    = var.AEM_PATH_WILDPASS_CHECK_EMAIL
    AEM_PATH_RESEND_WILDPASS                         = var.AEM_PATH_RESEND_WILDPASS
    SOURCE_DB_MAPPING                                = jsonencode(var.SOURCE_DB_MAPPING)
    NEW_RELIC_ACCOUNT_ID                             = var.NEW_RELIC_ACCOUNT_ID
    NEW_RELIC_LAMBDA_HANDLER                         = var.handler
    NEW_RELIC_USE_ESM                                = var.NEW_RELIC_USE_ESM
    NEW_RELIC_LICENSE_KEY_SECRET                     = var.NEW_RELIC_LICENSE_KEY_SECRET
    AWS_REGION_NAME                                  = var.region
    SQS_QUEUE_URL                                    = data.terraform_remote_state.sqs.outputs.sqs_queue_url
    LAMBDA_CIAM_SIGNUP_TRIGGER_PASSKIT_MAIL_FUNCTION = data.terraform_remote_state.passkit_email_trigger_function.outputs.lambda_name
    }, var.enable_parameters_secrets_extension ? {
    # AWS Parameters and Secrets Lambda Extension configuration
    PARAMETERS_SECRETS_EXTENSION_CACHE_ENABLED = tostring(var.parameters_secrets_extension_cache_enabled)
    PARAMETERS_SECRETS_EXTENSION_CACHE_SIZE    = tostring(var.parameters_secrets_extension_cache_size)
    SSM_PARAMETER_STORE_TTL                    = tostring(var.ssm_parameter_store_ttl)
    SECRETS_MANAGER_TTL                        = tostring(var.secrets_manager_ttl)
    PARAMETERS_SECRETS_EXTENSION_LOG_LEVEL     = var.parameters_secrets_extension_log_level
    PARAMETERS_SECRETS_EXTENSION_HTTP_PORT     = "2773"
  } : {})
  #  allowed_triggers = {
  #    apigateway = {
  #      service  = "apigateway"
  #      source_arn = aws_cloudwatch_event_rule.schedule.arn
  #    }
  #  }
  create_current_version_allowed_triggers = false
  lambda_role                             = aws_iam_role.lambda.arn
  create_role                             = false
  layers                                  = local.all_layers

  ### VPC ####
  vpc_subnet_ids         = data.terraform_remote_state.network.outputs.private_subnets
  vpc_security_group_ids = [aws_security_group.lambda.id]
  attach_network_policy  = true
}

# Lambda Alias for Version Control
resource "aws_lambda_alias" "lambda_latest" {
  name             = "latest"
  description      = "Alias for traffic shifting between versions"
  function_name    = module.lambda_function_ciam_membership.lambda_function_name
  function_version = module.lambda_function_ciam_membership.lambda_function_version
}
