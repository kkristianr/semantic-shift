# Semantic shifts

A tool for analyzing and visualizing semantic shifts in language over time/space using word embeddings.

## Quick Start

### Backend
```bash
cd backend
curl -LsSf https://astral.sh/uv/install.sh | sh 
./setup-uv.sh                                     
uv run uvicorn main:app --reload                  
```

### Frontend
```bash
cd frontend
pnpm install
pnpm dev
```

## Development

Use the provided scripts for easy development:
- `./scripts/dev.sh` - Start both services
