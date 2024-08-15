#------------------------------------------------------------------------------
# devops/ciam/backend.tf
#------------------------------------------------------------------------------

terraform {
  backend "s3" {
    region         = "ap-southeast-1"
    encrypt = true
    bucket         = "mandai-terraform-state"
    dynamodb_table = "mandai-terraform-state"
    key = "infra/ciam/lambda/terraform.state"
    role_arn = "arn:aws:iam::043448533573:role/mandai-terraform-state-role"
    external_id = "mandai-terraform-state-user"
  }
}

data "terraform_remote_state" "network" {
    backend = "s3"
    workspace = terraform.workspace
    config = {
        bucket  = "mandai-terraform-state"
        key     = "infra/common-services/network/terraform.state"
        region  = "ap-southeast-1"
    role_arn = "arn:aws:iam::043448533573:role/mandai-terraform-state-role"
    external_id = "mandai-terraform-state-user"
    }
}

data "terraform_remote_state" "email_trigger_function" {
    backend = "s3"
    workspace = terraform.workspace
    config = {
        bucket  = "mandai-terraform-state"
        key     = "infra/ciam/user-signup/terraform.state"
        region  = "ap-southeast-1"
    role_arn = "arn:aws:iam::043448533573:role/mandai-terraform-state-role"
    external_id = "mandai-terraform-state-user"
    }
}

data "terraform_remote_state" "card_face_generator_function" {
    backend = "s3"
    workspace = terraform.workspace
    config = {
        bucket  = "mandai-terraform-state"
        key     = "infra/ciam/card-face-generator/terraform.state"
        region  = "ap-southeast-1"
    role_arn = "arn:aws:iam::043448533573:role/mandai-terraform-state-role"
    external_id = "mandai-terraform-state-user"
    }
}
