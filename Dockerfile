# MAD DEV - Production Dockerfile for AWS Deployment (ECS / App Runner / EC2)
FROM nginx:alpine

# Copy all static web app files to Nginx web root
COPY . /usr/share/nginx/html

# Expose HTTP port 80
EXPOSE 80

# Start Nginx web server
CMD ["nginx", "-g", "daemon off;"]
