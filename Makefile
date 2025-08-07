# Development
dev:
	docker-compose up --build

dev-logs:
	docker-compose logs -f

# Database operations
db-reset:
	docker-compose down -v
	docker-compose up mysql -d
	sleep 10
	docker exec mysql mysql -u root -p$(MYSQL_ROOT_PASSWORD) -e "DROP DATABASE IF EXISTS mbfc; CREATE DATABASE mbfc;"

db-load-mbfc:
	docker exec backend npm run load-mbfc

db-setup: db-reset db-load-mbfc

db-export:
	docker exec mysql mysqldump -u root -p$(MYSQL_ROOT_PASSWORD) $(MYSQL_DATABASE) > backup.sql

db-import:
	docker exec -i mysql mysql -u root -p$(MYSQL_ROOT_PASSWORD) $(MYSQL_DATABASE) < backup.sql

# Deployment
deploy-local:
	docker-compose up -d --build

deploy-production:
	ssh user@server "cd /path/to/project && docker-compose up -d --build"

# NGINX
nginx-test:
	sudo nginx -t

nginx-reload:
	sudo systemctl reload nginx

# Cleanup
clean:
	docker-compose down -v
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
	@echo "  db-load-mbfc - Load MBFC data into database"
	@echo "  db-setup     - Reset and load MBFC data"
	@echo "  db-export    - Export database to backup.sql"
	@echo "  db-import    - Import database from backup.sql"
	@echo "  deploy-local - Deploy locally"
	@echo "  nginx-test   - Test NGINX configuration"
	@echo "  nginx-reload - Reload NGINX"
	@echo "  clean        - Clean up containers and images"
	@echo "  health       - Check service health"
	@echo "  help         - Show this help"
