# OrderFlow Management — Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI (Python) |
| **Database** | MySQL via SQLAlchemy ORM (pymysql driver) |
| **Authentication** | JWT (PyJWT) + bcrypt password hashing + OTP |
| **Frontend** | React 18.2 + React Router 6 |
| **UI Library** | Material-UI (MUI) 7.3 with Emotion |
| **HTTP Client** | Axios |
| **State Management** | React Context API (AuthContext) |

---

## System Overview

```
┌─────────────────────────────────┐
│         React Frontend          │
│   (localhost:3000)              │
│                                 │
│  AuthContext ─► Axios ──────────┼──► API Calls (JWT Bearer)
│  React Router v6                │
│  Material-UI Components         │
└────────────────┬────────────────┘
                 │ proxy
┌────────────────▼────────────────┐
│         FastAPI Backend         │
│   (localhost:8000)              │
│                                 │
│  /api/token      (Auth)         │
│  /api/orders     (Orders)       │
│  /api/customers  (Customers)    │
│  /api/skus       (SKUs)         │
│  /api/users      (Users)        │
│                                 │
│  JWT Auth ─► SQLAlchemy ORM     │
└────────────────┬────────────────┘
                 │
┌────────────────▼────────────────┐
│           MySQL                 │
│   (orderflow_db)                │
│                                 │
│  users, user_contacts,          │
│  user_addresses, customers,     │
│  orders, order_line_items, skus │
└─────────────────────────────────┘
```

---

## Database Schema

### Users

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | Auto-increment |
| first_name, last_name | String | |
| email | String | Unique |
| mobile | String | Unique |
| hashed_password | String | bcrypt |
| role | Enum | MANAGER, SALES_REP, BILLING_EXEC, DISPATCH_AGENT, COLLECTION_EXEC |
| is_active | Boolean | |
| created_at, updated_at | DateTime | |

**Related tables:** `user_contacts` (contact_type, contact_value, is_primary), `user_addresses` (address fields, is_primary)

### Customers

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| customer_code | String | Unique |
| name, contact_person | String | |
| phone_primary, phone_secondary | String | |
| email_primary, email_secondary | String | |
| preferred_communication | Enum | phone, email, whatsapp |
| billing_address_* | String | line1, line2, city, state, pincode |
| shipping_address_* | String | line1, line2, city, state, pincode |
| category | Enum | PLATINUM, GOLD, SILVER, BRONZE |
| net_payment_terms | Integer | Days |
| credit_limit | Decimal | |
| gst_number, pan_number | String | |
| assigned_sales_rep_id | FK → users | |
| status | Enum | ACTIVE, INACTIVE, BLOCKED |
| notes | Text | |
| created_by_id | FK → users | |

### Orders

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| order_number | String | Unique (ORD-YYYYMMDD-xxxxxx) |
| customer_id | FK → customers | |
| status | Enum | See workflow below |
| priority | Enum | LOW, MEDIUM, HIGH, URGENT |
| order_date | DateTime | |
| internal_notes | Text | |
| billed_at, billed_by_id | DateTime, FK | |
| billing_notes | Text | |
| dispatched_at, dispatched_by_id | DateTime, FK | |
| dispatch_notes | Text | |
| closed_at, actual_delivery_date | DateTime | |
| payment_due_date | DateTime | |
| collected_at, collected_by_id | DateTime, FK | |
| created_by_id, assigned_to_id | FK → users | |
| parent_order_id | FK → orders | Self-ref for split orders |
| split_notes | Text | Notes when order was split |

### Order Line Items

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| order_id | FK → orders | Cascade delete |
| sku_id | FK → skus | Optional |
| sku_code, sku_name | String | Snapshot at order time |
| quantity, billed_quantity | Decimal | Billing exec can adjust |
| unit | Enum | pcs, kg, ltr, mtr, etc. |
| unit_price | Decimal | |
| gst_rate | Decimal | Default 18% |
| tax_amount, discount_amount | Decimal | |
| line_total | Decimal | |

### SKUs

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| sku_code | String | Unique |
| name, description, category | String | |
| unit | String | Default: pcs |
| hsn_code | String | |
| gst_rate | Decimal | Default 18% |
| base_price | Decimal | |
| status | Enum | ACTIVE, INACTIVE, DISCONTINUED |

---

## Order Workflow

```
PENDING_BILLING
       │
       ▼  (Billing Exec confirms billing)
    BILLED ──────────────┐
       │                 │ Split Order
       ▼                 ▼
TO_BE_DISPATCHED ──► New PENDING_BILLING order
       │                 (remainder quantities)
       ▼  (Dispatch Agent ships)
  DISPATCHED
       │
       ▼  (Delivery confirmed)
    CLOSED  ← payment_due_date tracked
       │
       ▼  (Payment collected)
   COLLECTED  ← final state

  CANCELLED  ← can occur from any state
```

