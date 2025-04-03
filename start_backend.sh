#!/bin/bash

# Avvia il Gateway
cd webapp
cd gateway
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
cd ../../

# Avvia il servizio AI Analysis
uvicorn webapp.services.aiservice.app.main:app --host 0.0.0.0 --port 8001 --reload &

# Avvia il servizio Static Analysis
uvicorn webapp.services.staticanalysis.app.main:app --host 0.0.0.0 --port 8002 --reload &

# Avvia il servizio Report
uvicorn webapp.services.report.app.main:app --host 0.0.0.0 --port 8003 --reload &

# Aspetta che i servizi partano (opzionale)
sleep 3

# Stampa i processi in esecuzione
echo "Tutti i servizi sono stati avviati!"
ps aux | grep uvicorn
