#------------------------------------------------------------------------------
#   Provider
#------------------------------------------------------------------------------

provider "aws" {
  region  = var.region
  assume_role {
    role_arn     = var.role_arn
    external_id  = var.external_id
  }
}
