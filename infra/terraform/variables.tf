variable "project" {
  description = "Name of project account belongs to"
  default = ""
}

variable "env" {
  description = "Environment of application ACvount like dev,uat,prod"
  default = "test"
}

variable "role_arn" {
  description = "ARN of IAM role that terraform user should assumw"
  default = "arn:aws:iam::111111111111:role/test"
}

variable "external_id" {
  description = "external id of the application which the terraform role allows to assume"
  default = "test"
}

variable "region" {
  description = "AWS region"
  default = "ap-southeast-1"
}

variable "handler" {
  description = "lambda handler"
  default = "app.handler"
}

variable "AEM_WILDPASS_EMAILCHECK_ROUTE" {
  description = "AEM_WILDPASS_EMAILCHECK_ROUTE"
  default = true
}

variable "layers" {
  description = "value of lambda layers arn. Max 5"
  default = []
}

variable "newrelic_handler" {
  description = "newrelic handler"
  default = ""
}

variable "NEW_RELIC_ACCOUNT_ID" {
  description = "newrelic account id"
  default = ""
}

variable "NEW_RELIC_USE_ESM" {
  description = "Node.js handlers using ES Modules"
  default = "false"
}

variable "NEW_RELIC_LICENSE_KEY_SECRET" {
  description = "NEW_RELIC_LICENSE_KEY_SECRET"
  default = "NEW_RELIC_LICENSE_KEY"
}

variable "cloudwatch_logs_retention_in_days" {
  description = "Specifies the number of days you want to retain log events in the specified log group. Possible values are: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, and 3653."
  default = 3
}

variable "AEM_URL" {
  description = "AEM url"
  default = ""
}

variable "AEM_PATH_WILDPASS_CHECK_EMAIL" {
  description = "AEM_PATH_WILDPASS_CHECK_EMAIL"
  default = ""
}

variable "AEM_PATH_RESEND_WILDPASS" {
  description = "AEM_PATH_RESEND_WILDPASS"
  default = ""
}

variable "AEM_APP_ID" {
  description = "AEM AppId"
  default = ""
}

variable "MEMBERSHIPS_API_RESPONSE_CONFIG" {
  description = "MEMBERSHIPS_API_RESPONSE_CONFIG"
  default = ""
}

variable "APP_LOG_SWITCH" {
  description = "APP_LOG_SWITCH"
  default = ""
}

variable "USER_POOL_ID" {
  description = "USER_POOL_ID"
  default = ""
}
