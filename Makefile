# Load environment variables from .env file
include .env
export

# Development
dev:
	docker compose up --build

dev-logs:
	docker compose logs -f

## Database operations (no backend – Next.js handles APIs)
db-reset:
	docker compose down mysql
	docker volume rm socialmediabias_mysql_data || true
	docker compose up mysql -d
	@echo "Waiting for MySQL to be ready..."
	@until docker exec mysql mysqladmin ping -h localhost -u root -p$(MYSQL_ROOT_PASSWORD) --silent; do sleep 2; done
	@echo "MySQL is ready!"

# Initialize schema from database/init.sql
db-init:
	@echo "Applying schema from database/init.sql..."
	docker exec -i mysql mysql -u root -p$(MYSQL_ROOT_PASSWORD) < database/init.sql
	@echo "Schema applied."

# Ingest MBFC JSON using the importer script inside the frontend container
db-ingest-mbfc:
	@echo "Ensuring frontend is running..."
	docker compose up -d frontend
	@echo "Running importer..."
	docker exec -it frontend sh -lc 'node scripts/ingest-mbfc.mjs /app/database/mbfc-current.json'
	@echo "Verifying row count..."
	docker exec -it mysql mysql -u root -p$(MYSQL_ROOT_PASSWORD) -e "SELECT COUNT(*) AS count FROM mbfc.mbfc_sources;"

# Convenience: init schema + ingest in one go
db-seed:
	$(MAKE) db-init
	$(MAKE) db-ingest-mbfc

# Automated full setup
setup:
	@echo "Setting up environment (frontend + mysql)..."
	docker compose up -d --build
	@echo "Waiting for MySQL to be ready..."
	@until docker exec mysql mysqladmin ping -h localhost -u root -p$(MYSQL_ROOT_PASSWORD) --silent; do sleep 2; done
	$(MAKE) db-init
	@echo "Setup complete! Frontend: $(URL_LOCAL)"

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
	@docker exec mysql mysqladmin ping -h localhost -u root -p$(MYSQL_ROOT_PASSWORD) > /dev/null && echo "MySQL: OK" || echo "MySQL: FAILED"

# Open MySQL shell with .env credentials
mysql-shell:
	docker exec -it mysql mysql -u$${MYSQL_USER} -p$${MYSQL_PASSWORD} $${MYSQL_DATABASE}

# Backend reload
backend-reload:
	@echo "(No backend) – skipping."

# Help
help:
	@echo "Available commands:"
	@echo "  dev          - Start development environment"
	@echo "  dev-logs     - Show development logs"
	@echo "  db-reset     - Reset database"
	@echo "  db-init      - Apply schema from database/init.sql"
	@echo "  db-ingest-mbfc - Ingest MBFC JSON into MySQL"
	@echo "  db-export    - Export database to backup.sql"
	@echo "  db-import    - Import database from backup.sql"
	@echo "  deploy-local - Deploy locally"
	@echo "  nginx-test   - Test NGINX configuration"
	@echo "  nginx-reload - Reload NGINX"
	@echo "  clean        - Clean up containers and images"
	@echo "  health       - Check service health"
	@echo "  help         - Show this help"