### Role-to-Queue Mapping

| Role | Queue Page | Actions |
|------|-----------|---------|
| Billing Exec | Billing Queue | Confirm billing, adjust line item quantities |
| Dispatch Agent | Dispatch Queue | Ship order, confirm delivery |
| Collection Exec | Collection Queue | Record payment collection |
| Manager | All queues | Full oversight |
| Sales Rep | Create Order | Create orders, manage customers |
### Order Splitting

When stock is insufficient after billing, orders can be split:
1. Available from **Billed** or **To Be Dispatched** status
2. User sets **Ship Now** quantity per line item (must be < original)
3. Original order keeps the ship-now quantities
4. A new **child order** is created with remainder quantities (status: PENDING_BILLING)
5. Orders are linked via `parent_order_id` — visible as clickable chips in the UI
6. Accessible to: Billing Exec, Dispatch Agent, Manager
---

## API Endpoints

### Auth (`/api`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/token` | Login (email + password → JWT) |
| POST | `/send-otp` | Send OTP to mobile |
| POST | `/verify-otp` | Verify OTP |

### Orders (`/api/orders`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create order |
| GET | `/` | List orders (filter: status, search) |
| GET | `/{orderId}` | Get order detail |
| PUT | `/{orderId}` | Update order |
| DELETE | `/{orderId}` | Delete order |
| POST | `/{orderId}/confirm-billing` | Transition → BILLED |
| POST | `/{orderId}/dispatch` | Transition → DISPATCHED |
| POST | `/{orderId}/close` | Transition → CLOSED |
| POST | `/{orderId}/collect` | Transition → COLLECTED |
| POST | `/{orderId}/split` | Split order (ship partial, backorder remainder) |

### Customers (`/api/customers`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create customer (manager only) |
| GET | `/` | List customers (filter: category, status, search) |
| GET | `/autocomplete` | Customer name autocomplete |
| GET | `/{customerId}` | Get customer detail |
| PUT | `/{customerId}` | Update customer |
| DELETE | `/{customerId}` | Delete customer |

### SKUs (`/api/skus`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create SKU |
| GET | `/` | List SKUs (filter: category, status, search) |
| GET | `/autocomplete` | SKU autocomplete |
| GET | `/{skuId}` | Get SKU detail |
| PUT | `/{skuId}` | Update SKU |
| DELETE | `/{skuId}` | Delete SKU |

### Users (`/api/users`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Current authenticated user |
| GET | `/` | List all users |
| POST | `/` | Create user (manager only) |
| GET | `/dashboard-stats` | Aggregated dashboard statistics |
| PUT | `/{userId}` | Update user |

---

## Authentication Flow

1. User submits email + password → `POST /api/token`
2. Backend validates against bcrypt-hashed password
3. JWT generated: `{ "sub": email, "role": role }`  (HS256)
4. Token stored in `localStorage` by frontend
5. All API calls include `Authorization: Bearer {token}`
6. Backend extracts user via `OAuth2PasswordBearer` dependency
7. OTP flow available as alternative (external API integration)

---

## Frontend Architecture

### Routing

```
/login                 → LoginPage (public)
/                      → DashboardPage
/orders                → OrdersPage
/orders/:orderId       → OrderDetailPage
/create-order          → CreateOrderPage
/customers             → CustomersPage
/customers/:customerId → CustomerDetailPage
/create-customer       → CreateCustomerPage
/skus                  → SKUCatalogPage
/billing-queue         → BillingQueuePage
/dispatch-queue        → DispatchQueuePage
/collection-queue      → CollectionQueuePage
/users                 → UsersPage
/create-user           → CreateUserPage
```

All routes except `/login` are wrapped in `<ProtectedRoute>`.

Role-based route access is enforced via `allowedRoles`:

| Route | Allowed Roles |
|-------|---------------|
| `/create-order` | Manager, Sales Rep |
| `/customers`, `/customers/:id` | Manager, Sales Rep |
| `/create-customer` | Manager |
| `/skus` | Manager, Sales Rep, Billing Exec |
| `/billing-queue` | Manager, Billing Exec |
| `/dispatch-queue` | Manager, Dispatch Agent |
| `/collection-queue` | Manager, Collection Exec |
| `/users`, `/create-user` | Manager |
| `/`, `/orders`, `/orders/:id` | All authenticated |

### Component Hierarchy

```
App
├── AuthProvider (Context)
└── Router
    ├── LoginPage
    └── ProtectedRoute
        └── AppLayout
            ├── AppBar (header + user menu)
            ├── Drawer (sidebar, role-filtered nav)
            └── <Outlet> (page content)
                ├── DashboardPage
                ├── OrdersPage / OrderDetailPage / CreateOrderPage
                ├── CustomersPage / CustomerDetailPage / CreateCustomerPage
                ├── SKUCatalogPage
                ├── BillingQueuePage / DispatchQueuePage / CollectionQueuePage
                └── UsersPage / CreateUserPage
```

