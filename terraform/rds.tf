# Data tier: PostgreSQL in isolated database subnets, reachable only from EKS nodes.

resource "aws_security_group" "db" {
  name        = "${var.project}-db"
  description = "PostgreSQL from EKS worker nodes only"
  vpc_id      = module.vpc.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "db_from_nodes" {
  security_group_id            = aws_security_group.db.id
  description                  = "Postgres from EKS nodes"
  referenced_security_group_id = module.eks.node_security_group_id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_db_instance" "postgres" {
  identifier     = "${var.project}-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t4g.micro"

  allocated_storage     = 20
  max_allocated_storage = 50
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "notes"
  username = "notes_admin"
  # RDS generates the password and stores (and can rotate) it in Secrets Manager.
  manage_master_user_password = true

  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false

  backup_retention_period    = 1
  auto_minor_version_upgrade = true
  deletion_protection        = false # lab: allow terraform destroy
  skip_final_snapshot        = true
  apply_immediately          = true

  performance_insights_enabled = true
}

output "db_address" {
  value = aws_db_instance.postgres.address
}

output "db_secret_arn" {
  value = aws_db_instance.postgres.master_user_secret[0].secret_arn
}
