variable "project" {
  description = "Name of project account belongs to"
  default     = ""
}

variable "env" {
  description = "Environment of application ACvount like dev,uat,prod"
  default     = "test"
}

variable "role_arn" {
  description = "ARN of IAM role that terraform user should assumw"
  default     = "arn:aws:iam::111111111111:role/test"
}

variable "external_id" {
  description = "external id of the application which the terraform role allows to assume"
  default     = "test"
}

variable "region" {
  description = "AWS region"
  default     = "ap-southeast-1"
}

variable "handler" {
  description = "lambda handler"
  default     = "app.handler"
}

variable "memory_size" {
  description = "Amount of memory in MB your Lambda Function can use at runtime. Valid value between 128 MB to 10,240 MB (10 GB), in 64 MB increments."
  default     = 128
}

variable "AEM_WILDPASS_EMAILCHECK_ROUTE" {
  description = "AEM_WILDPASS_EMAILCHECK_ROUTE"
  default     = true
}

variable "layers" {
  description = "value of lambda layers arn. Max 5"
  default     = []
}

variable "newrelic_handler" {
  description = "newrelic handler"
  default     = ""
}

variable "NEW_RELIC_ACCOUNT_ID" {
  description = "newrelic account id"
  default     = ""
}

variable "NEW_RELIC_USE_ESM" {
  description = "Node.js handlers using ES Modules"
  default     = "false"
}

variable "NEW_RELIC_LICENSE_KEY_SECRET" {
  description = "NEW_RELIC_LICENSE_KEY_SECRET"
  default     = "NEW_RELIC_LICENSE_KEY"
}

variable "cloudwatch_logs_retention_in_days" {
  description = "Specifies the number of days you want to retain log events in the specified log group. Possible values are: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, and 3653."
  default     = 180
}

variable "AEM_URL" {
  description = "AEM url"
  default     = ""
}

variable "AEM_PATH_WILDPASS_CHECK_EMAIL" {
  description = "AEM_PATH_WILDPASS_CHECK_EMAIL"
  default     = ""
}

variable "AEM_PATH_RESEND_WILDPASS" {
  description = "AEM_PATH_RESEND_WILDPASS"
  default     = ""
}

variable "APP_LOG_SWITCH" {
  description = "APP_LOG_SWITCH"
  default     = ""
}

variable "USER_POOL_ID" {
  description = "USER_POOL_ID"
  default     = ""
}

variable "GALAXY_URL" {
  description = "GALAXY_URL"
  default     = ""
}

variable "GALAXY_IMPORT_PASS_PATH" {
  description = "GALAXY_IMPORT_PASS_PATH"
  default     = "/api/MembershipPass"
}

variable "GALAXY_UPDATE_PASS_PATH" {
  description = "GALAXY_UPDATE_PASS_PATH"
  default     = "/api/v1/MembershipUpdatePass"
}

variable "GALAXY_QUERY_TICKET_PATH" {
  description = "GALAXY_QUERY_TICKET_PATH"
  default     = "/api/v1/tickets"
}

variable "MYSQL_MASTER_DATABASE" {
  description = "MYSQL_MASTER_DATABASE"
  default     = "ciam"
}

variable "MYSQL_SLAVE_DATABASE" {
  description = "MYSQL_SLAVE_DATABASE"
  default     = "ciam"
}

variable "SOURCE_DB_MAPPING" {
  description = "SOURCE_DB_MAPPING"
  default     = { "ORGANIC" : 1, "TICKETING" : 2, "GLOBALTIX" : 3 }
}


variable "github_hash" {
  description = "github commit hash"
}

variable "enable_parameters_secrets_extension" {
  description = "Enable AWS Parameters and Secrets Lambda Extension"
  type        = bool
  default     = true
}

variable "parameters_secrets_extension_cache_enabled" {
  description = "Enable cache for the extension"
  type        = bool
  default     = true
}

variable "parameters_secrets_extension_cache_size" {
  description = "Maximum size of the cache in terms of number of items"
  type        = number
  default     = 1000
}

variable "ssm_parameter_store_ttl" {
  description = "TTL in seconds for SSM Parameter Store cache (0-300)"
  type        = number
  default     = 300
}

variable "secrets_manager_ttl" {
  description = "TTL in seconds for Secrets Manager cache (0-300)"
  type        = number
  default     = 300
}

variable "parameters_secrets_extension_log_level" {
  description = "Log level for the extension (DEBUG, INFO, WARN, ERROR)"
  type        = string
  default     = "INFO"
}

# List of ARN to be found here https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html#ps-integration-lambda-extensions-add
variable "parameters_secrets_extension_arn" {
  description = "ARN for using AWS Parameters and Secrets Lambda Extension"
  default     = "arn:aws:lambda:ap-southeast-1:044395824272:layer:AWS-Parameters-and-Secrets-Lambda-Extension:21"
}