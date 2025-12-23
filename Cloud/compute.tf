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

locals {
  user_data = <<-EOF
        #!/bin/bash
        # 1. CREATE SWAP (Still needed for t2.micro)
        dd if=/dev/zero of=/swapfile bs=128M count=16
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile

        # 2. INSTALL SYSTEM DEPS (AL2023 uses dnf, but yum works too)
        yum update -y
        yum install -y git ruby wget

        # 3. INSTALL NODE.JS 20 (Native on AL2023!)
        # We don't need the external setup script anymore
        yum install -y nodejs

        # 4. INSTALL CLOUDWATCH AGENT
        wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
        rpm -U ./amazon-cloudwatch-agent.rpm

        # 5. CLONE APPLICATION
        cd /opt
        git clone --branch testing --single-branch https://github.com/nacosking/CloudComputing.git app

        # 6. Install dependencies and build full app from Application folder
        cd /opt/app/Application
        npm install
        npm run build

        # 7. Configure environment for backend
        export DATABASE_URL="postgres://${var.db_username}:${var.db_password}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${var.db_name}"
        export SESSION_SECRET="change-me-session-secret"
        export NODE_ENV=production
        export PORT=80

        # 8. Start backend server (npm start runs compiled dist/index.cjs)
        nohup npm start > /var/log/app.log 2>&1 &
        EOF
}

# Launch Template (Blueprint for the EC2 instances)
resource "aws_launch_template" "main" {
  name_prefix            = "${var.project_name}-lt-"
  image_id               = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type

  # Replace with your real EC2 key pair name if you need SSH access
  key_name               = "vockey"

  iam_instance_profile {
    name = data.aws_iam_instance_profile.lab_profile.name # Attaches existing LabInstanceProfile permissions
  }

  vpc_security_group_ids = [aws_security_group.web.id] # Applies App Firewall

  user_data = base64encode(local.user_data) # Runs the startup script

  monitoring {
    enabled = true
  }

  # Add Name tag to EC2 instances created by Auto Scaling
  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project_name}-web-server"
    }
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