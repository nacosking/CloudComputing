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

  # Inbound: Allow HTTP (Port 80) ONLY from the ALB
  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
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

  # Inbound: Allow MySQL (Port 3306) ONLY from the Web SG
  ingress {
    description     = "MySQL from web servers"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  # Outbound: Allow all (for DB updates/patches)
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
# IMPORTANT: AWS Academy restricts IAM role/policy creation.
# Solution: Use the existing LabInstanceProfile that already has
# necessary permissions for S3, CloudWatch, and other services.
# ---------------------------------------------------------

# Import the existing LabInstanceProfile (created by AWS Academy)
data "aws_iam_instance_profile" "lab_profile" {
  name = "LabInstanceProfile"
}

# NOTE: The LabRole already has the following AWS managed policies attached:
# - AmazonS3FullAccess (for S3 operations)
# - CloudWatchAgentServerPolicy (for CloudWatch metrics and logs)
# - AmazonSSMManagedInstanceCore (for Systems Manager)
# These provide all necessary permissions without custom policy attachment.