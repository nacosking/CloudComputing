# ---------------------------------------------------------
# RDS DATABASE (Mandatory Requirement)
# ---------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id # Keeps DB off the public internet

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "main" {
  identifier               = "${var.project_name}-db"
  engine                   = "postgres"
  
  # ✅ FIXED: Uses a version available in your region (based on your CLI output)
  engine_version           = "16.6" 
  
  instance_class           = "db.t3.micro"

  # --- Role 3: Security ---
  allocated_storage        = 20
  storage_encrypted        = true  
  publicly_accessible      = false # Secure (Only EC2 can connect)

  db_name                  = var.db_name
  username                 = var.db_username
  password                 = var.db_password

  db_subnet_group_name     = aws_db_subnet_group.main.name
  vpc_security_group_ids   = [aws_security_group.database.id] 

  # --- Role 3: Cost & Backups ---
  multi_az                 = false 
  backup_retention_period  = 7     
  skip_final_snapshot      = true

  tags = {
    Name        = "${var.project_name}-database"
    Role        = "SecurityOps"    
    Environment = "Production"
  }
}

# ---------------------------------------------------------
# DATABASE CREDENTIALS
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
    engine   = aws_db_instance.main.engine
  })
}