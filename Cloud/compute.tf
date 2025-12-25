# ---------------------------------------------------------
# COMPUTE: ALB, LAUNCH TEMPLATE, ASG
# ---------------------------------------------------------

# --- FIXED: Added Data Source Here to Fix "Undeclared Resource" Error ---
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

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

  # Now this will work because the data source is defined above
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
              # 1. Logging Setup (Crucial for debugging)
              exec > >(tee /var/log/user-data.log) 2>&1
              echo "Starting deployment..."

              # 2. System Update & Tools
              apt-get update -y
              apt-get install -y git curl postgresql-client

              # 3. Install Node.js (Version 20 LTS)
              curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
              apt-get install -y nodejs

              # 4. Install PM2 & Configure Global Path
              npm install -g pm2
              export PM2_HOME=/etc/.pm2

              # 5. Clone Repository
              cd /home/ubuntu
              git clone -b master https://github.com/nacosking/CloudComputing.git app

              # 6. Install & Build Application
              cd app/Reserve-Menu
              echo "Installing dependencies..."
              npm install
              npm install @aws-sdk/client-s3 qrcode # Ensure these are installed
              
              echo "Building application..."
              npm run build

              # 7. Configure Environment Variables
              # Added the S3_BUCKET_NAME and AWS_REGION you mentioned earlier
              export DATABASE_URL="postgresql://dbadmin:SecurePass%232025%21@cloud-project-db.cjw1tqy2i0kb.us-east-1.rds.amazonaws.com:5432/appdb?sslmode=require"
              export S3_BUCKET_NAME="cloud-project-app-storage-135739449447"
              export AWS_REGION="us-east-1"
              export PORT=5000
              export NODE_ENV=production

              # 8. Start Application with PM2
              echo "Starting server..."
              # Added --update-env to ensure PM2 locks in the export variables
              pm2 start dist/index.cjs --name "reserve-menu" --update-env
              
              # 9. Save Process List & Generate Startup Script
              # This specific command handles the systemd setup automatically
              pm2 save
              env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

              echo "Deployment complete."
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