module.exports = {
    apps: [{
        name: "reserve-menu",
        script: "./dist/index.cjs",
        env: {
            DATABASE_URL: "postgres://dbadmin:SecurePass#2025!@cloud-project-db.cu8gzw5dvnqx.us-east-1.rds.amazonaws.com:5432/appdb",
            S3_BUCKET_NAME: "customer-reservations-qr-759145289015",
            AWS_REGION: "us-east-1",
            PORT: "5000",
            NODE_ENV: "production"
        }
    }]
}