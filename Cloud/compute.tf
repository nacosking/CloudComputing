# ---------------------------------------------------------
# LOAD BALANCER (Mandatory Requirement)
# ---------------------------------------------------------
resource "aws_lb" "main" {
  name                = "${var.project_name}-alb"
  internal            = false # Public-facing ALB
  load_balancer_type  = "application"
  security_groups     = [aws_security_group.alb.id]
  subnets             = aws_subnet.public[*].id # Placed in public subnets

  enable_deletion_protection = false # Allows easy cleanup

  tags = {
    Name = "${var.project_name}-alb"
  }
}

# Target Group (Defines where the ALB sends traffic and how it checks health)
resource "aws_lb_target_group" "main" {
  name     = "${var.project_name}-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/" # Checks the root path for a response
    matcher             = "200" # Expects a 200 OK status
  }
}

# ALB Listener (Listens on port 80 and forwards traffic to the target group)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

# ---------------------------------------------------------
# LAUNCH TEMPLATE & USER DATA (Mandatory Requirement)
# ---------------------------------------------------------

# User Data Script (Runs on EC2 boot - Role 2 will modify this for final deployment)
# ---------------------------------------------------------
# UPDATED USER DATA (Adds Swap for Build + Debugging)
# ---------------------------------------------------------
locals {
  user_data = <<-EOF
        #!/bin/bash
        # 1. CREATE SWAP FILE (Prevents "Out of Memory" crashes)
        dd if=/dev/zero of=/swapfile bs=128M count=16
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        
        # 2. Install Node 20 & Git
        yum update -y
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        yum install -y nodejs git
        
        # Install CloudWatch Agent
        wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
        rpm -U ./amazon-cloudwatch-agent.rpm

        # 3. Clone Repo
        cd /opt
        git clone https://github.com/nacosking/CloudComputing.git app
        cd app
        
        # 4. Build Frontend (Now with Swap space!)
        cd frontend
        npm install
        npm run build

        # 5. Setup Backend
        cd ../backend
        npm install
        npm run build 

        # 6. Environment Variables
        export DATABASE_URL="postgres://${var.db_username}:${var.db_password}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${var.db_name}"
        export SESSION_SECRET="change-me-session-secret"
        export NODE_ENV=production
        export PORT=80

        # 7. Start Server
        # We redirect logs to /var/log/app.log so you can debug
        nohup npm start > /var/log/app.log 2>&1 &
        EOF
}

resource "aws_launch_template" "main" {
  name_prefix            = "${var.project_name}-lt-"
  image_id               = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  
  # ✅ ADD THIS LINE (Replace "vockey" with YOUR actual key name from AWS Console)
  key_name               = "vockey"  

  iam_instance_profile {
    name = data.aws_iam_instance_profile.lab_profile.name 
  }

  vpc_security_group_ids = [aws_security_group.web.id] 
  user_data              = base64encode(local.user_data) 

  monitoring {
    enabled = true
  }
}

# Launch Template (Blueprint for the EC2 instances)
resource "aws_launch_template" "main" {
  name_prefix            = "${var.project_name}-lt-"
  image_id               = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type

  iam_instance_profile {
    name = data.aws_iam_instance_profile.lab_profile.name # Attaches existing LabInstanceProfile permissions
  }

  vpc_security_group_ids = [aws_security_group.web.id] # Applies App Firewall

  user_data = base64encode(local.user_data) # Runs the startup script

  monitoring {
    enabled = true
  }
}

# ---------------------------------------------------------
# AUTO SCALING GROUP (Mandatory Requirement)
# ---------------------------------------------------------
resource "aws_autoscaling_group" "main" {
  name                 = "${var.project_name}-asg"
  # CRITICAL: Deploy servers in PRIVATE subnets for security
  vpc_zone_identifier  = aws_subnet.private[*].id 
  target_group_arns    = [aws_lb_target_group.main.arn]
  health_check_type    = "ELB"
  health_check_grace_period = 300

  min_size             = var.min_size
  max_size             = var.max_size
  desired_capacity     = var.desired_capacity

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }
}

# Auto Scaling Policy - Scale Up (Mandatory)
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.project_name}-scale-up"
  scaling_adjustment     = 1 # Adds 1 instance
  adjustment_type        = "ChangeInCapacity"
  autoscaling_group_name = aws_autoscaling_group.main.name
}

# Auto Scaling Policy - Scale Down (Mandatory)
resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${var.project_name}-scale-down"
  scaling_adjustment     = -1 # Removes 1 instance
  adjustment_type        = "ChangeInCapacity"
  autoscaling_group_name = aws_autoscaling_group.main.name
}