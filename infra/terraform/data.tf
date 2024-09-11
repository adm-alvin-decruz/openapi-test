data "aws_secretsmanager_secret" "ciam" {
  name = "${var.project}-${var.env}-db-user1-cred"
}

data "aws_secretsmanager_secret_version" "ciam" {
  secret_id = data.aws_secretsmanager_secret.ciam.id
}
