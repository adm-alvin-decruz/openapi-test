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

data "aws_iam_policy_document" "ciam-backup-assume-role-policy" {
  statement {
    effect = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

data "aws_rds_clusters" "ciam" {
  filter {
    name = "db-cluster-id"
    values = ["ciam-${var.env}"]
  }
}

data "aws_iam_policy_document" "ciam-backup" {
  statement {
    effect = "Allow"

    actions = [
      "rds:CreateDBSnapshot",
      "rds:DeleteDBSnapshot",
      "rds:DescribeDBSnapshots",
      "rds:StartExportTask",
      "rds:DescribeExportTasks",
      "rds:AddTagsToResource",
      "rds:ListTagsForResource"
    ]

    resources = [
      data.aws_rds_clusters.ciam.cluster_arns,
      "${data.aws_rds_clusters.ciam.cluster_arns}:*"
    ]
  }
  
  statement {
    effect = "Allow"

    actions = [
      "s3:PutObject",
      "s3:GetBucketLocation"
    ]

    resources = [
      aws_s3_bucket.ciam.arn,
      "${aws_s3_bucket.ciam.arn}:*"
    ]
  }

  statement {
    effect = "Allow"
    
    actions = [
      "kms:Encrypt",
      "kms:Decrypt"
    ]

    resources = [
      data.aws_rds_clusters.ciam.cluster_arns,
      "${data.aws_rds_clusters.ciam.cluster_arns}:*",
      aws_s3_bucket.ciam.arn,
      "${aws_s3_bucket.ciam.arn}:*"
    ]
  }
}

resource "aws_iam_policy" "ciam-backup" {
  name        = "${var.project}-${var.env}-backup-policy"
  description = "policy for backing up ciam RDS"
  policy = data.aws_iam_policy_document.ciam-backup.json
}

resource "aws_iam_role" "ciam-backup" {
  name = "${var.project}-${var.env}-backup-role"
  path = "/"
  assume_role_policy = data.aws_iam_policy_document.ciam-backup-assume-role-policy.json
}

resource "aws_iam_role_policy_attachment" "ciam-backup" {
  role = aws_iam_role.ciam-backup.name
  policy_arn = aws_iam_policy.ciam-backup.arn
}
