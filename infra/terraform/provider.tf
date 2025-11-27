#------------------------------------------------------------------------------
#   Provider
#------------------------------------------------------------------------------
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.22.1"
    }
  }
}

provider "aws" {
  region = var.region
  assume_role {
    role_arn    = var.role_arn
    external_id = var.external_id
  }
}
