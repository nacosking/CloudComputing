# ---------------------------------------------------------
# APPLICATION LOAD BALANCER (Mandatory Requirement)
# ---------------------------------------------------------

# Create Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
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

  # Health check configuration
  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/"     # This checks your Home page
    matcher             = "200"
    port                = "traffic-port" # Ensures it checks port 5000
  }

  tags = {
    Name = "${var.project_name}-target-group"
  }
}

# Create Listener (Forwards HTTP traffic to Target Group)
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
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  # Attach IAM instance profile for S3 and CloudWatch access
  # Uses the existing LabInstanceProfile provided by AWS Academy
  iam_instance_profile {
    name = data.aws_iam_instance_profile.lab_profile.name
  }

  # Network configuration
  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.web.id]
  }

  # User data script (Bootstrap script that runs on instance startup)
  # User data script (Bootstrap script that runs on instance startup)
  user_data = base64encode(<<-EOF
              #!/bin/bash

              # 1. Update System
              yum update -y

              # 2. Install Git
              yum install -y git

              # 3. Install Node.js (Version 20)
              curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
              yum install -y nodejs

              # 4. Install Process Manager (PM2) to keep app running
              npm install -g pm2

              # 5. Clone your specific 'testing' branch
              # REPLACE THE URL BELOW WITH YOUR GITHUB URL
              cd /home/ec2-user
              git clone -b testing https://github.com/nacosking/CloudComputing.git app

              # 6. Install App Dependencies
              cd app/ReserveMenu/ReserveMenu   # Adjust this path if your folder structure differs!
              npm install

              # 7. Start the App using PM2
              # We use 'cross-env' and 'tsx' directly or via npm script if it's simpler
              # Setting PORT=5000 explicitly
              export PORT=5000

              # Start the app in the background
              pm2 start npm --name "reserve-menu" -- run dev

              # 8. Save PM2 list so it restarts on reboot
              pm2 save
              pm2 startup
              EOF
  )
  update_default_version = true

  tags = {
    Name = "${var.project_name}-launch-template"
  }
}
# ---------------------------------------------------------
# AUTO SCALING GROUP (Mandatory Requirement)
# ---------------------------------------------------------

resource "aws_autoscaling_group" "main" {
  name                = "${var.project_name}-asg"
  vpc_zone_identifier = aws_subnet.public[*].id
  target_group_arns   = [aws_lb_target_group.main.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = var.min_size
  max_size         = var.max_size
  desired_capacity = var.desired_capacity

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

# Scale Up Policy (Triggered by high CPU alarm)
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.project_name}-scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

# Scale Down Policy (Triggered by low CPU alarm)
resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${var.project_name}-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}