data "aws_availability_zones" "available" {
  state = "available"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.16"

  name = "${var.project}-vpc"
  cidr = "10.60.0.0/16"

  azs             = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnets  = ["10.60.0.0/24", "10.60.1.0/24"]
  private_subnets = ["10.60.10.0/24", "10.60.11.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true # one NAT keeps the lab cheap

  create_database_subnet_group = true
  database_subnets             = ["10.60.20.0/24", "10.60.21.0/24"]
  enable_dns_hostnames         = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
}
