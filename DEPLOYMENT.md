# Deployment Guide for OrderFlowMgmt

This guide includes two deployment targets:

1. Google Cloud Run (recommended)
2. PythonAnywhere (existing legacy support)

## Prerequisites

- Git repository checked out (e.g. `D:\Dhiraj\OrderFlowMgmt`)
- Python 3.11+
- Node.js + npm (for frontend build)
- Docker (for local container builds)
- `gcloud` SDK installed and authenticated (for GCP)
- Optional: PythonAnywhere account and web app setup

---

## 0. Prepare source code

1. Backend dependencies:
   - `cd backend`
   - `python -m venv .venv`
   - `source .venv/bin/activate` (Linux/macOS) or `.venv\Scripts\Activate.ps1` (Windows PowerShell)
   - `pip install -r requirements.txt`

2. Frontend dependencies:
   - `cd frontend`
   - `npm install`
   - `npm run build`

3. Root environment variables (for local run):
   - create `backend/.env` from `backend/.env.example`
   - set `DATABASE_URL`, `JWT_SECRET`, `OTP_API_KEY`

4. Verify locally:
   - Run backend: `cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
   - Run frontend: `cd frontend && npm start`

---

## 1. Add Dockerfile (if not present)

In project root, create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc default-libmysqlclient-dev && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY . /app

ENV PYTHONPATH=/app/backend
ENV PORT=8080

EXPOSE 8080

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

## 2. Deploy to Google Cloud Run

### 2.1 Set project + region:

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region YOUR_REGION
```

### 2.2 Build the container image:

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/orderflowmgmt
```

### 2.3 Create or configure Cloud SQL (MySQL):

```bash
gcloud sql instances create orderflow-db --database-version=MYSQL_8_0 --tier=db-f1-micro --region=YOUR_REGION
gcloud sql users set-password root --instance=orderflow-db --password=YOUR_PWD
gcloud sql databases create orderflow_db --instance=orderflow-db
```

### 2.4 Deploy Cloud Run:

```bash
gcloud run deploy orderflowmgmt \
  --image gcr.io/YOUR_PROJECT_ID/orderflowmgmt \
  --platform managed \
  --region YOUR_REGION \
  --allow-unauthenticated \
  --add-cloudsql-instances YOUR_PROJECT_ID:YOUR_REGION:orderflow-db \
  --set-env-vars \
      DATABASE_URL="mysql+pymysql://root:YOUR_PWD@/orderflow_db?unix_socket=/cloudsql/YOUR_PROJECT_ID:YOUR_REGION:orderflow-db", \
      JWT_SECRET="a_strong_secret", \
      OTP_API_KEY="your_otp_api_key", \
      CLOUD_SQL_CONNECTION_NAME="YOUR_PROJECT_ID:YOUR_REGION:orderflow-db"
```

> Note: If using `CLOUDSQL_PROXY` style, set `DATABASE_URL` accordingly.

### 2.5 Verify deployed service

- `gcloud run services describe orderflowmgmt --platform managed --region YOUR_REGION`
- Open service URL in browser.

---

## 3. Optional: enable frontend static hosting (if needed)

For small apps, you can host React build with Cloud Storage + Cloud CDN and point to Cloud Run API.

## 4. PythonAnywhere steps (legacy)

1. Copy `pythonanywhere_wsgi.py` to the account WSGI file.
2. Ensure your web app points to backend package path.
3. Set env vars in PythonAnywhere web dashboard:
   - `DATABASE_URL`, `JWT_SECRET`, `OTP_API_KEY`
4. Ensure dependencies installed in PythonAnywhere virtualenv:
   - `pip install -r /home/<username>/OrderFlowMgmt/backend/requirements.txt`
5. Reload and test.

---

## 5. Optional: GitHub Actions CI/CD

Add `.github/workflows/deploy.yaml` with steps:
- checkout
- setup node
- build frontend (`npm run build`)
- setup python
- build docker
- gcloud login via service account
- deploy to cloud run

---

## 6. Troubleshooting

- `500` in cloud run: inspect Logs in Cloud Console
- `database connection` errors: check SQL instance connectivity and service account permission, correct `DATABASE_URL` string
- `CORS` or API 404: verify frontend uses `/api` prefix and can reach Cloud Run service

---

## 7. Post-deploy checks

- Create order flow request + status transitions
- Billing, dispatch, collection notifications
- Confirm `order_notifications` table entries
- Confirm `collected_at` and `payment_due_date`

---

## 8. Quick rollback

If rollback is needed:

```bash
gcloud run services update orderflowmgmt --image gcr.io/YOUR_PROJECT_ID/orderflowmgmt@sha256:<previous>
```

---

## 9. Heroku / Other alternative

For Heroku, set `Procfile`:

```
web: uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

Set config vars and deploy via git.
