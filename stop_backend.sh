#!/bin/bash
echo "Chiudendo tutti i servizi..."
kill $(ps aux | grep uvicorn | awk '{print $2}')
echo "Tutti i servizi sono stati chiusi."
