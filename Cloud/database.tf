# ---------------------------------------------------------
# RDS DATABASE (Mandatory Requirement)
# ---------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"

  # CHANGE THIS LINE:
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "main" {
  identifier               = "${var.project_name}-db"
  engine                   = "postgres"
  engine_version           = var.db_engine_version
  instance_class           = "db.t3.micro"

  # --- Role 3: Security ---
  allocated_storage        = 20
  storage_encrypted        = true  # ✅ Encryption
  publicly_accessible      = false # ✅ Explicitly block public internet

  db_name                  = var.db_name
  username                 = var.db_username
  password                 = var.db_password

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
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}

# Create a Subnet Group for RDS
# This tells AWS: "Put the database in these specific private subnets"
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id  # <--- Connects DB to Private Subnets

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# Update your existing RDS resource to use this group
# resource "aws_db_instance" "main" {
#   ...
#   db_subnet_group_name = aws_db_subnet_group.main.name
#   vpc_security_group_ids = [aws_security_group.database.id]
#   ...
# }