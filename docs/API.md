# API Documentation

Imbriani Stefano Noleggio Backend API v8.9

## Base URL
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

## Authentication
All protected endpoints require `token` parameter:
```
?token=imbriani_secret_2025
```

## Endpoints

### Health Check
```
GET /?action=health
```

### Get Veicoli
```
GET /?action=getVeicoli&token=TOKEN
```

### Get Prenotazioni
```
GET /?action=getPrenotazioni&token=TOKEN
```

See backend/README.md for complete documentation.
