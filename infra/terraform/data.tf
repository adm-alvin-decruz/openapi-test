data "aws_secretsmanager_secret" "ciam_db" {
  name = "ciam-${var.env}-db-user1"
}

data "aws_secretsmanager_secret_version" "ciam_db" {
  secret_id = data.aws_secretsmanager_secret.ciam_db.id
}

data "aws_secretsmanager_secret" "ciam_config" {
  name = "ciam-microservice-lambda-config"
}

data "aws_secretsmanager_secret_version" "ciam_config" {
  secret_id = data.aws_secretsmanager_secret.ciam_config.id
}

data "aws_s3_bucket" "passkit" {
  bucket = "mwg-passkit-${var.env}"
}
