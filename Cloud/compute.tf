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
locals {
  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y httpd
              systemctl start httpd
              systemctl enable httpd
              
              # Creates a simple web page for verification
              cat > /var/www/html/index.html <<'HTML'
              <!DOCTYPE html>
              <html>
              <head>
                  <title>Cloud Computing Project</title>
                  <style>
                      body {
                          font-family: Arial, sans-serif;
                          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                          color: white;
                          display: flex;
                          justify-content: center;
                          align-items: center;
                          height: 100vh;
                          margin: 0;
                      }
                      .container {
                          text-align: center;
                          background: rgba(255,255,255,0.1);
                          padding: 40px;
                          border-radius: 10px;
                          backdrop-filter: blur(10px);
                      }
                  </style>
              </head>
              <body>
                  <div class="container">
                      <h1>🚀 Cloud Computing Project</h1>
                      <p>Instance ID: $(ec2-metadata --instance-id | cut -d ' ' -f 2)</p>
                      <p>Availability Zone: $(ec2-metadata --availability-zone | cut -d ' ' -f 2)</p>
                      <p>Deployed with Terraform</p>
                  </div>
              </body>
              </html>
              HTML
              
              # Install CloudWatch agent (Optional, but recommended for advanced monitoring)
              wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
              rpm -U ./amazon-cloudwatch-agent.rpm
              EOF
}

# Launch Template (Blueprint for the EC2 instances)
resource "aws_launch_template" "main" {
  name_prefix            = "${var.project_name}-lt-"
  image_id               = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name # Attaches S3/CloudWatch permissions
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