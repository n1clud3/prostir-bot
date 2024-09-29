# syntax=docker/dockerfile:1

FROM node:20.17.0-alpine

# Use production node environment by default.
ENV NODE_ENV=production

USER node
ENV USER=container HOME=/home/container

WORKDIR /home/container

# Install npm dependencies
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copy the rest of the source files into the image.
COPY . .

# Expose the port that the application listens on.
EXPOSE 443

# Run the application.
CMD ["node", "index.js"]
