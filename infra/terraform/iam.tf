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
  managed_policy_arns = ["arn:aws:iam::aws:policy/AmazonRekognitionFullAccess", "arn:aws:iam::aws:policy/AmazonSSMFullAccess", "arn:aws:iam::aws:policy/AWSLambda_FullAccess", "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole", data.aws_iam_policy.nr_secretmanager.arn, aws_iam_policy.lambda.arn]
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
}

resource "aws_iam_policy" "lambda" {
  name        = "${var.project}-${var.env}-policy"
  description = "policy for lambda"
  policy = data.aws_iam_policy_document.lambda.json
}

