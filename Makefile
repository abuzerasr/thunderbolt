.PHONY: help install build build-desktop build-android build-ios clean lint format format-check type-check test check

# Default target
help:
	@echo "Available commands:"
	@echo "  make install        - Install frontend dependencies"
	@echo "  make build          - Build frontend for production"
	@echo "  make build-desktop  - Build Tauri desktop app"
	@echo "  make build-android  - Build Tauri Android app"
	@echo "  make build-ios      - Build Tauri iOS app"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make lint           - Run linter on source files"
	@echo "  make format         - Format source files"
	@echo "  make format-check   - Check if source files are formatted"
	@echo "  make type-check     - Run TypeScript type checking"
	@echo "  make test           - Run tests"
	@echo "  make check          - Run all checks (type-check, lint, format-check)"

# Install dependencies
install:
	bun install

# Build frontend
build:
	bun run build

# Build desktop app
build-desktop:
	bun install
	bun tauri build

# Build desktop app with specific target
build-desktop-target:
	bun install
	bun tauri build --target $(TARGET)

# Build desktop app with bundles and target
build-desktop-full:
	bun install
	bun tauri build --bundles $(BUNDLES) --target $(TARGET)

# Build Android app
build-android:
	bun install
	bun tauri android build

# Build iOS app
build-ios:
	bun install
	bun tauri ios build --export-method app-store-connect

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf src-tauri/target/
	rm -rf node_modules/

# Linting
lint:
	bun run lint

lint-fix:
	bun run lint:fix

# Formatting
format:
	bun run format

format-check:
	bun run format-check

# Type checking
type-check:
	bun run type-check

# Run tests
test:
	bun run test

# Run all checks
check:
	bun run check