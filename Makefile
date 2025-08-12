# Load environment variables from .env file
include .env
export

# Development
dev:
	docker compose up --build

dev-logs:
	docker compose logs -f

# Database operations
db-reset:
	docker compose down mysql
	docker volume rm socialmediabias_mysql_data || true
	docker compose up mysql -d
	@echo "Waiting for MySQL to be ready..."
	@until docker exec mysql mysqladmin ping -h localhost -u root -p$(MYSQL_ROOT_PASSWORD) --silent; do sleep 2; done
	@echo "MySQL is ready!"

db-fetch-mbfc:
	docker exec backend npm run fetch-mbfc

db-load-mbfc:
	docker exec backend npm run migration:run
	docker exec backend npm run seed

db-setup: db-reset
	@echo "Starting backend..."
	docker compose up backend -d
	@echo "Waiting for backend to be ready..."
	@until curl -s http://localhost:9006 > /dev/null; do sleep 2; done
	@echo "Running migrations..."
	docker exec backend npm run migration:run
	@echo "Seeding MBFC data..."
	docker exec backend npm run seed

db-update: db-fetch-mbfc db-load-mbfc

# Automated full setup
setup:
	@echo "Setting up complete environment..."
	docker compose up -d
	@echo "Waiting for services to be ready..."
	@until docker exec mysql mysqladmin ping -h localhost -u root -p$(MYSQL_ROOT_PASSWORD) --silent; do sleep 2; done
	@until curl -s http://localhost:9006 > /dev/null; do sleep 2; done
	@echo "Running migrations and seeding..."
	docker exec backend npm run migration:run
	docker exec backend npm run seed
	@echo "Setup complete! Frontend: http://localhost:9005"

db-export:
	docker exec mysql mysqldump -u root -p$(MYSQL_ROOT_PASSWORD) $(MYSQL_DATABASE) > backup.sql

db-import:
	docker exec -i mysql mysql -u root -p$(MYSQL_ROOT_PASSWORD) $(MYSQL_DATABASE) < backup.sql

# Deployment
deploy-local:
	docker compose up -d --build

deploy-production:
	ssh user@server "cd /path/to/project && docker compose up -d --build"

# NGINX
nginx-test:
	sudo nginx -t

nginx-reload:
	sudo systemctl reload nginx

# Cleanup
clean:
	docker compose down -v
	docker system prune -f

# Health checks
health:
	@echo "Checking services..."
	@curl -s http://localhost:9005 > /dev/null && echo "Frontend: OK" || echo "Frontend: FAILED"
	@curl -s http://localhost:9006 > /dev/null && echo "Backend: OK" || echo "Backend: FAILED"
	@docker exec mysql mysqladmin ping -h localhost -u root -p$(MYSQL_ROOT_PASSWORD) > /dev/null && echo "MySQL: OK" || echo "MySQL: FAILED"

# Help
help:
	@echo "Available commands:"
	@echo "  dev          - Start development environment"
	@echo "  dev-logs     - Show development logs"
	@echo "  db-reset     - Reset database"
	@echo "  db-fetch-mbfc - Fetch fresh MBFC data from API"
	@echo "  db-load-mbfc - Load MBFC data into database"
	@echo "  db-setup     - Reset and load MBFC data"
	@echo "  db-update    - Fetch fresh data and reload database"
	@echo "  db-export    - Export database to backup.sql"
	@echo "  db-import    - Import database from backup.sql"
	@echo "  deploy-local - Deploy locally"
	@echo "  nginx-test   - Test NGINX configuration"
	@echo "  nginx-reload - Reload NGINX"
	@echo "  clean        - Clean up containers and images"
	@echo "  health       - Check service health"
	@echo "  help         - Show this help"
