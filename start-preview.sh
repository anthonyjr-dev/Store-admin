#!/bin/bash
cd /var/www/html/storeadmin
exec npx vite preview --port 5175 --host 0.0.0.0
