# ---------------------------------------------------------
# COMPUTE: ALB, LAUNCH TEMPLATE, ASG
# ---------------------------------------------------------

# Create Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  # References security group defined in security.tf
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false

  tags = {
    Name = "${var.project_name}-alb"
  }
}

# Create Target Group (Routes traffic to EC2 instances)
resource "aws_lb_target_group" "main" {
  name     = "${var.project_name}-tg"
  port     = 5000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/"
    port                = "5000"
    protocol            = "HTTP"
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }

  tags = {
    Name = "${var.project_name}-target-group"
  }
}

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
# LAUNCH TEMPLATE (Mandatory Requirement)
# ---------------------------------------------------------

resource "aws_launch_template" "main" {
  name_prefix   = "${var.project_name}-lt-"

  # FIXED: Changed from amazon_linux to ubuntu (matches Main.tf)
  image_id      = data.aws_ami.ubuntu.id

  instance_type = var.instance_type

  # Attach IAM instance profile for S3 and CloudWatch access
  # Uses the data source defined in security.tf
  iam_instance_profile {
    name = data.aws_iam_instance_profile.lab_profile.name
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.web.id]
  }

 user_data = base64encode(<<-EOF
              #!/bin/bash
              set -e
              exec > >(tee /var/log/user-data.log) 2>&1

              # 1. Update & Install Tools
              apt-get update -y
              apt-get install -y git curl build-essential postgresql-client

              # 2. Install Node.js 20
              curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
              apt-get install -y nodejs
              npm install -g pm2

              # 3. Clone the CORRECT branch
              cd /home/ubuntu
              git clone -b cloud_features https://github.com/nacosking/CloudComputing.git app
              chown -R ubuntu:ubuntu app

              # 4. Install Dependencies
              cd app/ReserveMenu/ReserveMenu
              npm install
              npm run build

              # 5. Start App with Database Connection
              export PORT=5000
              export NODE_ENV=production

              # IMPORTANT: This injects the RDS details so the app can connect
              # Ensure 'aws_db_instance.main' matches your database.tf resource name
              export DATABASE_URL="postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.address}:5432/${var.db_name}"

              pm2 start npm --name "reserve-menu" -- start
              pm2 save
              env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
              EOF
  )
}

# ---------------------------------------------------------
# AUTO SCALING GROUP (Mandatory Requirement)
# ---------------------------------------------------------

resource "aws_autoscaling_group" "main" {
  name                = "${var.project_name}-asg"

  # FIXED: Switched to PUBLIC subnets to ensure Internet Access for git clone
  vpc_zone_identifier = aws_subnet.public[*].id

  target_group_arns   = [aws_lb_target_group.main.arn]
  health_check_type   = "ELB"
  min_size            = var.min_size
  max_size            = var.max_size
  desired_capacity    = var.desired_capacity

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }

  # Instance refresh configuration (for zero-downtime updates)
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-asg-instance"
    propagate_at_launch = true
  }

  tag {
    key                 = "ManagedBy"
    value               = "AutoScaling"
    propagate_at_launch = true
  }
}

# ---------------------------------------------------------
# AUTO SCALING POLICIES (Mandatory Requirement)
# ---------------------------------------------------------

resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.project_name}-scale-up"
  autoscaling_group_name = aws_autoscaling_group.main.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 1
  cooldown               = 300
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${var.project_name}-scale-down"
  autoscaling_group_name = aws_autoscaling_group.main.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = -1
  cooldown               = 300
}