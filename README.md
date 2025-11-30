# 🚀 CSC3074 Final Project: Scalable Cloud Architecture

This repository contains the Infrastructure as Code (IaC) for our group's cloud-native application, defined entirely using **Terraform** on AWS. The architecture is deployed for high availability, auto-scaling, and security, fulfilling all mandatory project requirements.

## 📁 Project Overview & Repository Structure

| File | Purpose and Role Responsibility | Project Requirement Link |
| :--- | :--- | :--- |
| **`main.tf`, `variables.tf`** | Global configuration, tagging, and defining environment inputs. | Cost-Effectiveness, Documentation |
| **`vpc.tf`** | Creates the VPC, Multi-AZ subnets, and NAT Gateway (Networking/Resilience - **Role 1**). | **Availability**, Networking |
| **`security.tf`** | Implements the **3-Tier Security Groups** and IAM policies for secure service access (Security/Monitoring - **Role 3**). | **Security Groups**, **IAM** |
| **`compute.tf`** | Defines the **Load Balancer (ALB)**, **Auto Scaling Group (ASG)**, and the EC2 **Launch Template** (Compute/Scaling - **Role 1**). | **Load Balancing**, **Auto Scaling**, **Cloud VM(s)** |
| **`database.tf`** | Defines the **RDS Database**, Secrets Manager, and backup policies (Data Lead - **Role 2**). | **Cloud Database**, **Backup Strategies** |
| **`storage.tf`** | Defines the **S3 Buckets** (app storage and backups) and security hardening (Data Lead - **Role 2**). | **Cloud Storage** |
| **`monitoring.tf`** | Creates **CloudWatch Alarms** (linked to ASG) and the **Dashboard** (Monitoring/Ops - **Role 3**). | **Cloud Monitoring** |
| **`outputs.tf`** | Exports final URLs and endpoints for team hand-off. | Documentation |

---

## 🛠️ Setup and Execution Workflow

Our team uses the **Hybrid Workflow**: Code is written locally in VS Code, managed via Git, and executed in AWS CloudShell. This maximizes reliability and streamlines deployment.

### 1. Local Setup (Required for All Teammates)

The only required software for your local machine is for writing and managing code.

1.  **Install Git:** Download and install the latest version of Git.
2.  **Install VS Code:** Download and install the editor.
3.  **Clone Repository:** Open your terminal and clone the project:
    ```bash
    git clone [YOUR REPOSITORY URL]
    cd [YOUR PROJECT FOLDER]
    ```

### 2. Execution Environment Setup (CloudShell)

We run all Terraform commands in CloudShell because it avoids local credential issues and has Git pre-installed.

1.  **Launch CloudShell:** Start your AWS Academy Learner Lab and open the AWS CloudShell terminal.
2.  **Install Terraform:** CloudShell often lacks Terraform; run these commands to install it persistently in your home directory (securing the IaC bonus):
    ```bash
    git clone [https://github.com/tfutils/tfenv.git](https://github.com/tfutils/tfenv.git) ~/.tfenv
    mkdir -p ~/bin
    ln -s ~/.tfenv/bin/* ~/bin/
    tfenv install latest
    tfenv use latest
    ```
3.  **Clone Project in CloudShell:** Since your home directory is persistent, clone the repo here as well.
    ```bash
    git clone [YOUR REPOSITORY URL]
    cd [YOUR PROJECT FOLDER]
    ```

### 3. Final Deployment (Role 1: Cloud Infrastructure Engineer)

The Cloud Infrastructure Engineer is responsible for running these commands to bring the architecture online.

1.  **Update Variables:** Verify the values in `terraform.tfvars` (especially the `db_password` and your team's unique identifiers).
2.  **Pull Latest Code:** Always sync with GitHub before applying.
    ```bash
    git pull
    ```
3.  **Initialize Terraform:** Downloads providers and prepares the environment.
    ```bash
    terraform init
    ```
4.  **Review Plan:** (Recommended) Check the plan for any errors or unexpected resource creation.
    ```bash
    terraform plan
    ```
5.  **Deploy the Full Stack:** Type `yes` to confirm the creation of all resources. **Allow 10-15 minutes for the database to provision.**
    ```bash
    terraform apply
    ```

### 4. Verification and Hand-off

Once `terraform apply` is complete, the entire environment is ready.

1.  **Get Outputs:** Run this command to display all crucial links and endpoints.
    ```bash
    terraform output
    ```
2.  **Verify Application:** Test the **`application_url`** in a browser to confirm the Load Balancer and EC2 instance are serving the sample page.
3.  **Role 2 Hand-off:** Provide the following outputs to the Application Developer:
    * `database_endpoint`
    * `secrets_manager_secret_name`
    * `s3_bucket_name`

---

## 🗑️ Cost Control and Cleanup (CRITICAL)

To prevent exceeding the **\$20 maximum budget**, you **MUST** destroy all resources when you are finished testing.

**The Magic Eraser Command:**
```bash
terraform destroy
