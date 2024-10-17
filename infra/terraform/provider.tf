#------------------------------------------------------------------------------
#   Provider
#------------------------------------------------------------------------------
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "5.70.0"
    }
  }
}

provider "aws" {
  region  = var.region
  assume_role {
    role_arn     = var.role_arn
    external_id  = var.external_id
  }
}
