resource "aws_security_group" "lambda" {
  name        = "${var.project}-${var.env}-lambda-sg"
  description = "Allow TLS inbound traffic and all outbound traffic"
  vpc_id      = data.terraform_remote_state.network.outputs.vpc_id

  tags = {
    Name = "${var.project}-${var.env}-lambda-sg"
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_tls_ipv4" {
  security_group_id = aws_security_group.lambda.id
  description       = "Allow TLS IPv4 Ingress from port 443"
  cidr_ipv4         = data.terraform_remote_state.network.outputs.vpc_cidr_block
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4" {
  security_group_id = aws_security_group.lambda.id
  description       = "Allow Egress Traffic to all IPv4 and all ports"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" # semantically equivalent to all ports
}

resource "aws_vpc_security_group_egress_rule" "allow_all_sql_traffic_ipv4" {
  security_group_id = aws_security_group.lambda.id
  description       = "Allow Egress traffic to all SQL Instances"
  cidr_ipv4         = data.terraform_remote_state.network.outputs.vpc_cidr_block
  ip_protocol       = "tcp"
  from_port         = data.terraform_remote_state.rds.outputs.cluster_port
  to_port           = data.terraform_remote_state.rds.outputs.cluster_port
}

