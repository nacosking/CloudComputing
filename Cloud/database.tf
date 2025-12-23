# ---------------------------------------------------------
# RDS DATABASE (Mandatory Requirement)
# ---------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"

  # Ensure this points to PUBLIC subnets so your laptop can reach it
  subnet_ids = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "main" {
  identifier               = "${var.project_name}-db"
  engine                   = "postgres"
  engine_version           = "15.4"
  instance_class           = "db.t3.micro"

  # --- Role 3: Security ---
  allocated_storage        = 20
  storage_encrypted        = true  # ✅ Encryption

  # ✅ CHANGED: Allow public internet access (for VS Code)
  publicly_accessible      = true

  db_name                  = var.db_name
  username                 = var.db_username
  password                 = var.db_password
  port                     = 5432  # PostgreSQL default port

  db_subnet_group_name     = aws_db_subnet_group.main.name
  vpc_security_group_ids   = [aws_security_group.database.id] # ✅ Firewall

  # --- Role 3: Cost & Backups ---
  multi_az                 = false # ✅ Save money
  backup_retention_period  = 7     # ✅ Backup Policy
  skip_final_snapshot      = true

  tags = {
    Name        = "${var.project_name}-database"
    Role        = "SecurityOps"    # ✅ Cost Tagging
    Environment = "Production"
  }
}

# ---------------------------------------------------------
# DATABASE CREDENTIALS (Security Best Practice)
# ---------------------------------------------------------
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.project_name}-db-credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id     = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}