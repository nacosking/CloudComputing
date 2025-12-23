# ---------------------------------------------------------
# VPC & SUBNET DEFINITIONS (Mandatory: Resilience & Networking)
# ---------------------------------------------------------

# Create VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Create Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# Create Public Subnets in 2 Availability Zones
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true # Allows public IP assignment (for Load Balancer)

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}"
    Type = "Public"
  }
}

# Create Private Subnets (for App Servers and Database)
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  # Offset index by 2 (e.g., 10.0.2.0/24, 10.0.3.0/24)
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 2) 
  availability_zone = data.aws_availability_zones.available.names[count.index] # Multi-AZ deployment

  tags = {
    Name = "${var.project_name}-private-subnet-${count.index + 1}"
    Type = "Private"
  }
}

# ---------------------------------------------------------
# ROUTING AND NAT GATEWAY (High Mark Feature)
# ---------------------------------------------------------

# 1. Create Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc" 

  tags = {
    Name = "${var.project_name}-nat-eip"
  }
}

# 2. Create NAT Gateway (Placed in the first Public Subnet)
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${var.project_name}-nat-gw"
  }
}

# 3. Route Table for Public Subnets (Routes to Internet Gateway)
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

# 4. Associate Public Subnets with Public Route Table
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# 5. Route Table for Private Subnets (Routes out via NAT Gateway)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
}

# 6. Associate Private Subnets with Private Route Table
resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ---------------------------------------------------------
# REMOVED DUPLICATE DB SUBNET GROUP
# (This is now correctly located in database.tf)
# ---------------------------------------------------------