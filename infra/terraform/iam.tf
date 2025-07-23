data "aws_caller_identity" "current" {}

data "aws_cognito_user_pool" "cognito" {
  user_pool_id = var.USER_POOL_ID
}

data "aws_secretsmanager_secret" "nr_api_key_secret" {
  name = var.NEW_RELIC_LICENSE_KEY_SECRET
}

data "aws_iam_policy_document" "lambda_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com", "lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "lambda-${var.project}-${var.env}-role"
  path               = "/"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}

locals {
  aws_managed_policies = [
    "arn:aws:iam::aws:policy/AmazonRekognitionFullAccess",
    "arn:aws:iam::aws:policy/AmazonSSMFullAccess",
    "arn:aws:iam::aws:policy/AWSLambda_FullAccess",
    "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
  ]
}

resource "aws_iam_role_policy_attachment" "lambda_aws_managed" {
  for_each   = toset(local.aws_managed_policies)
  role       = aws_iam_role.lambda.name
  policy_arn = each.value
}

resource "aws_iam_role_policy_attachment" "lambda_nr_secret" {
  role       = aws_iam_role.lambda.name
  policy_arn = data.aws_iam_policy.nr_secretmanager.arn
}

resource "aws_iam_role_policy_attachment" "lambda_custom" {
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.lambda.arn
}

data "aws_iam_policy" "nr_secretmanager" {
  name = "nr-api-key-secret-access-policy"
}

data "aws_iam_policy_document" "lambda" {
  statement {
    sid = "1"

    actions = [
      "cognito-idp:Admin*",
    ]

    resources = [
      data.aws_cognito_user_pool.cognito.arn
    ]
  }
  statement {
    sid = "2"

    actions = [
      "sqs:*",
    ]

    resources = [
      data.terraform_remote_state.sqs.outputs.sqs_queue_arn
    ]
  }
  statement {
    sid = "3"
    
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket"
    ]
    
    resources = [
      data.aws_s3_bucket.passkit.arn,
      "${data.aws_s3_bucket.passkit.arn}/*"
    ]
  }
  statement {
    sid = "SecretsManagerAccess"

    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    
    resources = [
      data.aws_secretsmanager_secret.nr_api_key_secret.arn,
      data.aws_secretsmanager_secret.ciam_db.arn,
      data.aws_secretsmanager_secret.ciam_config.arn,
    ]
  }
  statement {
    sid= "SSMParameterAccess"

    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath"
    ]

    resources = [
      "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/*"
    ]
  }
}

resource "aws_iam_policy" "lambda" {
  name        = "${var.project}-${var.env}-policy"
  description = "policy for lambda"
  policy = data.aws_iam_policy_document.lambda.json
}

