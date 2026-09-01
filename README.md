HEAD
# 🌾 Mitti2Market — Direct Agri Marketplace

> **SIH 26033:** "Multiple intermediaries reduce farmers' earnings and increase consumer prices."

Mitti2Market is a direct agricultural marketplace connecting **Farmers / FPOs** with **Businesses / Bulk Buyers** — eliminating middlemen and ensuring fair trade.

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React.js, Vite, Tailwind CSS, Lucide Icons, Recharts |
| Backend  | Java 17, Spring Boot 3.3, Spring Data JPA, H2 / PostgreSQL |
| Build    | Maven (multi-module)                |

---

## Project Structure

```
mitti2market/
├── pom.xml                     ← Parent POM
├── frontend/                   ← React + Vite SPA
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── data/mockData.js
│       ├── App.jsx
│       └── index.css
├── backend/                    ← Spring Boot API
│   ├── pom.xml
│   └── src/main/java/com/mitti2market/
│       ├──Mitti2MarketApplication.java
│       ├── controller/
│       ├── service/
│       ├── model/
│       └── config/
└── README.md
```

---

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev          # → http://localhost:5173
```

### Backend

```bash
cd backend
mvn spring-boot:run   # → http://localhost:8080
```

---

## API Endpoints (Backend)

| Method | Endpoint                     | Description              |
|--------|------------------------------|--------------------------|
| GET    | `/api/health`                | Health check             |
| GET    | `/api/produce`               | List all produce         |
| POST   | `/api/produce`               | Create new produce       |
| PUT    | `/api/produce/{id}`          | Update produce           |
| DELETE | `/api/produce/{id}`          | Delete produce           |
| GET    | `/api/orders`                | List all orders          |
| POST   | `/api/orders`                | Create order             |
| PATCH  | `/api/orders/{id}/status`    | Update order status      |

---

## User Journeys

### 👨‍🌾 Farmer Flow
```
Landing → Login → Dashboard → Add Produce
       → AI Price Advisor → Buyer Requests → Orders → Logistics
```

### 🏪 Business Flow
```
Landing → Login → Dashboard → Browse Produce
       → Product Details → Bulk Order → Orders → Logistics
```

---

## License

Built for **Smart India Hackathon (SIH) 26033**.

# M2M-Mitti-to-Market

