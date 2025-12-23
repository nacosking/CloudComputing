# ---------------------------------------------------------
# SECURITY GROUPS (Mandatory Requirement)
# ---------------------------------------------------------

# Security Group for Load Balancer (ALB)
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  # Inbound: Allow public HTTP (Port 80) and HTTPS (443)
  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound: Allow all outbound connections
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security Group for EC2 Instances (Web/App Tier)
resource "aws_security_group" "web" {
  name        = "${var.project_name}-web-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  # (REMOVED THE INCORRECT MYSQL RULE FROM HERE)

  # Inbound: Allow Application Traffic (Port 5000) from the ALB
  ingress {
    description     = "App Port from ALB"
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Inbound: Allow SSH (Port 22) from allowed IPs
  ingress {
    description = "SSH from allowed IPs"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr
  }

  # Outbound: Allow all (needed to talk to DB, S3, and NAT GW)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security Group for RDS Database (DB Tier)
resource "aws_security_group" "database" {
  name        = "${var.project_name}-db-sg"
  description = "Security group for RDS database"
  vpc_id      = aws_vpc.main.id

  # --- THIS IS THE CORRECT PLACE FOR THE RULE ---
  # Inbound: Allow PostgreSQL (Port 5432) from Internet (VS Code)
  ingress {
    description = "PostgreSQL from Internet"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  # ----------------------------------------------

  # Inbound: Allow PostgreSQL (Port 5432) from the Web SG (EC2)
  ingress {
    description     = "PostgreSQL from web servers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  # Outbound: Allow all
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ---------------------------------------------------------
# IAM CONFIGURATION FOR AWS ACADEMY
# ---------------------------------------------------------
data "aws_iam_instance_profile" "lab_profile" {
  name = "LabInstanceProfile"
}