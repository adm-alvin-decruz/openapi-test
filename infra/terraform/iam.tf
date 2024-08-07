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
  managed_policy_arns = ["arn:aws:iam::aws:policy/AmazonRekognitionFullAccess", "arn:aws:iam::aws:policy/AmazonSSMFullAccess", "arn:aws:iam::aws:policy/AWSLambda_FullAccess", aws_iam_policy.nr_secretmanager.arn]
}

resource "aws_iam_policy" "nr_secretmanager" {
  name = "nr-api-key-secret-access-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["secretsmanager:GetSecretValue"]
        Effect   = "Allow"
        Resource = data.aws_secretsmanager_secret.nr_api_key_secret.arn
      },
    ]
  })
}
