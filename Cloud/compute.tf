# ---------------------------------------------------------
# APPLICATION LOAD BALANCER (Mandatory Requirement)
# ---------------------------------------------------------

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

resource "aws_lb_target_group" "main" {
  name     = "${var.project_name}-tg"
  port     = 5000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/"
    matcher             = "200"
    port                = "traffic-port"
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
# LAUNCH TEMPLATE
# ---------------------------------------------------------

resource "aws_launch_template" "main" {
  name_prefix   = "${var.project_name}-lt-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  iam_instance_profile {
    name = data.aws_iam_instance_profile.lab_profile.name
  }

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.web.id]
  }

  user_data = base64encode(<<-EOF
              #!/bin/bash
              # 1. Logging Setup for debugging 
              exec > >(tee /var/log/user-data.log) 2>&1
              echo "Starting fully automatic deployment..."

              # 2. Install System Tools and Node.js [cite: 12, 13]
              apt-get update -y
              apt-get install -y git curl postgresql-client
              curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
              apt-get install -y nodejs

              # 3. Setup PM2 for process management [cite: 14]
              npm install -g pm2
              export PM2_HOME=/etc/.pm2

              # 4. Clone your specific 'new_cloud' branch [cite: 14]
              cd /home/ubuntu
              git clone -b new_cloud https://github.com/nacosking/CloudComputing.git app
              cd app/Reserve-Menu

              # 5. Install standard and specific packages (S3 & QR Code)
              echo "Installing dependencies..."
              npm install
              npm install @aws-sdk/client-s3 qrcode

              # 6. Set Environment Variables (Automatic injection) [cite: 16]
              # These are pulled directly from your Terraform resources
              export DATABASE_URL="postgres://${var.db_username}:${var.db_password}@${aws_db_instance.main.address}:5432/${var.db_name}?sslmode=require"
              export S3_BUCKET_NAME="${aws_s3_bucket.app_storage.id}"
              export AWS_REGION="${var.aws_region}"
              export PORT=5000
              export NODE_ENV=production

              # 7. Build and Start the Application [cite: 15, 17]
              echo "Building and starting application..."
              npm run build
              pm2 start dist/index.cjs --name "reserve-menu" --update-env
              
              # 8. Ensure auto-restart on server reboot [cite: 18]
              pm2 save
              pm2 startup systemd -u root --hp /etc/.pm2

              echo "Automatic deployment complete."
              EOF
  )
  update_default_version = true

  tags = {
    Name = "${var.project_name}-launch-template"
  }
}

# ---------------------------------------------------------
# AUTO SCALING GROUP
# ---------------------------------------------------------

resource "aws_autoscaling_group" "main" {
  name                = "${var.project_name}-asg"
  vpc_zone_identifier = aws_subnet.private[*].id  # ✅ Private Subnets
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
# AUTO SCALING POLICIES
# ---------------------------------------------------------

resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.project_name}-scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${var.project_name}-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}