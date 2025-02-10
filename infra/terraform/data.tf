data "aws_secretsmanager_secret" "ciam" {
  name = "ciam-${var.env}-db-user1"
}

data "aws_secretsmanager_secret_version" "ciam" {
  secret_id = data.aws_secretsmanager_secret.ciam.id
}

data "aws_s3_bucket" "passkit" {
  bucket = "mwg-passkit-${var.env}"
}