### Role-Based Navigation Visibility

| Nav Item | Visible To |
|----------|-----------|
| Dashboard | All |
| Create Order | Manager, Sales Rep |
| Orders | All (read-only for non-manager/sales_rep) |
| Billing Queue | Manager, Billing Exec |
| Dispatch Queue | Manager, Dispatch Agent |
| Collection Queue | Manager, Collection Exec |
| Customers | Manager, Sales Rep |
| SKU Catalog | Manager, Sales Rep, Billing Exec (read-only for Billing Exec) |
| Users | Manager |

---

## Backend File Structure

```
backend/app/
├── main.py              # FastAPI app, CORS, router mounting
├── database.py          # SQLAlchemy engine, session, Base
├── auth.py              # JWT creation/validation, password hashing, OAuth2
├── models.py            # User SQLAlchemy models (User, UserContact, UserAddress)
├── routers.py           # Auth endpoints (/token, /send-otp, /verify-otp)
├── user_detail_models.py # Pydantic schemas for users
├── user_routers.py      # User CRUD + dashboard-stats
├── customer_models.py   # Customer SQLAlchemy model + Pydantic schemas
├── customer_routers.py  # Customer CRUD + autocomplete
├── order_models.py      # Order + OrderLineItem models + Pydantic schemas
├── order_routers.py     # Order CRUD + workflow transitions
├── sku_models.py        # SKU model + Pydantic schemas
├── sku_routers.py       # SKU CRUD + autocomplete
└── otp_service.py       # OTP send/verify (external API + in-memory store)
```

## Frontend File Structure

```
frontend/src/
├── index.js                    # React entry point
├── App.js                      # Router + theme + AuthProvider
├── context/
│   └── AuthContext.js          # Global auth state, login/logout, JWT handling
├── components/
│   ├── AppLayout.js            # Sidebar + AppBar + role-based nav
│   ├── ProtectedRoute.js       # Auth guard HOC
│   └── Logo.js                 # App logo component
└── pages/
    ├── LoginPage.js            # Email/password login form
    ├── DashboardPage.js        # Stats cards + recent orders
    ├── HomePage.js             # Landing/home
    ├── CreateOrderPage.js      # Order form with line items
    ├── OrdersPage.js           # Order list with filters
    ├── OrderDetailPage.js      # Order view/edit + workflow actions
    ├── CreateCustomerPage.js   # Customer creation form
    ├── CustomersPage.js        # Customer list with filters
    ├── CustomerDetailPage.js   # Customer view/edit + order history
    ├── SKUCatalogPage.js       # SKU list + inline add/edit
    ├── BillingQueuePage.js     # Pending billing orders
    ├── DispatchQueuePage.js    # Dispatch + delivery confirmation
    ├── CollectionQueuePage.js  # Payment collection tracking
    ├── UsersPage.js            # User list
    └── CreateUserPage.js       # User creation form
```

---

## Key Architectural Patterns

**Backend:**
- Modular routers (one per domain entity)
- FastAPI dependency injection for auth + DB sessions
- Stateless JWT authentication (no server-side sessions)
- Enum-based status/role constraints at DB level
- SQLAlchemy relationships with cascade deletes

**Frontend:**
- Context API for global auth state (no Redux)
- Protected route wrapper for auth guards
- Controlled form components with local state
- Debounced autocomplete for customer/SKU selection (300ms)
- Snackbar-based error/success notifications

**Database:**
- Foreign key relationships: Orders → Customers, Orders → Users, LineItems → Orders/SKUs
- Unique constraints on: customer_code, sku_code, order_number, email, mobile
- Enum columns for type safety (roles, statuses, priorities, categories)

---

## Environment Configuration

**Backend (.env):**
```
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/orderflow_db
JWT_SECRET=<secret_key>
OTP_API_KEY=<otp_service_key>
OTP_API_URL=<otp_service_url>
```

**Frontend:**
- API proxy configured in `package.json`: `"proxy": "http://localhost:8000"`

---

## Current Status

### Implemented
- FastAPI backend with full CRUD for orders, customers, SKUs, users
- MySQL database with SQLAlchemy ORM
- JWT + OTP authentication
- Multi-role user system (5 roles)
- Complete order lifecycle with workflow transitions
- **Order splitting** (partial shipment with backorder tracking)
- React frontend with Material-UI
- Role-based navigation and queue pages
- **Full RBAC enforcement** (frontend route guards + backend role checks)
- Dashboard with aggregated statistics

### Planned / Not Yet Implemented
- Payment gateway integration (Stripe, Razorpay, PayPal)
- Accounting system integration (QuickBooks, Zoho Books, Tally)
- SMS/Email/Push notifications
- Swagger/OpenAPI documentation
- Audit logging
- Dockerization
- CI/CD pipeline
- Azure deployment
- React Native mobile app
