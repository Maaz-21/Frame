#Frontend needs nginx because browsers expect static files (HTML/CSS/JS) 
#served with proper MIME types, caching, and gzip compression—
#Node isn't optimized for this. So, we use nginx to serve the built frontend assets efficiently.
# Build stage: This stage compiles the React app using Node, producing optimized static files in the 'build' directory.
FROM node as build
WORKDIR /frontend
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

#Runtime stage: This stage uses nginx to serve the static files generated in the build stage.
FROM nginx:alpine
COPY --from=build /frontend/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]