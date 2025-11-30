# ---------------------------------------------------------
# RDS DATABASE (Mandatory Requirement)
# ---------------------------------------------------------
resource "aws_db_instance" "main" {
  identifier               = "${var.project_name}-db"
  engine                   = "mysql"
  engine_version           = "8.0"
  instance_class           = "db.t3.micro" # Free tier eligible

  allocated_storage        = 20
  storage_encrypted        = true # Security: Encrypts data at rest

  db_name                  = var.db_name
  username                 = var.db_username
  password                 = var.db_password

  db_subnet_group_name     = aws_db_subnet_group.main.name # Deploys DB in private subnets
  vpc_security_group_ids   = [aws_security_group.database.id] # Applies DB firewall

  multi_az                 = false # Set to false to avoid high lab costs

  # Backup configuration (Mandatory Requirement)
  backup_retention_period  = 7 
  skip_final_snapshot      = true 

  tags = {
    Name = "${var.project_name}-database"
  }
}

# ---------------------------------------------------------
# DATABASE CREDENTIALS (Security Best Practice)
# ---------------------------------------------------------

# 1. AWS Secrets Manager Secret (Securely stores master credentials)
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.project_name}-db-credentials"
}

# 2. Secret Version (Stores the actual credentials and endpoint)
resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = aws_db_instance.main.address # RDS Endpoint
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}